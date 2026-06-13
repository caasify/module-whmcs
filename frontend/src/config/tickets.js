import { buildWhmcsClientAreaUrl } from '../lib/whmcsClientArea'

export function formatTicketDisplayId(ticketId) {
  const normalizedId = String(ticketId ?? '').trim()

  return normalizedId !== '' ? normalizedId : '--'
}

export function resolveTicketPortalUrl(ticketId, portalUrl = '') {
  const normalizedPortalUrl = typeof portalUrl === 'string' ? portalUrl.trim() : ''

  if (normalizedPortalUrl) {
    return normalizedPortalUrl
  }

  return buildWhmcsClientAreaUrl('supporttickets.php', {
    action: 'view',
    id: formatTicketDisplayId(ticketId),
  })
}
