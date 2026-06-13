import { useEffect } from 'react'
import { useDashboardApp } from '../context/useDashboardApp'
import { redirectToWhmcsUrl } from '../lib/whmcsClientArea'

export function TicketCreatePage() {
  const { nativeRoutes } = useDashboardApp()

  useEffect(() => {
    redirectToWhmcsUrl(nativeRoutes.ticketCreateUrl)
  }, [nativeRoutes.ticketCreateUrl])

  return null
}
