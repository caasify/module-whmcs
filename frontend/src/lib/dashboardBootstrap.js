import { defaultLocale, resolveSupportedLocale } from '../i18n'
import { normalizeCloudVpsConfig } from './cloudVpsConfig'
import { normalizePricingContext } from './pricing'
import { normalizeDashboardUiSettings } from '../thememode'

const GLOBAL_BOOTSTRAP_KEY = '__CLOUDHUB_BOOTSTRAP__'
const DASHBOARD_LANGUAGE_COOKIE_NAME = 'caasify_dashboard_language'
const DASHBOARD_LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const DEFAULT_LOGIN_URL = '/index.php?rp=/login'

function readDashboardLanguageCookie() {
  if (typeof document === 'undefined' || !document.cookie) {
    return null
  }

  const cookies = document.cookie.split('; ')

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf('=')
    const name = separatorIndex >= 0 ? cookie.slice(0, separatorIndex) : cookie

    if (name !== DASHBOARD_LANGUAGE_COOKIE_NAME) {
      continue
    }

    const rawValue = separatorIndex >= 0 ? cookie.slice(separatorIndex + 1) : ''

    return decodeURIComponent(rawValue)
  }

  return null
}

function persistDashboardLanguageCookie(locale) {
  if (typeof document === 'undefined') {
    return
  }

  const resolvedLocale = resolveSupportedLocale(locale)
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : ''

  document.cookie =
    `${DASHBOARD_LANGUAGE_COOKIE_NAME}=${encodeURIComponent(resolvedLocale)}; ` +
    `Max-Age=${DASHBOARD_LANGUAGE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secureFlag}`
}

function readRawBootstrap() {
  if (typeof window === 'undefined') {
    return {}
  }

  const bootstrap = window[GLOBAL_BOOTSTRAP_KEY]

  return bootstrap && typeof bootstrap === 'object' ? bootstrap : {}
}

function normalizeCurrentClient(currentClient) {
  if (!currentClient || typeof currentClient !== 'object') {
    return {
      name: 'Client',
      fullName: 'Client',
      email: '',
      initials: 'CL',
      address: [],
    }
  }

  const fullName =
    typeof currentClient.fullName === 'string' && currentClient.fullName.trim()
      ? currentClient.fullName.trim()
      : typeof currentClient.name === 'string' && currentClient.name.trim()
        ? currentClient.name.trim()
        : 'Client'
  const parts = fullName.split(/\s+/).filter(Boolean)

  return {
    name:
      typeof currentClient.name === 'string' && currentClient.name.trim()
        ? currentClient.name.trim()
        : parts[0] ?? fullName,
    fullName,
    email:
      typeof currentClient.email === 'string'
        ? currentClient.email.trim()
        : '',
    initials:
      typeof currentClient.initials === 'string' && currentClient.initials.trim()
        ? currentClient.initials.trim()
        : parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'CL',
    address: Array.isArray(currentClient.address)
      ? currentClient.address.filter((line) => typeof line === 'string' && line.trim())
      : [],
  }
}

function normalizeCompanyProfile(companyProfile) {
  if (!companyProfile || typeof companyProfile !== 'object') {
    return {
      address: [],
      email: '',
      logoUrl: '',
      name: 'Company',
    }
  }

  return {
    name:
      typeof companyProfile.name === 'string' && companyProfile.name.trim()
        ? companyProfile.name.trim()
        : 'Company',
    email:
      typeof companyProfile.email === 'string'
        ? companyProfile.email.trim()
        : '',
    logoUrl:
      typeof companyProfile.logoUrl === 'string'
        ? companyProfile.logoUrl.trim()
        : '',
    address: Array.isArray(companyProfile.address)
      ? companyProfile.address.filter((line) => typeof line === 'string' && line.trim())
      : [],
  }
}

function normalizeNativeRoutes(nativeRoutes) {
  if (!nativeRoutes || typeof nativeRoutes !== 'object') {
    return {
      clientAreaUrl: 'clientarea.php',
      addFundsUrl: 'clientarea.php?action=addfunds',
      invoiceListUrl: 'clientarea.php?action=invoices',
      ticketCreateUrl: 'submitticket.php',
      ticketListUrl: 'supporttickets.php',
    }
  }

  return {
    clientAreaUrl:
      typeof nativeRoutes.clientAreaUrl === 'string' && nativeRoutes.clientAreaUrl.trim()
        ? nativeRoutes.clientAreaUrl.trim()
        : 'clientarea.php',
    ticketCreateUrl:
      typeof nativeRoutes.ticketCreateUrl === 'string' && nativeRoutes.ticketCreateUrl.trim()
        ? nativeRoutes.ticketCreateUrl.trim()
        : 'submitticket.php',
    ticketListUrl:
      typeof nativeRoutes.ticketListUrl === 'string' && nativeRoutes.ticketListUrl.trim()
        ? nativeRoutes.ticketListUrl.trim()
        : 'supporttickets.php',
    invoiceListUrl:
      typeof nativeRoutes.invoiceListUrl === 'string' && nativeRoutes.invoiceListUrl.trim()
        ? nativeRoutes.invoiceListUrl.trim()
        : 'clientarea.php?action=invoices',
    addFundsUrl:
      typeof nativeRoutes.addFundsUrl === 'string' && nativeRoutes.addFundsUrl.trim()
        ? nativeRoutes.addFundsUrl.trim()
        : 'clientarea.php?action=addfunds',
  }
}

function normalizeWhmcsAccess(whmcsAccess) {
  return {
    canUseCustomTicketsAndInvoices:
      whmcsAccess?.canUseCustomTicketsAndInvoices === true,
  }
}

function normalizePublicPricingCatalog(publicPricingCatalog) {
  if (!publicPricingCatalog || typeof publicPricingCatalog !== 'object') {
    return {
      countriesPayload: { data: [] },
      commonTermsPayload: { data: [] },
      errorMessage: '',
      productsPayload: { data: [] },
    }
  }

  const countriesPayload =
    publicPricingCatalog.countriesPayload && typeof publicPricingCatalog.countriesPayload === 'object'
      ? publicPricingCatalog.countriesPayload
      : publicPricingCatalog.commonTermsPayload && typeof publicPricingCatalog.commonTermsPayload === 'object'
        ? publicPricingCatalog.commonTermsPayload
        : { data: [] }
  const commonTermsPayload =
    publicPricingCatalog.commonTermsPayload && typeof publicPricingCatalog.commonTermsPayload === 'object'
      ? publicPricingCatalog.commonTermsPayload
      : countriesPayload
  const productsPayload =
    publicPricingCatalog.productsPayload && typeof publicPricingCatalog.productsPayload === 'object'
      ? publicPricingCatalog.productsPayload
      : { data: [] }

  return {
    countriesPayload: {
      ...countriesPayload,
      data: Array.isArray(countriesPayload.data) ? countriesPayload.data : [],
    },
    commonTermsPayload: {
      ...commonTermsPayload,
      data: Array.isArray(commonTermsPayload.data) ? commonTermsPayload.data : [],
    },
    errorMessage:
      typeof publicPricingCatalog.errorMessage === 'string'
        ? publicPricingCatalog.errorMessage.trim()
        : '',
    productsPayload: {
      ...productsPayload,
      data: Array.isArray(productsPayload.data) ? productsPayload.data : [],
    },
  }
}

export function readDashboardBootstrap() {
  const bootstrap = readRawBootstrap()
  const cookieLocale = readDashboardLanguageCookie()
  const viewMode = bootstrap.viewMode === 'publicPricing' ? 'publicPricing' : 'dashboard'
  const locale = resolveSupportedLocale(
    viewMode === 'publicPricing'
      ? bootstrap.locale ?? bootstrap.defaultLocale ?? defaultLocale
      : cookieLocale ?? bootstrap.locale ?? bootstrap.defaultLocale ?? defaultLocale,
  )
  const supportedLocales = Array.isArray(bootstrap.supportedLocales)
    ? [...new Set(bootstrap.supportedLocales.map((item) => resolveSupportedLocale(item)))]
    : ['en', 'fa', 'es', 'ru']
  const services = bootstrap.services && typeof bootstrap.services === 'object' ? bootstrap.services : {}

  return {
    hasBootstrap: Object.keys(bootstrap).length > 0,
    apiUrl: typeof bootstrap.apiUrl === 'string' && bootstrap.apiUrl ? bootstrap.apiUrl : 'cloudhub.php',
    csrfToken: typeof bootstrap.csrfToken === 'string' ? bootstrap.csrfToken : '',
    directAuthToken: typeof bootstrap.directAuthToken === 'string' ? bootstrap.directAuthToken.trim() : '',
    defaultLocale: resolveSupportedLocale(bootstrap.defaultLocale ?? defaultLocale),
    isAuthenticatedClient: Number.isInteger(bootstrap.currentClient?.id),
    loginUrl:
      typeof bootstrap.loginUrl === 'string' && bootstrap.loginUrl.trim()
        ? bootstrap.loginUrl.trim()
        : DEFAULT_LOGIN_URL,
    locale,
    supportedLocales,
    uiSettings: normalizeDashboardUiSettings(bootstrap.uiSettings),
    cloudVpsConfig: normalizeCloudVpsConfig(bootstrap.cloudVpsConfig),
    companyProfile: normalizeCompanyProfile(bootstrap.companyProfile),
    currentClient: normalizeCurrentClient(bootstrap.currentClient),
    nativeRoutes: normalizeNativeRoutes(bootstrap.nativeRoutes),
    pricingContext: normalizePricingContext(bootstrap.pricingContext),
    publicPricingCatalog: normalizePublicPricingCatalog(bootstrap.publicPricingCatalog),
    isPublicPricingView: viewMode === 'publicPricing',
    viewMode,
    whmcsAccess: normalizeWhmcsAccess(bootstrap.whmcsAccess),
    services: {
      hubBaseUrl:
        typeof services.hubBaseUrl === 'string' && services.hubBaseUrl
          ? services.hubBaseUrl
          : 'https://hub.caasify.com',
      servicePaths: services.servicePaths && typeof services.servicePaths === 'object'
        ? services.servicePaths
        : {
            server: '/server/v1/',
            aiApi: '/ai-api/v1/',
            s3Storage: '/s3-storage/v1/',
          },
      serviceUrls: services.serviceUrls && typeof services.serviceUrls === 'object'
        ? services.serviceUrls
        : {},
    },
  }
}

export async function saveDashboardLanguagePreference(apiUrl, csrfToken, locale) {
  if (typeof window === 'undefined') {
    return
  }

  persistDashboardLanguageCookie(locale)

  if (!csrfToken) {
    return
  }

  const endpoint = new URL(apiUrl, window.location.href)
  endpoint.searchParams.set('action', 'language-preference')

  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      csrfToken,
      locale,
    }),
  })

  if (!response.ok) {
    throw new Error(`Unable to save dashboard language (${response.status})`)
  }
}
