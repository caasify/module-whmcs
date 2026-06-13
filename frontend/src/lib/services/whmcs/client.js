export class WhmcsPageError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'WhmcsPageError'
    this.code = options.code ?? 'request_failed'
    this.status = options.status ?? 0
    this.url = options.url ?? ''
    this.cause = options.cause ?? null
  }
}

const LOGIN_URL_HINTS = ['/login', 'rp=/login', 'action=login', 'dologin.php']

export function createWhmcsNativeFallbackError(message, options = {}) {
  return new WhmcsPageError(message, {
    ...options,
    code: 'native_fallback',
  })
}

export function createStableWhmcsId(value) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return 'whmcs-item'
  }

  let hash = 0

  for (const character of normalized) {
    hash = ((hash << 5) - hash) + character.charCodeAt(0)
    hash |= 0
  }

  return `whmcs-${Math.abs(hash).toString(36)}`
}

export function isWhmcsNativeFallbackError(error) {
  return error?.code === 'native_fallback'
}

export function isWhmcsAuthRequiredError(error) {
  return error?.code === 'auth_required'
}

export function isWhmcsHandoffError(error) {
  return isWhmcsNativeFallbackError(error) || isWhmcsAuthRequiredError(error)
}

export function normalizeWhmcsText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getNodeText(node) {
  if (!node) {
    return ''
  }

  return normalizeWhmcsText(node.textContent ?? '')
}

export function getNodeLines(node) {
  if (!node) {
    return []
  }

  const rawValue = typeof node.innerText === 'string'
    ? node.innerText
    : node.textContent ?? ''

  return rawValue
    .split('\n')
    .map((line) => normalizeWhmcsText(line))
    .filter(Boolean)
}

export function toAbsoluteWhmcsUrl(rawUrl, baseUrl = window.location.href) {
  const normalized = String(rawUrl ?? '').trim()

  if (!normalized) {
    return ''
  }

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return ''
  }
}

export function resolveWhmcsUrl(rawUrl) {
  const normalized = String(rawUrl ?? '').trim()

  if (!normalized) {
    throw createWhmcsNativeFallbackError('The WHMCS page URL is missing.')
  }

  let resolvedUrl

  try {
    resolvedUrl = new URL(normalized, window.location.href)
  } catch (error) {
    throw createWhmcsNativeFallbackError('The WHMCS page URL is invalid.', {
      cause: error,
      url: normalized,
    })
  }

  if (resolvedUrl.origin !== window.location.origin) {
    throw createWhmcsNativeFallbackError('The WHMCS page is not available on the current origin.', {
      url: resolvedUrl.toString(),
    })
  }

  return resolvedUrl
}

export function getQueryParam(rawUrl, ...keys) {
  const normalized = String(rawUrl ?? '').trim()

  if (!normalized || keys.length === 0) {
    return ''
  }

  try {
    const url = new URL(normalized, window.location.href)

    for (const key of keys) {
      const value = normalizeWhmcsText(url.searchParams.get(key) ?? '')

      if (value) {
        return value
      }
    }
  } catch {
    return ''
  }

  return ''
}

export function getMoneyValues(text) {
  return String(text ?? '').match(/-?\d[\d.,]*/g) ?? []
}

function normalizeMoneyToken(token) {
  const compact = String(token ?? '')
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '')

  if (!compact) {
    return ''
  }

  const lastComma = compact.lastIndexOf(',')
  const lastDot = compact.lastIndexOf('.')

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.'
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ','

    return compact
      .split(thousandsSeparator).join('')
      .replace(decimalSeparator, '.')
  }

  if (lastComma >= 0) {
    const decimalsLength = compact.length - lastComma - 1

    if (decimalsLength >= 1 && decimalsLength <= 2) {
      return compact.replace(/\./g, '').replace(',', '.')
    }

    return compact.replace(/,/g, '')
  }

  if (lastDot >= 0) {
    return compact.replace(/,/g, '')
  }

  return compact
}

export function parseMoneyValue(text, fallback = 0) {
  const matches = getMoneyValues(text)
  const lastMatch = matches[matches.length - 1]

  if (!lastMatch) {
    return fallback
  }

  const numericValue = Number(normalizeMoneyToken(lastMatch))

  return Number.isFinite(numericValue) ? numericValue : fallback
}

function looksLikeLoginPage(finalUrl, html) {
  const normalizedUrl = String(finalUrl ?? '').toLowerCase()
  const normalizedHtml = String(html ?? '').toLowerCase()

  if (LOGIN_URL_HINTS.some((hint) => normalizedUrl.includes(hint))) {
    return true
  }

  return (
    normalizedHtml.includes('name="password"') &&
    (
      normalizedHtml.includes('name="username"') ||
      normalizedHtml.includes('name="email"') ||
      normalizedHtml.includes('name="loginemail"')
    )
  )
}

export async function fetchWhmcsDocument(rawUrl) {
  const url = resolveWhmcsUrl(rawUrl)
  let response

  try {
    response = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
  } catch (error) {
    throw createWhmcsNativeFallbackError('The WHMCS page could not be opened.', {
      cause: error,
      url: url.toString(),
    })
  }

  const html = await response.text()
  const responseUrl = toAbsoluteWhmcsUrl(response.url || url.toString(), url.toString()) || url.toString()

  if (looksLikeLoginPage(responseUrl, html)) {
    throw new WhmcsPageError('Authentication required.', {
      code: 'auth_required',
      status: response.status,
      url: responseUrl,
    })
  }

  if (!response.ok) {
    throw createWhmcsNativeFallbackError('The WHMCS page could not be loaded.', {
      status: response.status,
      url: responseUrl,
    })
  }

  return {
    document: new DOMParser().parseFromString(html, 'text/html'),
    html,
    url: new URL(responseUrl),
  }
}
