import { readDashboardBootstrap } from './dashboardBootstrap'

export class DashboardWhmcsApiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'DashboardWhmcsApiError'
    this.status = options.status ?? 0
    this.payload = options.payload ?? null
    this.code = options.code ?? 'request_failed'
  }
}

function buildActionUrl(action, query = {}) {
  const { apiUrl } = readDashboardBootstrap()
  const url = new URL(apiUrl, window.location.href)

  url.searchParams.set('action', action)

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    url.searchParams.set(key, String(value))
  })

  return url
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()

  return text ? { message: text } : null
}

async function request(action, options = {}) {
  const {
    method = 'GET',
    json = null,
    query = {},
    includeCsrf = method !== 'GET',
  } = options
  const bootstrap = readDashboardBootstrap()
  const url = buildActionUrl(action, query)
  const requestInit = {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
    method,
  }

  if (json) {
    requestInit.headers['Content-Type'] = 'application/json'
    requestInit.body = JSON.stringify(
      includeCsrf
        ? {
            ...json,
            csrfToken: bootstrap.csrfToken,
          }
        : json,
    )
  }

  const response = await fetch(url, requestInit)
  const payload = await parseResponse(response)

  if (!response.ok || !payload?.success) {
    throw new DashboardWhmcsApiError(
      payload?.message || `Dashboard request failed with ${response.status}.`,
      {
        code: response.status === 403 ? 'forbidden' : 'request_failed',
        payload,
        status: response.status,
      },
    )
  }

  return payload
}

export const dashboardWhmcsApi = {
  getDirectAuthToken() {
    return request('dashboard.direct-auth-token')
  },
  getPublicPricingCatalog(countryTermId) {
    return request('public-pricing.catalog', {
      includeCsrf: false,
      query: {
        countryTermId,
      },
    })
  },
  getPaymentMethods() {
    return request('billing.gateways.list')
  },
  getInvoices() {
    return request('billing.invoices.list')
  },
  getInvoice(invoiceId) {
    return request('billing.invoices.detail', {
      query: {
        invoiceId,
      },
    })
  },
  getTickets() {
    return request('tickets.list')
  },
  createAddFundsInvoice(amount, paymentMethodCode) {
    return request('billing.add-funds.create', {
      json: {
        amount,
        paymentMethodCode,
      },
      method: 'POST',
    })
  },
}
