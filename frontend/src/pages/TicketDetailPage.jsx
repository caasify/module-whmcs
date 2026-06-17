import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDashboardApp } from '../context/useDashboardApp'
import { redirectToWhmcsUrl } from '../lib/whmcsClientArea'

export function TicketDetailPage() {
  const { ticketId } = useParams()
  const { nativeRoutes } = useDashboardApp()
  const ticketPortalUrl = new URL(nativeRoutes.ticketDetailUrl, window.location.href)

  ticketPortalUrl.searchParams.set('id', ticketId)

  useEffect(() => {
    redirectToWhmcsUrl(ticketPortalUrl.toString(), nativeRoutes.ticketListUrl)
  }, [nativeRoutes.ticketListUrl, ticketPortalUrl])

  return null
}
