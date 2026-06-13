const GLOBAL_BOOTSTRAP_KEY = '__CLOUDHUB_BOOTSTRAP__'
const DEFAULT_BRAND_NAME = 'Company'

export function resolveBrandName(value, fallback = DEFAULT_BRAND_NAME) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export function readRuntimeBrandName(fallback = DEFAULT_BRAND_NAME) {
  if (typeof window === 'undefined') {
    return fallback
  }

  const bootstrap = window[GLOBAL_BOOTSTRAP_KEY]
  const brandName = bootstrap?.companyProfile?.name

  return resolveBrandName(brandName, fallback)
}
