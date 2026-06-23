import { useState } from 'react'
import { readDashboardBootstrap } from '../lib/dashboardBootstrap'
import { DashboardAppContext } from './dashboardAppContext'
import { useDashboardBilling } from './hooks/useDashboardBilling'
import { useDashboardDeploy } from './hooks/useDashboardDeploy'
import { useDashboardDirectAuth } from './hooks/useDashboardDirectAuth'
import { useDashboardServers } from './hooks/useDashboardServers'
import { useDashboardTickets } from './hooks/useDashboardTickets'
import { useDashboardUiState } from './hooks/useDashboardUiState'

export function DashboardAppProvider({ children, dashboardBootstrap: initialDashboardBootstrap = null }) {
  const [dashboardBootstrap] = useState(() => initialDashboardBootstrap ?? readDashboardBootstrap())
  const uiState = useDashboardUiState({ dashboardBootstrap })
  const directAuthState = useDashboardDirectAuth({
    isAuthenticatedClient: dashboardBootstrap.isAuthenticatedClient,
    isPublicPricingView: dashboardBootstrap.isPublicPricingView,
    showErrorNotice: uiState.showErrorNotice,
  })
  const serverState = useDashboardServers({
    currentClient: dashboardBootstrap.currentClient,
    directAuthReady: directAuthState.ready,
    pricingContext: uiState.pricingContext,
    setNotice: uiState.setNotice,
    showErrorNotice: uiState.showErrorNotice,
  })
  const billingState = useDashboardBilling({
    nativeRoutes: uiState.nativeRoutes,
    pricingContext: uiState.pricingContext,
    serverOverview: serverState.serverOverview,
    setNotice: uiState.setNotice,
    showErrorNotice: uiState.showErrorNotice,
    whmcsAccess: uiState.whmcsAccess,
  })
  const ticketState = useDashboardTickets({
    nativeRoutes: uiState.nativeRoutes,
    setNotice: uiState.setNotice,
    showErrorNotice: uiState.showErrorNotice,
    whmcsAccess: uiState.whmcsAccess,
  })
  const deployState = useDashboardDeploy({
    cloudVpsConfig: uiState.cloudVpsConfig,
    directAuthReady: directAuthState.ready,
    loadServerDetail: serverState.loadServerDetail,
    pricingContext: uiState.pricingContext,
    refreshDirectServerOverview: serverState.refreshDirectServerOverview,
    walletBalanceReady: serverState.serverOverview.ready,
    walletBalance: serverState.wallet.balance,
    setNotice: uiState.setNotice,
  })

  const value = {
    user: serverState.user,
    wallet: serverState.wallet,
    ui: uiState.ui,
    servers: serverState.servers,
    serverDetails: serverState.serverDetails,
    serverActionStates: serverState.serverActionStates,
    serverOverview: serverState.serverOverview,
    deployCategories: deployState.deployCategories,
    deployDraft: deployState.deployDraft,
    deployErrorMessage: deployState.deployErrorMessage,
    deployLocations: deployState.deployLocations,
    deployPlans: deployState.deployPlans,
    selectedDeployBilling: deployState.selectedDeployBilling,
    selectedDeployLocation: deployState.selectedDeployLocation,
    selectedDeployPlan: deployState.selectedDeployPlan,
    selectedDeploySystem: deployState.selectedDeploySystem,
    deployPreview: deployState.deployPreview,
    tickets: ticketState.tickets,
    ticketReadState: ticketState.readState,
    invoices: billingState.invoices,
    invoiceDetails: billingState.invoiceDetails,
    paymentMethods: billingState.paymentMethods,
    invoiceReadState: billingState.invoiceReadState,
    billingUsage: billingState.billingUsage,
    loading: {
      ...billingState.loading,
      ...ticketState.loading,
      directAuth: directAuthState.loading,
      deployLocations: deployState.loading.locations,
      deployPlans: deployState.loading.plans,
      serverOverview: serverState.loading.overview,
    },
    locale: uiState.locale,
    themeMode: uiState.themeMode,
    dir: uiState.dir,
    isRtl: uiState.isRtl,
    supportedLanguages: uiState.resolvedLanguages,
    companyProfile: uiState.companyProfile,
    cloudVpsConfig: uiState.cloudVpsConfig,
    currencyLabel: uiState.currencyLabel,
    formatWhmcsCompactCurrency: uiState.formatWhmcsCompactCurrency,
    formatWhmcsCurrency: uiState.formatWhmcsCurrency,
    formatNumber: uiState.formatNumber,
    localizeDigits: uiState.localizeDigits,
    nativeRoutes: uiState.nativeRoutes,
    pricingContext: uiState.pricingContext,
    t: uiState.t,
    formatCurrency: uiState.formatCurrency,
    formatCompactCurrency: uiState.formatCompactCurrency,
    whmcsCurrencyLabel: uiState.whmcsCurrencyLabel,
    whmcsAccess: uiState.whmcsAccess,
    actions: {
      closeMobileNav: uiState.closeMobileNav,
      confirmDeployment: deployState.confirmDeployment,
      createAddFundsInvoice: billingState.createAddFundsInvoice,
      deleteServer: serverState.deleteServer,
      dismissNotice: uiState.dismissNotice,
      loadInvoiceDetail: billingState.loadInvoiceDetail,
      loadServerDetail: serverState.loadServerDetail,
      loadPaymentMethods: billingState.loadPaymentMethods,
      openMobileNav: uiState.openMobileNav,
      rebootServer: serverState.rebootServer,
      rebuildServer: serverState.rebuildServer,
      refreshDirectServerOverview: serverState.refreshDirectServerOverview,
      refreshWhmcsInvoices: billingState.refreshWhmcsInvoices,
      refreshWhmcsTickets: ticketState.refreshWhmcsTickets,
      setLocale: uiState.setLocale,
      setThemeMode: uiState.setThemeMode,
      dismissDeployError: deployState.dismissDeployError,
      startDeploy: deployState.startDeploy,
      toggleDesktopSidebar: uiState.toggleDesktopSidebar,
      toggleServerPower: serverState.toggleServerPower,
      toggleThemeMode: uiState.toggleThemeMode,
      updateDeployDraft: deployState.updateDeployDraft,
    },
  }

  return <DashboardAppContext.Provider value={value}>{children}</DashboardAppContext.Provider>
}
