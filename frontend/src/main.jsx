import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { getLocaleMeta } from './i18n'
import {
  bootstrapDirectAuthTokenFromDashboard,
  bootstrapDirectAuthTokenFromUrl,
  clearDirectAuthToken,
  isLocalDashboardHost,
} from './lib/services/server'
import { readDashboardBootstrap } from './lib/dashboardBootstrap'
import {
  applyDashboardUiSettings,
  applyThemeMode,
  THEME_MODE_STORAGE_KEY,
} from './thememode'

let shouldRenderApp = true
let dashboardBootstrap = null

if (typeof window !== 'undefined') {
  bootstrapDirectAuthTokenFromUrl()
  dashboardBootstrap = readDashboardBootstrap()
  const isPublicPricingView = dashboardBootstrap.isPublicPricingView === true

  if (
    !isLocalDashboardHost()
    && !isPublicPricingView
    && (!dashboardBootstrap.hasBootstrap || !dashboardBootstrap.isAuthenticatedClient)
  ) {
    clearDirectAuthToken()
    window.location.replace(dashboardBootstrap.loginUrl)
    shouldRenderApp = false
  }

  if (shouldRenderApp) {
    bootstrapDirectAuthTokenFromDashboard(dashboardBootstrap)
    const localeMeta = getLocaleMeta(dashboardBootstrap.locale)

    if (dashboardBootstrap.hasBootstrap && dashboardBootstrap.companyProfile.name) {
      document.title = dashboardBootstrap.companyProfile.name
    }

    document.documentElement.dataset.caasifyViewMode = dashboardBootstrap.viewMode
    document.body.dataset.caasifyViewMode = dashboardBootstrap.viewMode
    document.documentElement.lang = dashboardBootstrap.locale
    document.documentElement.dir = localeMeta.dir
    document.body.dir = localeMeta.dir

    const initialThemeMode = dashboardBootstrap.isPublicPricingView
      ? dashboardBootstrap.uiSettings.themeMode
      : window.localStorage.getItem(THEME_MODE_STORAGE_KEY) ?? dashboardBootstrap.uiSettings.themeMode

    applyThemeMode(
      initialThemeMode,
    )
    applyDashboardUiSettings(dashboardBootstrap.uiSettings)
  }
}

if (shouldRenderApp) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App dashboardBootstrap={dashboardBootstrap ?? readDashboardBootstrap()} />
    </StrictMode>,
  )
}
