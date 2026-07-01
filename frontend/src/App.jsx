import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardAppProvider } from './context/DashboardAppProvider'
import { useDashboardUiState } from './context/hooks/useDashboardUiState'
import { DashboardLayout } from './layouts/DashboardLayout'
import { readDashboardBootstrap } from './lib/dashboardBootstrap'
import { AddFundsPage } from './pages/AddFundsPage'
import { BillingPage } from './pages/BillingPage'
import { DashboardPage } from './pages/DashboardPage'
import { DeployConfigurePage } from './pages/DeployConfigurePage'
import { DeployLocationPage } from './pages/DeployLocationPage'
import { DeployPlanPage } from './pages/DeployPlanPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { PublicPricingPage } from './pages/PublicPricingPage'
import { ServerDetailPage } from './pages/ServerDetailPage'
import { ServersListPage } from './pages/ServersListPage'
import { TicketCreatePage } from './pages/TicketCreatePage'
import { TicketDetailPage } from './pages/TicketDetailPage'
import { TicketListPage } from './pages/TicketListPage'

function DashboardApp({ dashboardBootstrap }) {
  return (
    <DashboardAppProvider dashboardBootstrap={dashboardBootstrap}>
      <HashRouter>
        <Routes>
          <Route path="/support/tickets/new" element={<TicketCreatePage />} />
          <Route path="/support/tickets/:ticketId" element={<TicketDetailPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate replace to="/dashboard" />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/servers" element={<ServersListPage />} />
            <Route path="/servers/:serverId" element={<ServerDetailPage />} />
            <Route path="/deploy/location" element={<DeployLocationPage />} />
            <Route path="/deploy/plan" element={<DeployPlanPage />} />
            <Route path="/deploy/configure" element={<DeployConfigurePage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/billing/add-funds" element={<AddFundsPage />} />
            <Route path="/billing/invoices/:invoiceId" element={<InvoiceDetailPage />} />
            <Route path="/support/tickets" element={<TicketListPage />} />
            <Route path="*" element={<Navigate replace to="/dashboard" />} />
          </Route>
        </Routes>
      </HashRouter>
    </DashboardAppProvider>
  )
}

function PublicPricingApp({ dashboardBootstrap }) {
  const uiState = useDashboardUiState({ dashboardBootstrap })

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate replace to="/pricing" />} />
        <Route
          path="/pricing"
          element={(
            <PublicPricingPage
              companyProfile={uiState.companyProfile}
              cloudVpsConfig={uiState.cloudVpsConfig}
              featureFlags={dashboardBootstrap.featureFlags}
              formatCurrency={uiState.formatCurrency}
              loginUrl={dashboardBootstrap.loginUrl}
              localizeDigits={uiState.localizeDigits}
              pricingContext={uiState.pricingContext}
              publicPricingCatalog={dashboardBootstrap.publicPricingCatalog}
              resolvedLanguages={uiState.resolvedLanguages}
              setLocale={uiState.setLocale}
              t={uiState.t}
              themeMode={uiState.themeMode}
              toggleThemeMode={uiState.toggleThemeMode}
            />
          )}
        />
        <Route path="*" element={<Navigate replace to="/pricing" />} />
      </Routes>
    </HashRouter>
  )
}

function App({ dashboardBootstrap = readDashboardBootstrap() }) {
  if (dashboardBootstrap.viewMode === 'publicPricing') {
    return <PublicPricingApp dashboardBootstrap={dashboardBootstrap} />
  }

  return <DashboardApp dashboardBootstrap={dashboardBootstrap} />
}

export default App
