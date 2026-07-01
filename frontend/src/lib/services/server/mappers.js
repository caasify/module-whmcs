import { convertHubAmount } from '../../pricing'
import { readRuntimeBrandName } from '../../branding'
import { getCloudVpsProductDatacenterName, isCloudVpsProductHidden } from '../../cloudVpsConfig'

function slugify(value) {
  const normalized = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const cleaned = normalized
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

function titleFromSlug(value) {
  const spaced = String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()

  if (!spaced) {
    return 'Unknown'
  }

  return spaced
    .split(/\s+/)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ')
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function toRoundedNumber(value, digits = 2) {
  return Number(toNumber(value).toFixed(digits))
}

function toPercent(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(String(value).replace('%', '').trim())

  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.min(100, Math.max(0, Math.round(parsed)))
}

function countryCodeFromName(countryName) {
  const normalized = String(countryName ?? '').trim().toLowerCase()
  const knownCodes = {
    australia: 'AU',
    brazil: 'BR',
    canada: 'CA',
    finland: 'FI',
    france: 'FR',
    germany: 'DE',
    india: 'IN',
    indonesia: 'ID',
    japan: 'JP',
    mexico: 'MX',
    netherlands: 'NL',
    singapore: 'SG',
    'south africa': 'ZA',
    'south korea': 'KR',
    spain: 'ES',
    sweden: 'SE',
    turkey: 'TR',
    uae: 'AE',
    uk: 'GB',
    'united arab emirates': 'AE',
    'united kingdom': 'GB',
    usa: 'US',
    'united states': 'US',
  }

  return knownCodes[normalized] ?? normalized.slice(0, 2).toUpperCase() ?? 'UN'
}

function getCountryFlagEmoji(countryName) {
  const countryCode = countryCodeFromName(countryName)

  if (countryCode.length !== 2) {
    return '🌐'
  }

  return countryCode
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
    .join('')
}

function formatCityLabel(cityName) {
  const compact = String(cityName ?? '').trim()

  if (!compact) {
    return 'Unknown'
  }

  return compact
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
}

function formatOsFamily(templateName) {
  const normalized = String(templateName ?? '').toLowerCase()

  if (normalized.includes('windows')) {
    return {
      family: 'Template',
      familyCode: 'template',
      icon: 'windows',
    }
  }

  if (normalized.includes('debian')) {
    return {
      family: 'Linux',
      familyCode: 'linux',
      icon: 'debian',
    }
  }

  if (normalized.includes('alma')) {
    return {
      family: 'Linux',
      familyCode: 'linux',
      icon: 'almalinux',
    }
  }

  if (normalized.includes('rocky')) {
    return {
      family: 'Linux',
      familyCode: 'linux',
      icon: 'rockylinux',
    }
  }

  return {
    family: 'Linux',
    familyCode: 'linux',
    icon: normalized.includes('debian') ? 'debian' : 'ubuntu',
  }
}

function resolveProductDetail(product) {
  return product?.detail && typeof product.detail === 'object'
    ? product.detail
    : product && typeof product === 'object'
      ? product
      : {}
}

function resolveBillingOptionPrice(product, matcher) {
  const option = (product?.billing_options ?? []).find((billingOption) => matcher(billingOption))

  return toNumber(option?.price, 0)
}

function resolveMonthlyProductPrice(product) {
  const explicitPrice = toNumber(product?.price, 0)

  if (explicitPrice > 0) {
    return explicitPrice
  }

  return resolveBillingOptionPrice(product, (billingOption) => Number(billingOption?.cycle) === 1)
}

function resolveHourlyProductPrice(product) {
  const explicitPrice = toNumber(product?.hourly_price, 0)

  if (explicitPrice > 0) {
    return explicitPrice
  }

  return resolveBillingOptionPrice(product, (billingOption) => String(billingOption?.mode ?? '').trim().toLowerCase() === 'hourly')
}

function findFieldByName(product, fieldName) {
  const normalizedFieldName = String(fieldName ?? '').trim().toLowerCase()
  const fields = product?.sections?.flatMap((section) => section.fields ?? []) ?? []

  return fields.find((field) => String(field.name ?? field.label ?? '').trim().toLowerCase() === normalizedFieldName) ?? null
}

function findOptionByBooleanValue(field, enabled) {
  if (!field) {
    return null
  }

  const options = field.options ?? []
  const wantedName = enabled ? 'yes' : 'no'
  const wantedValue = enabled ? '1' : '0'

  return options.find((option) => {
    const optionName = String(option.name ?? '').trim().toLowerCase()
    const optionValue = String(option.value ?? '').trim().toLowerCase()

    return optionName === wantedName || optionValue === wantedValue
  }) ?? null
}

function normalizeFeatureFlags(featureFlags = null) {
  return {
    enableVpn: featureFlags?.enableVpn !== false,
  }
}

function isVpnLikeTitle(value) {
  const normalized = String(value ?? '').trim().toLowerCase()

  return normalized.includes('vpn') || normalized.includes('#vpn')
}

function isTrojanTemplateName(value) {
  return /^vpn\s+trojan(?:\s+.+)?$/i.test(String(value ?? '').trim())
}

function isVpnProduct(product, featureFlags = null) {
  const { enableVpn } = normalizeFeatureFlags(featureFlags)

  if (enableVpn) {
    return false
  }

  const type = String(product?.type ?? '').trim().toLowerCase()
  const title = String(product?.title ?? product?.name ?? '').trim()

  return type === 'vpn' || isVpnLikeTitle(title)
}

function getPrimaryProduct(order) {
  return order?.records?.[0]?.product ?? null
}

function flattenAvailableButtons(product) {
  const buttons = product?.groups?.flatMap((group) => group.buttons ?? []) ?? []

  return buttons
    .filter((button) => button?.id)
    .map((button) => {
      const name = String(button.name ?? '').trim()
      const normalizedName = name.toLowerCase()

      return {
        id: button.id,
        name,
        type: button.type ?? '',
        actionCode:
          normalizedName === 'start'
            ? 'start'
            : normalizedName === 'stop'
              ? 'stop'
              : normalizedName === 'restart'
                ? 'restart'
                : normalizedName === 'reinstall'
                  ? 'rebuild'
                  : slugify(name),
      }
    })
}

function getCompletedView(order, views = []) {
  const liveViews = Array.isArray(views) ? views : []

  return (
    liveViews.find((view) => view?.status === 'completed')
    ?? order?.view
    ?? liveViews[0]
    ?? null
  )
}

function extractAddressesFromView(view) {
  const values = [
    ...(view?.references ?? []).map((item) => item?.value),
    ...(view?.items ?? []).map((item) => item?.value),
  ]
    .filter(Boolean)
    .map((item) => String(item).trim())

  const ipv4Address = values.find((value) => /^\d{1,3}(\.\d{1,3}){3}$/.test(value)) ?? 'n/a'
  const ipv6Address = values.find((value) => value.includes(':')) ?? 'n/a'

  return {
    ipAddress: ipv4Address,
    ipv6Address,
  }
}

function hasCompletedView(order, views = []) {
  return Boolean(getCompletedView(order, views))
}

function deriveStatus(orderStatus, powerStatus) {
  const normalizedPowerStatus = String(powerStatus ?? '').trim().toLowerCase()
  const normalizedOrderStatus = String(orderStatus ?? '').trim().toLowerCase()

  if (normalizedPowerStatus === 'online') {
    return {
      label: 'Online',
      powerState: true,
      statusCode: 'online',
      tone: 'success',
    }
  }

  if (normalizedPowerStatus === 'offline') {
    return {
      label: 'Offline',
      powerState: false,
      statusCode: 'active',
      tone: 'warning',
    }
  }

  if (normalizedOrderStatus === 'active') {
    return {
      label: 'Active',
      powerState: true,
      statusCode: 'active',
      tone: 'success',
    }
  }

  return {
    label: titleFromSlug(normalizedOrderStatus || 'active'),
    powerState: normalizedPowerStatus !== 'offline',
    statusCode: normalizedOrderStatus === 'online' ? 'online' : 'active',
    tone: normalizedOrderStatus === 'cancelled' ? 'danger' : 'warning',
  }
}

function mapActionHistoryItem(item) {
  const actionName = String(item?.button?.name ?? item?.action ?? 'Update').trim()
  const normalizedActionName = actionName.toLowerCase()

  return {
    id: `activity-${item?.id ?? actionName}-${item?.created_at ?? 'now'}`,
    action: actionName.toUpperCase(),
    actionCode:
      normalizedActionName === 'reinstall'
        ? 'rebuild'
        : normalizedActionName === 'restart'
          ? 'restart'
          : normalizedActionName === 'start'
            ? 'start'
            : normalizedActionName === 'stop'
              ? 'stop'
              : slugify(actionName),
    status: titleFromSlug(item?.status ?? 'delivered'),
    statusCode: String(item?.status ?? 'delivered').trim().toLowerCase() || 'delivered',
    tone: String(item?.status ?? '').trim().toLowerCase() === 'delivered' ? 'success' : 'warning',
    age: item?.created_at ?? 'Recently',
  }
}

function deriveConnectionType(ipv4Address, ipv6Address) {
  if (ipv4Address && ipv4Address !== 'n/a') {
    return {
      label: 'Dedicated IP',
      code: 'dedicatedIp',
    }
  }

  if (ipv6Address && ipv6Address !== 'n/a') {
    return {
      label: 'IPv6 Only',
      code: 'ipv6Only',
    }
  }

  return {
    label: 'Connection Unavailable',
    code: 'freeAccount',
  }
}

function buildDisplayTitle(product) {
  const detail = resolveProductDetail(product)
  const cpu = toNumber(detail?.cpu_core, 1)
  const memory = toNumber(detail?.memory_size, 1)
  const country = formatCityLabel(detail?.dc_country ?? 'Cloud')

  return `VPS-${country}-${cpu}C-${memory}GB`
}

function buildServerSummary(order, views = [], actions = [], pricingContext = null, options = {}) {
  const { allowStaticFallbacks = true } = options
  const product = getPrimaryProduct(order)
  const detail = resolveProductDetail(product)
  const completedView = getCompletedView(order, views)
  const addresses = extractAddressesFromView(completedView)
  const status = deriveStatus(order?.status, order?.power_status)
  const connection = deriveConnectionType(addresses.ipAddress, addresses.ipv6Address)
  const osTemplateField = findFieldByName(product, 'template')
  const defaultTemplate = osTemplateField?.options?.[0] ?? null
  const operatingSystem = defaultTemplate?.name ?? product?.title ?? ''
  const familyMeta = formatOsFamily(operatingSystem)
  const locationCountry = String(detail?.dc_country ?? '').trim()
  const locationCity = formatCityLabel(detail?.dc_city ?? '')
  const datacenterName = getCloudVpsProductDatacenterName(product)
  const infrastructureName = datacenterName || detail?.vm_type || readRuntimeBrandName()
  const billingPrice = convertHubAmount(
    toNumber(order?.renewal_price || order?.records?.[0]?.price || resolveMonthlyProductPrice(product), 0),
    pricingContext,
    2,
  )
  const hourlyPrice = convertHubAmount(
    toNumber(order?.records?.[0]?.hourly_price || resolveHourlyProductPrice(product), 0),
    pricingContext,
    4,
  )
  const trafficLimit = toNumber(product?.traffic_limit, 0)
  const availableButtons = flattenAvailableButtons(product)
  const displayTitle = buildDisplayTitle(product)
  const displayName = String(order?.note ?? '').trim() || displayTitle
  const cpuCores = toNumber(detail?.cpu_core, Number.NaN)
  const memorySize = toNumber(detail?.memory_size, Number.NaN)
  const diskSize = toNumber(detail?.disk_size, Number.NaN)
  const ipAddress = addresses.ipAddress === 'n/a' && !allowStaticFallbacks ? '' : addresses.ipAddress
  const ipv6Address = addresses.ipv6Address === 'n/a' && !allowStaticFallbacks ? '' : addresses.ipv6Address
  const installationProgress = toPercent(order?.installed)

  return {
    id: `srv-${order.id}`,
    orderId: order.id,
    productId: product?.id ?? null,
    name: displayName,
    managementName: displayName,
    type: 'Cloud VPS',
    typeCode: 'cloudVps',
    status: status.label,
    statusCode: status.statusCode,
    statusTone: status.tone,
    planLabel: titleFromSlug(detail?.cpu_type ?? product?.title ?? 'Cloud VPS'),
    planCode: slugify(detail?.cpu_type ?? product?.title ?? 'cloud-vps'),
    connection: connection.label,
    connectionCode: connection.code,
    createdAt: order?.started_at || order?.created_at || '',
    createdAgo: order?.created_at || order?.started_at || (allowStaticFallbacks ? 'Recently' : ''),
    location: {
      country: locationCountry || (allowStaticFallbacks ? 'Unknown' : ''),
      countryCode: slugify(locationCountry || 'unknown'),
      city: locationCity || (allowStaticFallbacks ? 'Unknown' : ''),
      cityCode: slugify(locationCity || 'unknown'),
      code: countryCodeFromName(locationCountry),
      datacenterName,
    },
    ipAddress,
    ipv6Address,
    operatingSystem,
    family: familyMeta.family,
    familyCode: familyMeta.familyCode,
    hourlyCost: hourlyPrice,
    monthlyCost: billingPrice,
    cpu: Number.isFinite(cpuCores) ? `${cpuCores} vCPU` : '',
    cpuSubtitle: detail?.cpu_type ?? '',
    ram: Number.isFinite(memorySize) ? `${memorySize} GB RAM` : '',
    storage: Number.isFinite(diskSize) ? `${diskSize} GB ${detail?.disk_type ?? 'SSD'}` : '',
    network: trafficLimit > 0 ? `${trafficLimit} GB` : (allowStaticFallbacks ? 'n/a' : ''),
    inboundUsed: allowStaticFallbacks ? 0 : null,
    installationProgress,
    outboundUsed: allowStaticFallbacks ? 0 : null,
    outboundLimit: trafficLimit,
    powerState: status.powerState,
    username: allowStaticFallbacks ? 'root' : '',
    password: order?.secret || (allowStaticFallbacks ? 'not-available' : ''),
    dataCenter: datacenterName || (allowStaticFallbacks ? 'n/a' : ''),
    datacenterName,
    infrastructure: infrastructureName,
    infrastructureCode: slugify(infrastructureName || 'caasify'),
    orderNumber: `#${order.id}`,
    totalExpenses: convertHubAmount(toNumber(order?.total_expenses, 0), pricingContext, 2),
    chartPoints: allowStaticFallbacks ? [0, 0, 0, 0, 0, 0] : [],
    activityLog: actions.map(mapActionHistoryItem),
    billingMode: order?.billing_mode ?? null,
    billingCycle: order?.billing_cycle ?? null,
    availableButtons,
    rawOrder: order,
    rawProduct: product,
  }
}

export function isServerOrder(order) {
  const product = getPrimaryProduct(order)
  const detail = resolveProductDetail(product)
  const type = String(order?.type ?? '').trim().toLowerCase()
  const title = String(product?.title ?? order?.note ?? '').trim().toLowerCase()

  if (!product) {
    return false
  }

  if (type === 'vpn' || type === 'host') {
    return false
  }

  if (title.includes('vpn') || title.includes('#vpn')) {
    return false
  }

  return Boolean(
    detail?.dc_country
      || detail?.cpu_core
      || detail?.vm_type
      || (product?.sections?.length ?? 0) > 0,
  )
}

export function mapOrdersToServers(orders = [], pricingContext = null) {
  return orders
    .filter(isServerOrder)
    .map((order) => buildServerSummary(order, [], [], pricingContext))
}

export function mapServerDetail(payload = {}, pricingContext = null) {
  const order = payload.order ?? null
  const views = payload.views ?? []
  const actions = payload.actions ?? []
  const statusPayload = payload.status ?? null
  const trafficPayload = payload.traffic ?? null

  if (!order) {
    return null
  }

  const server = buildServerSummary(order, views, actions, pricingContext, {
    allowStaticFallbacks: false,
  })
  const status = String(statusPayload?.status ?? order?.power_status ?? '').trim().toLowerCase()
  const updatedStatus = deriveStatus(order?.status, status || order?.power_status)
  const hasTrafficPayload =
    trafficPayload
    && typeof trafficPayload === 'object'
    && trafficPayload.message === undefined
  const inboundUsed = hasTrafficPayload
    ? toRoundedNumber(toNumber(trafficPayload?.inbound, 0) / 1024 / 1024 / 1024, 2)
    : null
  const outboundUsed = hasTrafficPayload
    ? toRoundedNumber(toNumber(trafficPayload?.outbound, 0) / 1024 / 1024 / 1024, 2)
    : null

  return {
    ...server,
    status: updatedStatus.label,
    statusCode: updatedStatus.statusCode,
    statusTone: updatedStatus.tone,
    powerState: updatedStatus.powerState,
    inboundUsed,
    outboundUsed,
    chartPoints:
      inboundUsed !== null && outboundUsed !== null
        ? [0, 0, inboundUsed / 3, inboundUsed / 2, outboundUsed / 2, outboundUsed]
        : [],
  }
}

export function getServerProvisioningStatus(server) {
  if (!server) {
    return {
      currentStep: 1,
      isReady: false,
      isProvisioning: true,
      steps: [],
    }
  }

  const rawOrder = server.rawOrder ?? null
  const normalizedOrderStatus = String(rawOrder?.status ?? server.statusCode ?? '').trim().toLowerCase()
  const installationProgress = toPercent(rawOrder?.installed ?? server.installationProgress)
  const hasInstallationProgress = installationProgress !== null
  const installationComplete = hasInstallationProgress && installationProgress >= 100
  const networkReady =
    hasCompletedView(rawOrder, rawOrder?.views ?? [])
    || (server.ipAddress && server.ipAddress !== 'n/a')
    || (server.ipv6Address && server.ipv6Address !== 'n/a')
  const readyForUse =
    installationComplete
    && networkReady
    && (normalizedOrderStatus === 'active' || normalizedOrderStatus === 'online')
  const steps = [
    {
      key: 'order',
      complete: Boolean(server.orderId ?? rawOrder?.id ?? server.id),
    },
    {
      key: 'setup',
      complete: hasInstallationProgress
        ? installationComplete
        : String(rawOrder?.setup?.status ?? '').trim().toLowerCase() === 'delivered',
    },
    {
      key: 'network',
      complete: networkReady,
    },
    {
      key: 'online',
      complete: readyForUse,
    },
  ]
  const nextStepIndex = steps.findIndex((step) => !step.complete)
  const isReady = nextStepIndex === -1

  return {
    currentStep: isReady ? steps.length + 1 : nextStepIndex + 1,
    installationProgress,
    isReady,
    isProvisioning: !isReady,
    steps,
  }
}

export function mapProfileToUser(profile, fallbackUser) {
  const fullName = profile?.name ? String(profile.name).trim() : fallbackUser.fullName
  const parts = fullName.split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map((part) => {
    const text = String(part ?? '').trim()

    if (!text) {
      return ''
    }

    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      const segment = segmenter.segment(text).containing(0)

      return segment?.segment ?? text.slice(0, 1)
    }

    return text.slice(0, 1)
  }).join('') || fallbackUser.initials

  return {
    ...fallbackUser,
    name: parts[0] ?? fallbackUser.name,
    fullName,
    email: profile?.email ? String(profile.email).trim() : fallbackUser.email,
    initials,
  }
}

function findCountryItems(countryPayload) {
  const termGroups = countryPayload?.data ?? []
  const countries = []

  for (const group of termGroups) {
    if (Array.isArray(group?.countries)) {
      countries.push(...group.countries.filter((country) => country && typeof country === 'object'))
      continue
    }

    if (String(group?.name ?? '').trim().toLowerCase() !== 'country') {
      continue
    }

    countries.push(...(Array.isArray(group?.terms) ? group.terms : []))
  }

  return countries
}

export function mapCountriesToDeployLocations(countryPayload) {
  return findCountryItems(countryPayload).map((term) => {
    const countryName = String(term?.name ?? '').trim() || 'Unknown'
    const countryCode = countryCodeFromName(countryName)

    return {
      id: `country-${term.id}`,
      termId: term.id,
      country: countryName,
      countryCode: slugify(countryName),
      city: countryName,
      cityCode: slugify(countryName),
      code: countryCode,
      emoji: getCountryFlagEmoji(countryName),
      label: countryName,
    }
  })
}

export const mapTermsToDeployLocations = mapCountriesToDeployLocations

export function mapBillingOptions(product, pricingContext = null) {
  const billingOptions = product?.billing_options ?? []
  const billingLabelKeys = {
    hourly: 'deploy.billing.hourly',
    '1-month': 'deploy.billing.oneMonth',
    '3-month': 'deploy.billing.threeMonths',
    '6-month': 'deploy.billing.sixMonths',
    '12-month': 'deploy.billing.twelveMonths',
  }
  const billingDiscountKeys = {
    3: 'deploy.billing.discount3',
    5: 'deploy.billing.discount5',
    7: 'deploy.billing.discount7',
    10: 'deploy.billing.discount10',
  }

  return billingOptions.map((option) => {
    const isHourly = String(option?.mode ?? '').trim().toLowerCase() === 'hourly'
    const cycle = option?.cycle ? `${option.cycle}-month` : 'hourly'
    const rawPrice = toNumber(option?.price, 0)
    const price = convertHubAmount(rawPrice, pricingContext, isHourly ? 4 : 2)
    const discountPercent = toNumber(option?.discount_percent, 0)
    const labelKey = billingLabelKeys[cycle] ?? null
    const badgeKey = billingDiscountKeys[discountPercent] ?? null

    return {
      id: cycle,
      label: option?.label ?? (isHourly ? 'Hourly' : `${option?.cycle} Months`),
      labelKey,
      total: price,
      badge: discountPercent > 0 ? `${discountPercent}% OFF` : null,
      badgeKey,
      cycle: option?.cycle ?? null,
      durationHours: toNumber(option?.duration_hours, 0),
      discountPercent,
      mode: option?.mode ?? 'hourly',
      price,
    }
  })
}

export function mapOperatingSystems(product, featureFlags = null) {
  const { enableVpn } = normalizeFeatureFlags(featureFlags)
  const templateField = findFieldByName(product, 'template')
  const options = templateField?.options ?? []

  return options
    .filter((option) => enableVpn || !isTrojanTemplateName(option?.name))
    .map((option) => {
      const familyMeta = formatOsFamily(option?.name)

      return {
        id: `template-${option.id}`,
        fieldId: templateField?.id ?? null,
        fieldKey: String(templateField?.label ?? templateField?.name ?? 'Template').trim() || 'Template',
        optionId: option.id,
        optionValue: option.value,
        title: String(option?.name ?? 'Template').replace(/\s+64(\s*bit)?$/i, '').trim(),
        subtitle: /\b64\b/i.test(option?.name ?? '') ? '64-bit' : 'Template',
        subtitleKey: /\b64\b/i.test(option?.name ?? '') ? 'common.bits64' : null,
        family: familyMeta.family,
        familyCode: familyMeta.familyCode,
        icon: familyMeta.icon,
        rawOption: option,
      }
    })
}

function resolveNetworkField(product, fieldName, pricingContext = null) {
  const field = findFieldByName(product, fieldName)
  const yesOption = findOptionByBooleanValue(field, true)
  const noOption = findOptionByBooleanValue(field, false)

  const mappedYesOption = yesOption
    ? {
        ...yesOption,
        price: convertHubAmount(toNumber(yesOption.price, 0), pricingContext, 2),
      }
    : null
  const mappedNoOption = noOption
    ? {
        ...noOption,
        price: convertHubAmount(toNumber(noOption.price, 0), pricingContext, 2),
      }
    : null

  return {
    field,
    yesOption: mappedYesOption,
    noOption: mappedNoOption,
    supported: Boolean(field && (mappedYesOption || mappedNoOption)),
    required: Boolean(field && mappedYesOption && !mappedNoOption),
  }
}

function buildPlanCityVariant(plan) {
  return {
    productId: plan.productId,
    city: plan.location.city,
    cityCode: plan.location.cityCode,
    datacenterName: plan.location.datacenterName,
    location: plan.location,
    defaultBillingId: plan.defaultBillingId,
    defaultSystemId: plan.defaultSystemId,
    billingOptions: plan.billingOptions,
    operatingSystems: plan.operatingSystems,
    ipv4Config: plan.ipv4Config,
    ipv6Config: plan.ipv6Config,
    rawProduct: plan.rawProduct,
  }
}

function createDeployPlanGroupKey(plan) {
  return JSON.stringify({
    cpu: plan.cpu,
    ram: plan.ram,
    disk: plan.disk,
    net: plan.net,
    monthly: plan.monthly,
    hourly: plan.hourly,
    summaryDisk: plan.summaryDisk,
    billingOptions: plan.billingOptions.map((option) => ({
      label: option.label,
      total: option.total,
      cycle: option.cycle,
      mode: option.mode,
      discountPercent: option.discountPercent,
      durationHours: option.durationHours,
    })),
    operatingSystems: plan.operatingSystems.map((system) => ({
      title: system.title,
      subtitle: system.subtitle,
      familyCode: system.familyCode,
      icon: system.icon,
    })),
    ipv4: {
      supported: plan.ipv4Config.supported,
      required: plan.ipv4Config.required,
      yesPrice: toNumber(plan.ipv4Config.yesOption?.price, 0),
      yesValue: plan.ipv4Config.yesOption?.value ?? null,
      noValue: plan.ipv4Config.noOption?.value ?? null,
    },
    ipv6: {
      supported: plan.ipv6Config.supported,
      required: plan.ipv6Config.required,
      yesPrice: toNumber(plan.ipv6Config.yesOption?.price, 0),
      yesValue: plan.ipv6Config.yesOption?.value ?? null,
      noValue: plan.ipv6Config.noOption?.value ?? null,
    },
  })
}

function compareDeployPlansByPrice(leftPlan, rightPlan) {
  const monthlyDifference = toNumber(leftPlan?.monthly, 0) - toNumber(rightPlan?.monthly, 0)

  if (monthlyDifference !== 0) {
    return monthlyDifference
  }

  const hourlyDifference = toNumber(leftPlan?.hourly, 0) - toNumber(rightPlan?.hourly, 0)

  if (hourlyDifference !== 0) {
    return hourlyDifference
  }

  return String(leftPlan?.title ?? '').localeCompare(String(rightPlan?.title ?? ''))
}

function createGroupedDeployPlan(plan) {
  const primaryVariant = buildPlanCityVariant(plan)

  return {
    ...plan,
    primaryCity: primaryVariant.city,
    primaryCityCode: primaryVariant.cityCode,
    cities: [],
    cityCodes: [],
    cityVariants: [primaryVariant],
  }
}

function appendDeployPlanCityVariant(groupedPlan, plan) {
  const nextVariant = buildPlanCityVariant(plan)

  if (groupedPlan.cityVariants.some((variant) => variant.cityCode === nextVariant.cityCode)) {
    return groupedPlan
  }

  return {
    ...groupedPlan,
    cities: [...groupedPlan.cities, nextVariant.city],
    cityCodes: [...groupedPlan.cityCodes, nextVariant.cityCode],
    cityVariants: [...groupedPlan.cityVariants, nextVariant],
  }
}

function getPlanCityVariants(plan) {
  if (plan.cityVariants?.length) {
    return plan.cityVariants
  }

  if (!plan.primaryCityCode) {
    return []
  }

  return [
    {
      ...buildPlanCityVariant(plan),
      city: plan.primaryCity,
      cityCode: plan.primaryCityCode,
      location: {
        ...plan.location,
        city: plan.primaryCity,
        cityCode: plan.primaryCityCode,
      },
    },
    ...plan.cityCodes.map((cityCode, index) => ({
      ...buildPlanCityVariant(plan),
      city: plan.cities[index] ?? titleFromSlug(cityCode),
      cityCode,
      location: {
        ...plan.location,
        city: plan.cities[index] ?? titleFromSlug(cityCode),
        cityCode,
      },
    })),
  ]
}

export function getPlanCityOptions(plan) {
  if (plan?.cityVariants?.length) {
    return plan.cityVariants.map((variant, index) => ({
      cityCode: variant.cityCode,
      cityLabel: variant.city,
      datacenterName: variant.datacenterName ?? variant.location?.datacenterName ?? '',
      primary: index === 0,
    }))
  }

  return [
    {
      cityCode: plan?.primaryCityCode ?? '',
      cityLabel: plan?.primaryCity ?? '',
      datacenterName: plan?.location?.datacenterName ?? '',
      primary: true,
    },
    ...((plan?.cityCodes ?? []).map((cityCode, index) => ({
      cityCode,
      cityLabel: plan?.cities?.[index] ?? cityCode,
      datacenterName: plan?.location?.datacenterName ?? '',
      primary: false,
    }))),
  ].filter((option) => option.cityCode)
}

export function resolveDeployPlanOffer(plan, preferredCityCode = '') {
  if (!plan) {
    return null
  }

  const cityVariants = getPlanCityVariants(plan)

  if (cityVariants.length === 0) {
    return plan
  }

  const resolvedVariant =
    cityVariants.find((variant) => variant.cityCode === preferredCityCode)
    ?? cityVariants[0]

  return {
    ...plan,
    productId: resolvedVariant.productId,
    location: resolvedVariant.location,
    defaultBillingId: resolvedVariant.defaultBillingId,
    defaultSystemId: resolvedVariant.defaultSystemId,
    billingOptions: resolvedVariant.billingOptions,
    operatingSystems: resolvedVariant.operatingSystems,
    ipv4Config: resolvedVariant.ipv4Config,
    ipv6Config: resolvedVariant.ipv6Config,
    rawProduct: resolvedVariant.rawProduct,
  }
}

export function getNetworkCharge(selectedBilling, optionPrice, billingOptions = []) {
  const numericOptionPrice = toNumber(optionPrice, 0)

  if (numericOptionPrice <= 0 || !selectedBilling) {
    return 0
  }

  const monthlyOption = billingOptions.find((option) => option.id === '1-month')

  if (!monthlyOption || monthlyOption.total <= 0) {
    return selectedBilling.id === 'hourly'
      ? toRoundedNumber(numericOptionPrice / 640, 4)
      : toRoundedNumber(numericOptionPrice, 2)
  }

  const ratio = selectedBilling.total / monthlyOption.total
  const price = numericOptionPrice * ratio

  return selectedBilling.id === 'hourly'
    ? Number(price.toFixed(4))
    : Number(price.toFixed(2))
}

export function buildDeployPlan(product, pricingContext = null, featureFlags = null) {
  const detail = resolveProductDetail(product)
  const locationCountry = detail?.dc_country ?? 'Unknown'
  const locationCity = formatCityLabel(detail?.dc_city ?? 'Unknown')
  const datacenterName = getCloudVpsProductDatacenterName(product)
  const cpu = String(toNumber(detail?.cpu_core, 1))
  const ram = `${toNumber(detail?.memory_size, 1)} GB`
  const disk = `${toNumber(detail?.disk_size, 0)} GB`
  const trafficLimit = toNumber(product?.traffic_limit, 0)
  const billingOptions = mapBillingOptions(product, pricingContext)
  const operatingSystems = mapOperatingSystems(product, featureFlags)
  const ipv4Config = resolveNetworkField(product, 'ipv4', pricingContext)
  const ipv6Config = resolveNetworkField(product, 'ipv6', pricingContext)
  const defaultBilling = billingOptions[0] ?? null
  const defaultSystem = operatingSystems[0] ?? null

  return {
    id: `plan-${product.id}`,
    productId: product.id,
    title: buildDisplayTitle(product),
    titleKey: null,
    cpu,
    ram,
    disk,
    net: trafficLimit > 0 ? `${trafficLimit} GB` : 'n/a',
    monthly: convertHubAmount(resolveMonthlyProductPrice(product), pricingContext, 2),
    hourly: convertHubAmount(resolveHourlyProductPrice(product), pricingContext, 4).toFixed(4),
    primaryCity: locationCity,
    primaryCityCode: slugify(locationCity),
    cities: [],
    cityCodes: [],
    summarySpecs: `${cpu} vCPU • ${ram} RAM`,
    summaryDisk: `${disk} ${detail?.disk_type ?? 'SSD'}`,
    location: {
      country: locationCountry,
      countryCode: slugify(locationCountry),
      city: locationCity,
      cityCode: slugify(locationCity),
      code: countryCodeFromName(locationCountry),
      datacenterName,
    },
    defaultBillingId: defaultBilling?.id ?? 'hourly',
    defaultSystemId: defaultSystem?.id ?? '',
    billingOptions,
    operatingSystems,
    ipv4Config,
    ipv6Config,
    rawProduct: product,
  }
}

export function mapProductsToDeployPlans(
  productsPayload,
  pricingContext = null,
  cloudVpsConfig = null,
  featureFlags = null,
) {
  const groupedPlans = new Map()

  for (const product of productsPayload?.data ?? []) {
    if (isCloudVpsProductHidden(product, cloudVpsConfig)) {
      continue
    }

    if (isVpnProduct(product, featureFlags)) {
      continue
    }

    const plan = buildDeployPlan(product, pricingContext, featureFlags)

    if (plan.operatingSystems.length === 0) {
      continue
    }

    const planGroupKey = createDeployPlanGroupKey(plan)
    const existingPlan = groupedPlans.get(planGroupKey)

    if (!existingPlan) {
      groupedPlans.set(planGroupKey, createGroupedDeployPlan(plan))
      continue
    }

    groupedPlans.set(planGroupKey, appendDeployPlanCityVariant(existingPlan, plan))
  }

  return Array.from(groupedPlans.values()).sort(compareDeployPlansByPrice)
}

export function createInitialDeployDraft(locations = []) {
  const firstLocation = locations[0] ?? null

  return {
    locationId: firstLocation?.id ?? '',
    locationTermId: firstLocation?.termId ?? null,
    planId: '',
    productId: null,
    planCityCode: firstLocation?.cityCode ?? '',
    billingDurationId: 'hourly',
    operatingSystemId: '',
    ipv4Enabled: false,
    ipv6Enabled: false,
    serverName: '',
    serverNameAuto: true,
  }
}

export function applyPlanDefaultsToDraft(
  currentDraft,
  plan,
  preferredCityCode = '',
  { preserveSelections = false } = {},
) {
  if (!plan) {
    return currentDraft
  }

  const resolvedPlan = resolveDeployPlanOffer(
    plan,
    preferredCityCode || currentDraft.planCityCode,
  )
  const ipv4Selected = Boolean(resolvedPlan.ipv4Config.required || resolvedPlan.ipv4Config.yesOption)
  const ipv6Selected = Boolean(resolvedPlan.ipv6Config.required || resolvedPlan.ipv6Config.yesOption)
  const billingDurationId =
    preserveSelections
      && resolvedPlan.billingOptions.some((option) => option.id === currentDraft.billingDurationId)
      ? currentDraft.billingDurationId
      : resolvedPlan.defaultBillingId
  const operatingSystemId =
    preserveSelections
      && resolvedPlan.operatingSystems.some((system) => system.id === currentDraft.operatingSystemId)
      ? currentDraft.operatingSystemId
      : resolvedPlan.defaultSystemId
  const ipv4Enabled = resolvedPlan.ipv4Config.required
    ? true
    : resolvedPlan.ipv4Config.supported
      ? preserveSelections
        ? Boolean(currentDraft.ipv4Enabled)
        : ipv4Selected
      : false
  const ipv6Enabled = resolvedPlan.ipv6Config.required
    ? true
    : resolvedPlan.ipv6Config.supported
      ? preserveSelections
        ? Boolean(currentDraft.ipv6Enabled)
        : ipv6Selected
      : false
  const shouldRefreshServerName = !currentDraft.serverName || currentDraft.serverNameAuto

  return {
    ...currentDraft,
    planId: plan.id,
    productId: resolvedPlan.productId,
    planCityCode: resolvedPlan.location.cityCode,
    billingDurationId,
    operatingSystemId,
    ipv4Enabled,
    ipv6Enabled,
    serverName: shouldRefreshServerName ? resolvedPlan.title : currentDraft.serverName,
    serverNameAuto: shouldRefreshServerName,
  }
}

export function buildCreateOrderPayload(plan, draft) {
  if (!plan) {
    return {}
  }

  function assignFieldValue(fieldKey, optionValue) {
    const normalizedFieldKey = String(fieldKey ?? '').trim()

    if (!normalizedFieldKey || optionValue === null || optionValue === undefined) {
      return
    }

    payload[normalizedFieldKey] = optionValue
  }

  const billingOption = plan.billingOptions.find((option) => option.id === draft.billingDurationId) ?? plan.billingOptions[0] ?? null
  const operatingSystem = plan.operatingSystems.find((option) => option.id === draft.operatingSystemId) ?? plan.operatingSystems[0] ?? null
  const payload = {
    product_id: plan.productId,
    note: draft.serverName || plan.title,
  }

  if (billingOption) {
    payload.mode = billingOption.mode
    payload.billing_mode = billingOption.mode

    if (billingOption.cycle !== null && billingOption.cycle !== undefined) {
      payload.cycle = billingOption.cycle
      payload.billing_cycle = billingOption.cycle
    }
  }

  if (operatingSystem?.fieldKey && operatingSystem.optionValue !== null && operatingSystem.optionValue !== undefined) {
    assignFieldValue(operatingSystem.fieldKey, operatingSystem.optionValue)
  }

  if (plan.ipv4Config.field) {
    const ipv4Option = draft.ipv4Enabled
      ? plan.ipv4Config.yesOption
      : plan.ipv4Config.noOption

    assignFieldValue(plan.ipv4Config.field.label ?? plan.ipv4Config.field.name, ipv4Option?.value)
  }

  if (plan.ipv6Config.field) {
    const ipv6Option = draft.ipv6Enabled
      ? plan.ipv6Config.yesOption
      : plan.ipv6Config.noOption

    assignFieldValue(plan.ipv6Config.field.label ?? plan.ipv6Config.field.name, ipv6Option?.value)
  }

  return payload
}
