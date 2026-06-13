import { useContext } from 'react'
import { DashboardAppContext } from './dashboardAppContext'

export function useDashboardApp() {
  const context = useContext(DashboardAppContext)

  if (!context) {
    throw new Error('useDashboardApp must be used within DashboardAppProvider')
  }

  return context
}
