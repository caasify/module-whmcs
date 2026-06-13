export function buildWhmcsClientAreaUrl(script = '', query = {}) {
  const normalizedScript = typeof script === 'string' ? script.trim().replace(/^\/+/, '') : ''

  if (!normalizedScript) {
    return ''
  }

  const searchParams = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    searchParams.set(key, String(value))
  })

  const serializedQuery = searchParams.toString()

  return serializedQuery ? `${normalizedScript}?${serializedQuery}` : normalizedScript
}

export function redirectToWhmcsUrl(primaryUrl, fallbackUrl = '') {
  if (typeof window === 'undefined') {
    return false
  }

  const resolvedPrimaryUrl = typeof primaryUrl === 'string' ? primaryUrl.trim() : ''
  const resolvedFallbackUrl = typeof fallbackUrl === 'string' ? fallbackUrl.trim() : ''
  const targetUrl = resolvedPrimaryUrl || resolvedFallbackUrl

  if (!targetUrl) {
    return false
  }

  window.location.assign(targetUrl)

  return true
}
