export const DIRECT_AUTH_TOKEN_STORAGE_KEY = 'auth_token'
export const DIRECT_AUTH_TOKEN_QUERY_PARAM = 'directAuthToken'

let directAuthTokenRequestPromise = null

export function isLocalDashboardHost() {
  if (typeof window === 'undefined') {
    return false
  }

  const hostname = String(window.location.hostname ?? '').trim().toLowerCase()

  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export function bootstrapDirectAuthTokenFromUrl() {
  if (!isLocalDashboardHost()) {
    return ''
  }

  try {
    const currentUrl = new URL(window.location.href)
    const token = currentUrl.searchParams.get(DIRECT_AUTH_TOKEN_QUERY_PARAM)?.trim() ?? ''

    if (!token) {
      return ''
    }

    persistDirectAuthToken(token)
    currentUrl.searchParams.delete(DIRECT_AUTH_TOKEN_QUERY_PARAM)
    window.history.replaceState({}, document.title, `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`)

    return token
  } catch {
    return ''
  }
}

export function bootstrapDirectAuthTokenFromDashboard(dashboardBootstrap) {
  if (typeof window === 'undefined') {
    return ''
  }

  const token =
    dashboardBootstrap && typeof dashboardBootstrap.directAuthToken === 'string'
      ? dashboardBootstrap.directAuthToken.trim()
      : ''

  if (!token) {
    return ''
  }

  persistDirectAuthToken(token)

  if (window.__CLOUDHUB_BOOTSTRAP__ && typeof window.__CLOUDHUB_BOOTSTRAP__ === 'object') {
    delete window.__CLOUDHUB_BOOTSTRAP__.directAuthToken
  }

  return token
}

export function persistDirectAuthToken(token) {
  if (typeof window === 'undefined') {
    return ''
  }

  const normalizedToken = typeof token === 'string' ? token.trim() : ''

  if (!normalizedToken) {
    return ''
  }

  window.localStorage.setItem(DIRECT_AUTH_TOKEN_STORAGE_KEY, normalizedToken)

  return normalizedToken
}

export function readDirectAuthToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  const token = window.localStorage.getItem(DIRECT_AUTH_TOKEN_STORAGE_KEY)

  return typeof token === 'string' ? token.trim() : ''
}

export function hasDirectAuthToken() {
  return readDirectAuthToken().length > 0
}

export function clearDirectAuthToken() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(DIRECT_AUTH_TOKEN_STORAGE_KEY)
}

export async function loadDirectAuthTokenOnce(fetchToken, options = {}) {
  const { forceRefresh = false } = options
  const storedToken = forceRefresh ? '' : readDirectAuthToken()

  if (storedToken) {
    return storedToken
  }

  if (!directAuthTokenRequestPromise) {
    directAuthTokenRequestPromise = Promise.resolve()
      .then(() => fetchToken())
      .then((response) => persistDirectAuthToken(response?.directAuthToken ?? ''))
      .finally(() => {
        directAuthTokenRequestPromise = null
      })
  }

  return directAuthTokenRequestPromise
}
