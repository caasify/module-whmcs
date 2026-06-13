import { useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useDashboardApp } from '../context/useDashboardApp'
import { buildWhmcsClientAreaUrl, redirectToWhmcsUrl } from '../lib/whmcsClientArea'

export function TicketDetailPage() {
  const { ticketId } = useParams()
  const location = useLocation()
  const { nativeRoutes } = useDashboardApp()
  const searchParams = new URLSearchParams(location.search)
  const requestedPortalUrl = searchParams.get('portal') ?? ''
  const fallbackTicketUrl = buildWhmcsClientAreaUrl('supporttickets.php', {
    action: 'view',
    id: ticketId,
  })
  const ticketPortalUrl = requestedPortalUrl || fallbackTicketUrl

  useEffect(() => {
    redirectToWhmcsUrl(ticketPortalUrl, nativeRoutes.ticketListUrl)
  }, [nativeRoutes.ticketListUrl, ticketPortalUrl])

  return null
}
