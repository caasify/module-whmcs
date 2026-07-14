import { useCallback, useEffect, useState } from 'react'
import {
  createTranslator,
  defaultLocale,
  getLocaleMeta,
  resolveSupportedLocale,
  supportedLanguages,
} from '../../i18n'
import { formatCompactCurrency, formatCurrency, formatNumber, localizeDigits } from '../../lib/formatters'
import { getCurrencyLabel, getDisplayCurrency, getWhmcsCurrency } from '../../lib/pricing'
import { readDashboardBootstrap, saveDashboardLanguagePreference } from '../../lib/dashboardBootstrap'
import {
  applyDashboardUiSettings,
  applyThemeMode,
  DEFAULT_THEME_MODE,
  isThemeMode,
  THEME_MODE_STORAGE_KEY,
} from '../../thememode'
import { createMessageNotice } from '../dashboardNotices'
import { initialDashboardUi } from '../dashboardStateDefaults'

export function useDashboardUiState({ dashboardBootstrap = readDashboardBootstrap() } = {}) {
  const [locale, setLocaleState] = useState(() => dashboardBootstrap.locale ?? defaultLocale)
  const [themeMode, setThemeModeState] = useState(() => {
    if (typeof window === 'undefined') {
      return dashboardBootstrap.uiSettings.themeMode ?? DEFAULT_THEME_MODE
    }

    if (dashboardBootstrap.isPublicPricingView) {
      return dashboardBootstrap.uiSettings.themeMode ?? DEFAULT_THEME_MODE
    }

    const storedMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)

    return isThemeMode(storedMode) ? storedMode : dashboardBootstrap.uiSettings.themeMode
  })
  const [ui, setUi] = useState(initialDashboardUi)

  const availableLanguages = supportedLanguages.filter(
    (language) =>
      language.active && dashboardBootstrap.supportedLocales.includes(language.code),
  )
  const resolvedLanguages = availableLanguages.length > 0
    ? availableLanguages
    : supportedLanguages.filter((language) => language.active)
  const localeMeta = getLocaleMeta(locale)
  const dir = localeMeta.dir
  const t = createTranslator(locale)
  const pricingContext = dashboardBootstrap.pricingContext
  const displayCurrency = getDisplayCurrency(pricingContext)
  const whmcsCurrency = getWhmcsCurrency(pricingContext)

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = dir
    document.body.dir = dir
  }, [dir, locale])

  useEffect(() => {
    const appliedMode = applyThemeMode(themeMode)

    applyDashboardUiSettings(dashboardBootstrap.uiSettings)

    if (!dashboardBootstrap.isPublicPricingView) {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, appliedMode)
    }
  }, [dashboardBootstrap.isPublicPricingView, dashboardBootstrap.uiSettings, themeMode])

  const setNotice = useCallback((notice) => {
    setUi((current) => ({
      ...current,
      notice,
    }))
  }, [])

  const showErrorNotice = useCallback((message) => {
    if (!message) {
      return
    }

    setNotice(createMessageNotice('error', message))
  }, [setNotice])

  const setLocale = useCallback((nextLocale) => {
    const supported = resolvedLanguages.find((language) => language.code === nextLocale)

    if (!supported) {
      return
    }

    const resolvedLocale = resolveSupportedLocale(nextLocale)

    setLocaleState(resolvedLocale)
    void saveDashboardLanguagePreference(
      dashboardBootstrap.apiUrl,
      dashboardBootstrap.csrfToken,
      resolvedLocale,
    ).catch(() => {})
  }, [dashboardBootstrap.apiUrl, dashboardBootstrap.csrfToken, resolvedLanguages])

  const setThemeMode = useCallback((nextMode) => {
    if (!isThemeMode(nextMode)) {
      return
    }

    setThemeModeState(nextMode)
  }, [])

  const toggleThemeMode = useCallback(() => {
    setThemeModeState((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const openMobileNav = useCallback(() => {
    setUi((current) => ({ ...current, mobileNavOpen: true }))
  }, [])

  const closeMobileNav = useCallback(() => {
    setUi((current) => ({ ...current, mobileNavOpen: false }))
  }, [])

  const toggleDesktopSidebar = useCallback(() => {
    setUi((current) => ({
      ...current,
      desktopSidebarCollapsed: !current.desktopSidebarCollapsed,
    }))
  }, [])

  const dismissNotice = useCallback(() => {
    setUi((current) => ({ ...current, notice: null }))
  }, [])

  return {
    billingContext: dashboardBootstrap.billingContext,
    closeMobileNav,
    companyProfile: dashboardBootstrap.companyProfile,
    cloudVpsConfig: dashboardBootstrap.cloudVpsConfig,
    featureFlags: dashboardBootstrap.featureFlags,
    currencyLabel: getCurrencyLabel(displayCurrency),
    dir,
    dismissNotice,
    formatCompactCurrency: (value, currency = displayCurrency, options) =>
      formatCompactCurrency(value, currency, locale, options),
    formatCurrency: (value, currency = displayCurrency, options) =>
      formatCurrency(value, currency, locale, options),
    formatNumber: (value, options) => formatNumber(value, locale, options),
    formatWhmcsCompactCurrency: (value, currency = whmcsCurrency, options) =>
      formatCompactCurrency(value, currency, locale, options),
    formatWhmcsCurrency: (value, currency = whmcsCurrency, options) =>
      formatCurrency(value, currency, locale, options),
    isRtl: dir === 'rtl',
    localizeDigits: (value) => localizeDigits(value, locale),
    locale,
    openMobileNav,
    nativeRoutes: dashboardBootstrap.nativeRoutes,
    pricingContext,
    resolvedLanguages,
    setLocale,
    setNotice,
    setThemeMode,
    showErrorNotice,
    t,
    themeMode,
    toggleDesktopSidebar,
    toggleThemeMode,
    ui,
    whmcsCurrencyLabel: getCurrencyLabel(whmcsCurrency),
    whmcsAccess: dashboardBootstrap.whmcsAccess,
  }
}
