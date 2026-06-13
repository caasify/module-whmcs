export const initialDashboardUi = {
  desktopSidebarCollapsed: false,
  mobileNavOpen: false,
  notice: null,
}

export const initialDashboardWallet = {
  balance: 0,
  creditBalance: 0,
  lastAddedFunds: null,
}

export function createInitialDashboardUser(currentClient = {}) {
  return {
    id: null,
    name: '',
    fullName: '',
    email: '',
    initials: 'CL',
    address: [],
    ...currentClient,
  }
}
