import { buildWhmcsClientAreaUrl } from '../lib/whmcsClientArea'

export function formatTicketDisplayId(ticketId) {
  const normalizedId = String(ticketId ?? '').trim()

  return normalizedId !== '' ? normalizedId : '--'
}

export function resolveTicketPortalUrl(ticketId, portalUrl = '', ticketDetailUrl = '') {
  const normalizedPortalUrl = typeof portalUrl === 'string' ? portalUrl.trim() : ''
  const normalizedTicketDetailUrl = typeof ticketDetailUrl === 'string' ? ticketDetailUrl.trim() : ''

  if (normalizedPortalUrl) {
    return normalizedPortalUrl
  }

  if (normalizedTicketDetailUrl) {
    const url = new URL(normalizedTicketDetailUrl, window.location.href)
    url.searchParams.set('id', formatTicketDisplayId(ticketId))

    return url.toString()
  }

  const fallback = buildWhmcsClientAreaUrl('supporttickets.php', {
    action: 'view',
    id: formatTicketDisplayId(ticketId),
  })

  return fallback ? new URL(fallback, window.location.origin).toString() : ''
}
