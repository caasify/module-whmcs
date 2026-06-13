import { normalizeCloudVpsDatacenterDisplayName } from './cloudVpsConfig'

function normalizeDatacenterTranslationKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase()
}

export function formatLocationParts(parts = [], isRtl = false) {
  return parts.filter(Boolean).join(isRtl ? '، ' : ', ')
}

export function translateDatacenterName(t, datacenterName) {
  const displayName = normalizeCloudVpsDatacenterDisplayName(datacenterName)

  if (!displayName) {
    return ''
  }

  return t(
    `servers.infrastructure.${normalizeDatacenterTranslationKey(displayName)}`,
    undefined,
    displayName,
  )
}
