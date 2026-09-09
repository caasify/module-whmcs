import { dashboardWhmcsApi } from '../../dashboardWhmcsApi.js'
import { loadDirectAuthTokenOnce } from './directAuth.js'

const VPS_GATEWAY_URL = 'https://ctrblweivpjxqgexcmdr.supabase.co/functions/v1/vps-gateway/'

export async function requestConsoleAccess(vpsId) {
  const authToken = await loadDirectAuthTokenOnce(() => dashboardWhmcsApi.getDirectAuthToken())

  if (!authToken) {
    throw new Error('Authentication is required to open the server console.')
  }

  const response = await fetch(VPS_GATEWAY_URL, {
    body: JSON.stringify({
      action: 'console-access',
      vps_id: String(vpsId),
    }),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
  const payload = await response.json().catch(() => null)
  const consoleUrl = payload?.result?.console_url

  if (!response.ok || payload?.success !== true || typeof consoleUrl !== 'string' || consoleUrl.trim() === '') {
    throw new Error(payload?.message || 'The server console is not available right now.')
  }

  return consoleUrl.trim()
}
