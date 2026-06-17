import { persistDirectAuthToken } from './directAuth.js'
import { dashboardWhmcsApi } from '../../dashboardWhmcsApi.js'
import { readDashboardBootstrap } from '../../dashboardBootstrap.js'

export const DEFAULT_DIRECT_SERVER_API_BASE_URL = 'https://hub.caasify.com/server/v1'

export class CaasifyDirectApiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'CaasifyDirectApiError'
    this.status = options.status ?? 0
    this.payload = options.payload ?? null
    this.code = options.code ?? 'request_failed'
  }
}

function buildUrl(pathname, query = {}) {
  const resolvedBaseUrl = resolveDirectServerApiBaseUrl()
  const baseUrl = resolvedBaseUrl.endsWith('/')
    ? resolvedBaseUrl
    : `${resolvedBaseUrl}/`
  const url = new URL(pathname.replace(/^\//, ''), baseUrl)

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        url.searchParams.append(key, String(item))
      })
      return
    }

    url.searchParams.set(key, String(value))
  })

  return url
}

function resolveDirectServerApiBaseUrl() {
  const dashboardBootstrap = readDashboardBootstrap()
  const configuredServiceUrl =
    typeof dashboardBootstrap.services?.serviceUrls?.server === 'string'
      ? dashboardBootstrap.services.serviceUrls.server.trim()
      : ''
  const configuredBaseUrl =
    typeof dashboardBootstrap.services?.hubBaseUrl === 'string'
      ? dashboardBootstrap.services.hubBaseUrl.trim()
      : ''
  const configuredServicePath =
    typeof dashboardBootstrap.services?.servicePaths?.server === 'string'
      ? dashboardBootstrap.services.servicePaths.server.trim()
      : ''

  if (configuredServiceUrl) {
    try {
      const url = new URL(configuredServiceUrl)
      url.search = ''
      url.hash = ''

      return url.toString().replace(/\/$/, '')
    } catch {
      return DEFAULT_DIRECT_SERVER_API_BASE_URL
    }
  }

  if (!configuredBaseUrl) {
    return DEFAULT_DIRECT_SERVER_API_BASE_URL
  }

  try {
    const url = new URL(configuredBaseUrl)
    const normalizedPath = url.pathname.replace(/\/+$/, '')
    const nextServicePath = configuredServicePath || '/server/v1/'

    url.pathname = `${normalizedPath}/${nextServicePath.replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/')
    url.search = ''
    url.hash = ''

    return url.toString().replace(/\/$/, '')
  } catch {
    return DEFAULT_DIRECT_SERVER_API_BASE_URL
  }
}

async function parseApiResponse(response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()

  return text ? { message: text } : null
}

async function resolveDirectAuthToken() {
  const response = await dashboardWhmcsApi.getDirectAuthToken()
  const token = response?.directAuthToken ?? ''

  return persistDirectAuthToken(token)
}

async function request(pathname, options = {}) {
  const token = await resolveDirectAuthToken()

  if (!token) {
    throw new CaasifyDirectApiError('Missing direct browser auth token.', {
      code: 'missing_token',
      status: 401,
    })
  }

  const {
    method = 'GET',
    form = null,
    headers = {},
    humanizeDate = false,
    query = {},
  } = options
  const url = buildUrl(pathname, query)
  const requestHeaders = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...headers,
  }
  const requestInit = {
    method,
    headers: requestHeaders,
  }

  if (humanizeDate) {
    requestHeaders['Date-Humanize'] = '1'
  }

  if (form) {
    const formBody = new URLSearchParams()

    Object.entries(form).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== null && item !== undefined && item !== '') {
            formBody.append(key, String(item))
          }
        })
        return
      }

      formBody.set(key, String(value))
    })

    requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
    requestInit.body = formBody.toString()
  }

  const response = await fetch(url, requestInit)
  const payload = await parseApiResponse(response)

  if (!response.ok) {
    throw new CaasifyDirectApiError(
      payload?.message || `Direct server API request failed with ${response.status}.`,
      {
        code: response.status === 401 || response.status === 403 ? 'unauthorized' : 'request_failed',
        payload,
        status: response.status,
      },
    )
  }

  return payload
}

export function isSilentDirectApiFailure(error) {
  return error instanceof CaasifyDirectApiError
    && (error.code === 'missing_token' || error.status === 401 || error.status === 403)
}

export function isDirectEmptyCollectionFailure(error) {
  return error instanceof CaasifyDirectApiError
    && error.status === 404
    && typeof error.payload?.message === 'string'
    && error.payload.message.toLowerCase().includes('there is nothing')
}

async function requestOptionalCollection(pathname, options = {}, emptyPayload = { data: [] }) {
  try {
    return await request(pathname, options)
  } catch (error) {
    if (isDirectEmptyCollectionFailure(error)) {
      return emptyPayload
    }

    throw error
  }
}

export const caasifyServerApi = {
  getProfile() {
    return request('/profile/show')
  },
  getOrders() {
    return requestOptionalCollection('/orders', { humanizeDate: true })
  },
  getOrder(orderId) {
    return request(`/orders/${orderId}/show`, { humanizeDate: true })
  },
  getOrderViews(orderId) {
    return request(`/orders/${orderId}/views`)
  },
  getOrderActions(orderId) {
    return request(`/orders/${orderId}/actions`)
  },
  requestOrderView(orderId) {
    return request(`/orders/${orderId}/view`)
  },
  createOrder(form) {
    return request('/orders/create', {
      form,
      method: 'POST',
    })
  },
  cancelOrder(orderId) {
    return request(`/orders/${orderId}/cancel`, {
      form: {
        orderId,
      },
      method: 'POST',
    })
  },
  runOrderAction(orderId, buttonId) {
    return request(`/orders/${orderId}/action`, {
      form: {
        button_id: buttonId,
      },
      method: 'POST',
    })
  },
  getOrderStatus(orderId) {
    return request(`/monitoring/orders/${orderId}/status`)
  },
  getOrderTraffic(orderId) {
    return request(`/monitoring/orders/${orderId}/traffic`)
  },
  getActiveOrderReport() {
    return request('/report/order/active')
  },
  getTotalExpenseReport() {
    return request('/report/expense/total')
  },
  getExpenseDates() {
    return request('/report/expense/dates')
  },
  getExpenseOrders(year, month) {
    return request(`/report/expense/${year}/${month}/orders`)
  },
  getCountries() {
    return request('/common/countries')
  },
  getCategories() {
    return request('/common/countries')
  },
  getProductsByCategory(categoryId) {
    return request(`/common/countries/${categoryId}/products`)
  },
  getCommonTerms() {
    return request('/common/countries')
  },
  getProductsByCountry(countryId) {
    return request(`/common/countries/${countryId}/products`)
  },
  getProductsByCountryTerm(termId) {
    return request(`/common/countries/${termId}/products`)
  },
}
