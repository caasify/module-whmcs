function slugify(value) {
  const cleaned = String(value ?? '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()

  if (!cleaned) {
    return 'unknown'
  }

  const words = cleaned.split(/\s+/)

  return words
    .map((word, index) => {
      const lowerWord = word.toLowerCase()
      if (index === 0) {
        return lowerWord
      }

      return lowerWord.slice(0, 1).toUpperCase() + lowerWord.slice(1)
    })
    .join('')
}

function sanitizeString(value) {
  const normalized = String(value ?? '').trim()

  return normalized || ''
}

function resolveProductDetail(product) {
  return product?.detail && typeof product.detail === 'object'
    ? product.detail
    : product && typeof product === 'object'
      ? product
      : {}
}

function normalizeStringList(values, normalizer) {
  const normalizedValues = new Set()

  for (const value of Array.isArray(values) ? values : []) {
    const normalizedValue = normalizer(value)

    if (normalizedValue) {
      normalizedValues.add(normalizedValue)
    }
  }

  return [...normalizedValues]
}

export function normalizeCloudVpsCountryCode(value) {
  const normalized = slugify(value)

  return normalized === 'unknown' ? '' : normalized
}

export function normalizeCloudVpsDatacenterKey(value) {
  return sanitizeString(value).toLowerCase()
}

export function normalizeCloudVpsDatacenterDisplayName(value) {
  const normalized = sanitizeString(value)

  if (!normalized) {
    return ''
  }

  const aliases = {
    z1: 'DigitalOcean',
    z3: 'Hetzner',
    z5: 'Linode',
    z6: 'Vultr',
    htz: 'Hetzner',
    z2: 'BigCore',
  }

  return aliases[normalized.toLowerCase()] ?? normalized
}

export function normalizeCloudVpsConfig(config = {}) {
  return {
    hiddenCountryCodes: normalizeStringList(
      config?.hiddenCountryCodes,
      normalizeCloudVpsCountryCode,
    ),
    hiddenDatacenterKeys: normalizeStringList(
      config?.hiddenDatacenterKeys,
      normalizeCloudVpsDatacenterKey,
    ),
    visibleCountryCodes: normalizeStringList(
      config?.visibleCountryCodes,
      normalizeCloudVpsCountryCode,
    ),
    hasResolvedVisibility: config?.hasResolvedVisibility === true,
    displayDatacenterName: config?.displayDatacenterName === true,
  }
}

export function getCloudVpsProductCountryCode(product) {
  const detail = resolveProductDetail(product)

  return normalizeCloudVpsCountryCode(detail?.dc_country)
}

export function getCloudVpsProductDatacenterKey(product) {
  const detail = resolveProductDetail(product)

  return normalizeCloudVpsDatacenterKey(
    detail?.dc_real_name ?? detail?.dc_name,
  )
}

export function getCloudVpsProductDatacenterName(product) {
  const detail = resolveProductDetail(product)

  return normalizeCloudVpsDatacenterDisplayName(
    detail?.dc_real_name ?? detail?.dc_name,
  )
}

export function isCloudVpsProductHidden(product, cloudVpsConfig = {}) {
  const config = normalizeCloudVpsConfig(cloudVpsConfig)
  const countryCode = getCloudVpsProductCountryCode(product)
  const datacenterKey = getCloudVpsProductDatacenterKey(product)
  const hiddenCountryCodes = new Set(config.hiddenCountryCodes)
  const hiddenDatacenterKeys = new Set(config.hiddenDatacenterKeys)

  if (countryCode && hiddenCountryCodes.has(countryCode)) {
    return true
  }

  if (datacenterKey && hiddenDatacenterKeys.has(datacenterKey)) {
    return true
  }

  return false
}

export function filterLocationsByCloudVpsConfig(locations = [], cloudVpsConfig = {}) {
  const config = normalizeCloudVpsConfig(cloudVpsConfig)
  const hiddenCountryCodes = new Set(config.hiddenCountryCodes)
  const visibleCountryCodes = new Set(config.visibleCountryCodes)

  return locations.filter((location) => {
    const countryCode = normalizeCloudVpsCountryCode(
      location?.countryCode ?? location?.country,
    )

    if (!countryCode) {
      return true
    }

    if (hiddenCountryCodes.has(countryCode)) {
      return false
    }

    if (config.hasResolvedVisibility) {
      return visibleCountryCodes.has(countryCode)
    }

    return true
  })
}

export function collectVisibleCountryCodesFromPlans(plans = []) {
  const visibleCountries = new Set()

  for (const plan of plans) {
    const variants = Array.isArray(plan?.cityVariants) && plan.cityVariants.length > 0
      ? plan.cityVariants
      : [{ location: plan?.location }]

    for (const variant of variants) {
      const countryCode = normalizeCloudVpsCountryCode(
        variant?.location?.countryCode ?? variant?.location?.country,
      )

      if (countryCode) {
        visibleCountries.add(countryCode)
      }
    }
  }

  return [...visibleCountries]
}
