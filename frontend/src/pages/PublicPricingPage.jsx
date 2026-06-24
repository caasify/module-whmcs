import {
  ArrowRight,
  Check,
  ChevronDown,
  Cpu,
  HardDrive,
  MapPin,
  Network,
  SlidersHorizontal,
  Zap,
} from '@/components/icons'
import { useEffect, useState } from 'react'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { cn } from '../lib/cn'
import { filterLocationsByCloudVpsConfig } from '../lib/cloudVpsConfig'
import { dashboardWhmcsApi } from '../lib/dashboardWhmcsApi'
import { getDeployCurrencyFormatOptions } from '../lib/deployPricing'
import { translateDatacenterName } from '../lib/locationDisplay'
import { getPlanCityOptions, mapCountriesToDeployLocations, mapProductsToDeployPlans } from '../lib/services/server'

const EMPTY_CATALOG = {
  metricScales: {
    cpu: [0],
    memory: [0],
    storage: [0],
    traffic: [0],
  },
  plans: [],
}

const PUBLIC_PRICING_REGION_GROUPS = [
  {
    id: 'northAmerica',
    label: 'North America',
    labelKey: 'publicPricing.region.northAmerica',
    countryCodes: ['usa', 'canada', 'mexico'],
  },
  {
    id: 'southAmerica',
    label: 'South America',
    labelKey: 'publicPricing.region.southAmerica',
    countryCodes: ['brazil'],
  },
  {
    id: 'europe',
    label: 'Europe',
    labelKey: 'publicPricing.region.europe',
    countryCodes: ['france', 'germany', 'netherlands', 'spain', 'sweden', 'unitedKingdom', 'finland'],
  },
  {
    id: 'asiaOceania',
    label: 'Asia & Oceania',
    labelKey: 'publicPricing.region.asiaOceania',
    countryCodes: ['australia', 'india', 'indonesia', 'japan', 'singapore', 'southKorea', 'turkey', 'unitedArabEmirates'],
  },
  {
    id: 'africa',
    label: 'Africa',
    labelKey: 'publicPricing.region.africa',
    countryCodes: ['southAfrica'],
  },
]

const PUBLIC_PRICING_COUNTRY_TRANSLATION_KEY_ALIASES = {
  unitedArabEmirates: 'uae',
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function getPublicPricingUnitLabel(t, unit) {
  return t(`publicPricing.unit.${unit}`, undefined, unit.toUpperCase())
}

function getCpuValue(plan) {
  return toNumber(plan?.cpu, 0)
}

function getMemoryValue(plan) {
  const rawMemory = String(plan?.ram ?? '').trim()
  const numericValue = toNumber(rawMemory.replace(/[^0-9.]/g, ''), 0)

  if (/mb/i.test(rawMemory) && !/gb/i.test(rawMemory)) {
    return numericValue / 1024
  }

  return numericValue
}

function getStorageValue(plan) {
  const rawStorage = String(plan?.disk ?? '').trim()
  const numericValue = toNumber(rawStorage.replace(/[^0-9.]/g, ''), 0)

  if (/tb/i.test(rawStorage)) {
    return numericValue * 1024
  }

  return numericValue
}

function getTrafficValue(plan) {
  const rawTraffic = String(plan?.net ?? '').trim()
  const numericValue = toNumber(rawTraffic.replace(/[^0-9.]/g, ''), 0)

  if (/tb/i.test(rawTraffic)) {
    return numericValue * 1024
  }

  return numericValue
}

function buildMetricScale(plans, resolveValue) {
  const values = [...new Set(
    plans
      .map((plan) => resolveValue(plan))
      .filter((value) => Number.isFinite(value) && value > 0),
  )].sort((left, right) => left - right)

  return values.length > 0 ? [0, ...values] : [0]
}

function formatNumericValue(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function formatMemoryMetricValue(value, t) {
  if (!(value > 0)) {
    return 'All'
  }

  if (value < 1) {
    return `${Math.round(value * 1024)} ${getPublicPricingUnitLabel(t, 'mb')}`
  }

  return `${formatNumericValue(value)} ${getPublicPricingUnitLabel(t, 'gb')}`
}

function formatTrafficMetricValue(value, t) {
  if (!(value > 0)) {
    return 'All'
  }

  if (value >= 1024) {
    return `${formatNumericValue(value / 1024)} ${getPublicPricingUnitLabel(t, 'tb')}`
  }

  return `${formatNumericValue(value)} ${getPublicPricingUnitLabel(t, 'gb')}`
}

function formatMetricScaleValue(kind, value, t) {
  if (!(value > 0)) {
    return 'All'
  }

  if (kind === 'cpu') {
    return `${formatNumericValue(value)} ${getPublicPricingUnitLabel(t, 'core')}`
  }

  if (kind === 'memory') {
    return formatMemoryMetricValue(value, t)
  }

  if (kind === 'storage') {
    return `${formatNumericValue(value)} ${getPublicPricingUnitLabel(t, 'gb')}`
  }

  if (kind === 'traffic') {
    return formatTrafficMetricValue(value, t)
  }

  return formatNumericValue(value)
}

function formatPlanCpu(value, t) {
  return `${formatNumericValue(value)} ${getPublicPricingUnitLabel(t, 'core')}`
}

function formatPlanMemory(value, t) {
  const rawValue = String(value ?? '').trim()
  const numericValue = toNumber(rawValue.replace(/[^0-9.]/g, ''), 0)

  if (/mb/i.test(rawValue) && !/gb/i.test(rawValue)) {
    return `${Math.round(numericValue)} ${getPublicPricingUnitLabel(t, 'mb')}`
  }

  if (/gb/i.test(rawValue)) {
    return numericValue > 0 && numericValue < 1
      ? `${Math.round(numericValue * 1024)} ${getPublicPricingUnitLabel(t, 'mb')}`
      : `${formatNumericValue(numericValue)} ${getPublicPricingUnitLabel(t, 'gb')}`
  }

  return rawValue || 'n/a'
}

function formatPlanStorage(value, t) {
  const rawValue = String(value ?? '').trim()
  const numericValue = toNumber(rawValue.replace(/[^0-9.]/g, ''), 0)

  if (/tb/i.test(rawValue)) {
    return `${formatNumericValue(numericValue)} ${getPublicPricingUnitLabel(t, 'tb')}`
  }

  if (/gb/i.test(rawValue)) {
    return `${formatNumericValue(numericValue)} ${getPublicPricingUnitLabel(t, 'gb')}`
  }

  return rawValue || 'n/a'
}

function formatPlanTraffic(value, t) {
  const rawValue = String(value ?? '').trim()
  const numericValue = toNumber(rawValue.replace(/[^0-9.]/g, ''), 0)

  if (/tb/i.test(rawValue)) {
    return `${formatNumericValue(numericValue)} ${getPublicPricingUnitLabel(t, 'tb')}`
  }

  if (/gb/i.test(rawValue)) {
    return `${formatNumericValue(numericValue)} ${getPublicPricingUnitLabel(t, 'gb')}`
  }

  return rawValue || 'n/a'
}

function matchesCountryFilter(plan, selectedCountryCode) {
  if (!selectedCountryCode) {
    return true
  }

  const planCountries = (plan?.cityVariants?.length ? plan.cityVariants : [{ location: plan.location }])
    .map((variant) => String(variant?.location?.countryCode ?? '').trim())
    .filter(Boolean)

  return planCountries.some((countryCode) => countryCode === selectedCountryCode)
}

function buildCountryCatalog(productsPayload, pricingContext, cloudVpsConfig, selectedCountryCode) {
  const plans = mapProductsToDeployPlans(productsPayload, pricingContext, cloudVpsConfig)
    .filter((plan) => matchesCountryFilter(plan, selectedCountryCode))

  return {
    metricScales: {
      cpu: buildMetricScale(plans, getCpuValue),
      memory: buildMetricScale(plans, getMemoryValue),
      storage: buildMetricScale(plans, getStorageValue),
      traffic: buildMetricScale(plans, getTrafficValue),
    },
    plans,
  }
}

function getPublicCountryTranslationKey(location) {
  const countryCode = String(location?.countryCode ?? '').trim()

  return PUBLIC_PRICING_COUNTRY_TRANSLATION_KEY_ALIASES[countryCode] ?? countryCode
}

function getPublicCountryLabel(location, t) {
  return t(
    `locations.country.${getPublicCountryTranslationKey(location)}`,
    undefined,
    location?.label ?? location?.country ?? 'Unknown',
  )
}

function getPublicCityLabel(cityCode, fallbackLabel, t) {
  return t(`locations.city.${cityCode}`, undefined, fallbackLabel)
}

function buildPublicCountrySections(locations, t) {
  const locationByCountryCode = new Map(
    locations.map((location) => [String(location.countryCode ?? '').trim(), location]),
  )
  const usedCountryCodes = new Set()
  const sections = []

  for (const group of PUBLIC_PRICING_REGION_GROUPS) {
    const sectionLocations = group.countryCodes
      .map((countryCode) => locationByCountryCode.get(countryCode))
      .filter(Boolean)

    if (sectionLocations.length === 0) {
      continue
    }

    const sortedSectionLocations = [...sectionLocations].sort((left, right) =>
      getPublicCountryLabel(left, t).localeCompare(getPublicCountryLabel(right, t)),
    )

    for (const location of sortedSectionLocations) {
      usedCountryCodes.add(location.countryCode)
    }

    sections.push({
      id: group.id,
      label: t(group.labelKey, undefined, group.label),
      locations: sortedSectionLocations,
    })
  }

  const remainingLocations = locations
    .filter((location) => !usedCountryCodes.has(location.countryCode))
    .sort((left, right) => getPublicCountryLabel(left, t).localeCompare(getPublicCountryLabel(right, t)))

  if (remainingLocations.length > 0) {
    sections.push({
      id: 'other',
      label: t('locations.region.other', undefined, 'Other'),
      locations: remainingLocations,
    })
  }

  return sections
}

function FilterControl({
  disabled = false,
  icon: Icon,
  id,
  label,
  localizeDigits,
  onChange,
  scale,
  t,
  valueIndex,
}) {
  const currentValue = scale[valueIndex] ?? scale[0] ?? 0

  return (
    <div className="border-b border-[var(--color-border-soft)] pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-[var(--color-muted)]" strokeWidth={2} />
          <span className="type-label-sm text-[var(--color-copy)]">{label}</span>
        </div>
        <span className="type-label-sm rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[var(--color-primary)]">
          {currentValue > 0
            ? localizeDigits(formatMetricScaleValue(id, currentValue, t))
            : t('publicPricing.filter.all', undefined, 'All')}
        </span>
      </div>

      <input
        className="public-pricing-range mt-3 w-full"
        disabled={disabled}
        max={Math.max(scale.length - 1, 0)}
        min={0}
        step={1}
        type="range"
        value={valueIndex}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

function CountryRow({ active, label, onClick }) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-2.5 rounded-[14px] px-2 py-1.5 text-start transition',
        active ? 'text-[var(--color-primary)]' : 'text-[var(--color-copy)] hover:text-[var(--color-primary)]',
      )}
      type="button"
      onClick={onClick}
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition',
          active
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--button-primary-text)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-transparent',
        )}
      >
        <Check className="h-3 w-3" strokeWidth={2.6} />
      </span>
      <span className="type-body-sm-strong">{label}</span>
    </button>
  )
}

function CountrySelectionCard({ emoji, label, onClick }) {
  return (
    <button
      className="public-pricing-glass public-pricing-glass-interactive flex w-full items-center gap-3 rounded-[20px] border border-[var(--color-border-soft)] px-4 py-4 text-start shadow-[0_20px_42px_-34px_rgba(36,62,124,0.28)]"
      type="button"
      onClick={onClick}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <span aria-hidden="true" className="type-symbol-lg">
          {emoji || '🌍'}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="type-body-strong block text-[var(--color-ink)]">{label}</span>
      </span>

      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-primary)]" strokeWidth={2.2} />
    </button>
  )
}

function OfferMetric({ icon: Icon, label, localizeDigits, value }) {
  return (
    <div className="rounded-[18px] border border-[var(--color-border-soft)] bg-[color-mix(in_srgb,var(--color-surface)_96%,transparent)] px-4 py-3.5 shadow-[0_16px_30px_-28px_rgba(36,62,124,0.42)]">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="type-label-sm text-[var(--color-muted)]">{label}</span>
      </div>
      <p className="type-body-strong mt-2 text-[var(--color-ink)]">{localizeDigits(value)}</p>
    </div>
  )
}

function OfferCard({
  cloudVpsConfig,
  formatCurrency,
  loginUrl,
  localizeDigits,
  plan,
  t,
}) {
  const cityOptions = getPlanCityOptions(plan).slice(0, 4)
  const monthlyBilling = plan.billingOptions.find((option) => option.id === '1-month') ?? null
  const monthlyPrice = toNumber(monthlyBilling?.total ?? plan.monthly, 0)

  return (
    <SurfaceCard className="public-pricing-glass rounded-[24px] border-[var(--color-border-soft)] p-5 shadow-[0_26px_60px_-42px_rgba(36,62,124,0.34)]" padded={false}>
      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <OfferMetric
            icon={Cpu}
            label={t('publicPricing.metric.cpu', undefined, t('deploy.plan.cpu', undefined, 'CPU'))}
            localizeDigits={localizeDigits}
            value={formatPlanCpu(getCpuValue(plan), t)}
          />
          <OfferMetric
            icon={Zap}
            label={t('publicPricing.metric.ram', undefined, t('deploy.plan.ram', undefined, 'RAM'))}
            localizeDigits={localizeDigits}
            value={formatPlanMemory(plan.ram, t)}
          />
          <OfferMetric
            icon={Network}
            label={t('deploy.plan.net', undefined, 'Traffic')}
            localizeDigits={localizeDigits}
            value={formatPlanTraffic(plan.net, t)}
          />
          <OfferMetric
            icon={HardDrive}
            label={t('deploy.plan.disk', undefined, 'Storage')}
            localizeDigits={localizeDigits}
            value={formatPlanStorage(plan.summaryDisk || plan.disk, t)}
          />
        </div>

        {cityOptions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {cityOptions.map((cityOption) => (
              <span
                key={`${plan.id}-${cityOption.cityCode}`}
                className="rounded-[10px] border border-[var(--color-border-soft)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-3 py-1.5 type-label-sm text-[var(--color-copy)]"
              >
                {cloudVpsConfig.displayDatacenterName && cityOption.datacenterName
                  ? `${getPublicCityLabel(cityOption.cityCode, cityOption.cityLabel, t)} • ${translateDatacenterName(t, cityOption.datacenterName)}`
                  : getPublicCityLabel(cityOption.cityCode, cityOption.cityLabel, t)}
              </span>
            ))}
          </div>
        ) : null}

        <div className="public-pricing-cta-row mt-5">
          <a
            className="public-pricing-plan-button flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[12px] border border-transparent bg-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-surface)_78%)] px-4 type-button text-[var(--color-copy)] transition hover:bg-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-surface)_72%)] whitespace-nowrap"
            href={loginUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>{t('publicPricing.selectPlan', undefined, 'Select Plan')}</span>
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </a>

          <div className="public-pricing-price-column dir-ltr shrink-0 text-end">
            <div className="flex items-end justify-end gap-1">
              <span className="public-pricing-price whitespace-nowrap text-[var(--color-ink)]">
                {formatCurrency(monthlyPrice)}
              </span>
              <span className="public-pricing-price-unit pb-0.5 text-[var(--color-copy)]">
                {t('publicPricing.perMonthShort', undefined, '/mo')}
              </span>
            </div>
            <p className="public-pricing-price-meta mt-1 text-[var(--color-muted)]">
              {formatCurrency(plan.hourly, undefined, getDeployCurrencyFormatOptions('hourly'))} {t('publicPricing.perHourShort', undefined, '/hr')}
            </p>
          </div>
        </div>
      </div>
    </SurfaceCard>
  )
}

export function PublicPricingPage({
  cloudVpsConfig,
  formatCurrency,
  loginUrl,
  localizeDigits,
  pricingContext,
  publicPricingCatalog,
  t,
}) {
  const visibleLocations = filterLocationsByCloudVpsConfig(
    mapCountriesToDeployLocations(publicPricingCatalog?.countriesPayload ?? publicPricingCatalog?.commonTermsPayload),
    cloudVpsConfig,
  )
  const locationSections = buildPublicCountrySections(visibleLocations, t)
  const [selectedCountryCode, setSelectedCountryCode] = useState('')
  const [countryCatalogs, setCountryCatalogs] = useState({})
  const [countryLoadError, setCountryLoadError] = useState('')
  const [countryRequestNonce, setCountryRequestNonce] = useState(0)
  const [isLoadingPlans, setIsLoadingPlans] = useState(false)
  const [metricIndexes, setMetricIndexes] = useState({
    cpu: 0,
    memory: 0,
    storage: 0,
    traffic: 0,
  })
  const selectedCountry = visibleLocations.find((location) => location.countryCode === selectedCountryCode) ?? null
  const selectedCountryTermId = Number.isFinite(Number(selectedCountry?.termId))
    ? Number(selectedCountry?.termId)
    : null
  const selectedCountryCacheKey = selectedCountryTermId !== null ? String(selectedCountryTermId) : ''
  const catalog = selectedCountryCacheKey && countryCatalogs[selectedCountryCacheKey]
    ? countryCatalogs[selectedCountryCacheKey]
    : EMPTY_CATALOG
  const hasVisibleLocations = visibleLocations.length > 0
  const filtersDisabled = selectedCountry === null || isLoadingPlans
  const filteredPlans = selectedCountry
    ? catalog.plans.filter((plan) => {
        if (getCpuValue(plan) < (catalog.metricScales.cpu[metricIndexes.cpu] ?? 0)) {
          return false
        }

        if (getMemoryValue(plan) < (catalog.metricScales.memory[metricIndexes.memory] ?? 0)) {
          return false
        }

        if (getTrafficValue(plan) < (catalog.metricScales.traffic[metricIndexes.traffic] ?? 0)) {
          return false
        }

        if (getStorageValue(plan) < (catalog.metricScales.storage[metricIndexes.storage] ?? 0)) {
          return false
        }

        return true
      })
    : []

  useEffect(() => {
    if (selectedCountryTermId === null) {
      return
    }

    if (countryCatalogs[selectedCountryCacheKey]) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const response = await dashboardWhmcsApi.getPublicPricingCatalog(selectedCountryTermId)

        if (cancelled) {
          return
        }

        const nextCatalog = buildCountryCatalog(
          response.productsPayload,
          pricingContext,
          cloudVpsConfig,
          selectedCountry?.countryCode ?? '',
        )

        setCountryCatalogs((current) => ({
          ...current,
          [selectedCountryCacheKey]: nextCatalog,
        }))
      } catch (error) {
        if (cancelled) {
          return
        }

        setCountryLoadError(
          error instanceof Error && error.message
            ? error.message
            : t('publicPricing.loadError', undefined, 'We could not load offers for this country right now.'),
        )
      } finally {
        if (!cancelled) {
          setIsLoadingPlans(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    cloudVpsConfig,
    countryCatalogs,
    countryRequestNonce,
    pricingContext,
    selectedCountry?.countryCode,
    selectedCountryCacheKey,
    selectedCountryTermId,
    t,
  ])

  function resetFilters() {
    setMetricIndexes({
      cpu: 0,
      memory: 0,
      storage: 0,
      traffic: 0,
    })
  }

  function selectCountry(countryCode) {
    const nextCountry = visibleLocations.find((location) => location.countryCode === countryCode) ?? null
    const nextCountryTermId = Number.isFinite(Number(nextCountry?.termId))
      ? Number(nextCountry?.termId)
      : null
    const nextCacheKey = nextCountryTermId !== null ? String(nextCountryTermId) : ''
    const hasCachedCatalog = nextCacheKey !== '' && Boolean(countryCatalogs[nextCacheKey])

    resetFilters()
    setCountryLoadError('')
    setIsLoadingPlans(
      countryCode !== ''
      && selectedCountryCode !== countryCode
      && !hasCachedCatalog,
    )
    setSelectedCountryCode((current) => (current === countryCode ? '' : countryCode))
  }

  function retrySelectedCountryLoad() {
    setCountryLoadError('')
    setIsLoadingPlans(true)
    setCountryRequestNonce((current) => current + 1)
  }

  return (
    <div className="public-pricing-shell min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(29,84,214,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(83,104,232,0.1),_transparent_24%),linear-gradient(180deg,_var(--color-background)_0%,color-mix(in_srgb,var(--color-background)_88%,#eef3ff)_100%)]">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="public-pricing-layout">
          <aside className="public-pricing-sidebar-column">
              <SurfaceCard className="public-pricing-glass rounded-[24px] border-[var(--color-border-soft)] p-5 shadow-[0_24px_56px_-42px_rgba(36,62,124,0.34)]" padded={false}>
                <div className="p-5">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <h2 className="type-body-strong text-[var(--color-ink)]">
                        {t('publicPricing.filters', undefined, 'Filters')}
                      </h2>
                    </div>

                    <button
                      className="type-body-sm-strong text-[var(--color-primary)] transition disabled:cursor-not-allowed disabled:text-[var(--color-muted)]"
                      disabled={filtersDisabled}
                      type="button"
                      onClick={resetFilters}
                    >
                      {t('publicPricing.resetFilters', undefined, 'Reset')}
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <FilterControl
                      disabled={filtersDisabled}
                      icon={Cpu}
                      id="cpu"
                      label={t('publicPricing.metric.cpu', undefined, t('deploy.plan.cpu', undefined, 'CPU'))}
                      localizeDigits={localizeDigits}
                      scale={catalog.metricScales.cpu}
                      t={t}
                      valueIndex={metricIndexes.cpu}
                      onChange={(value) => setMetricIndexes((current) => ({ ...current, cpu: value }))}
                    />
                    <FilterControl
                      disabled={filtersDisabled}
                      icon={Zap}
                      id="memory"
                      label={t('publicPricing.metric.ram', undefined, t('deploy.plan.ram', undefined, 'RAM'))}
                      localizeDigits={localizeDigits}
                      scale={catalog.metricScales.memory}
                      t={t}
                      valueIndex={metricIndexes.memory}
                      onChange={(value) => setMetricIndexes((current) => ({ ...current, memory: value }))}
                    />
                    <FilterControl
                      disabled={filtersDisabled}
                      icon={Network}
                      id="traffic"
                      label={t('deploy.plan.net', undefined, 'Traffic')}
                      localizeDigits={localizeDigits}
                      scale={catalog.metricScales.traffic}
                      t={t}
                      valueIndex={metricIndexes.traffic}
                      onChange={(value) => setMetricIndexes((current) => ({ ...current, traffic: value }))}
                    />
                    <FilterControl
                      disabled={filtersDisabled}
                      icon={HardDrive}
                      id="storage"
                      label={t('deploy.plan.disk', undefined, 'Storage')}
                      localizeDigits={localizeDigits}
                      scale={catalog.metricScales.storage}
                      t={t}
                      valueIndex={metricIndexes.storage}
                      onChange={(value) => setMetricIndexes((current) => ({ ...current, storage: value }))}
                    />
                  </div>

                  {!selectedCountry ? (
                    <p className="type-body-sm mt-4 text-[var(--color-muted)]">
                      {t(
                        'publicPricing.filtersWelcomeCopy',
                        undefined,
                        'Select a country to activate the filters.',
                      )}
                    </p>
                  ) : null}
                </div>
              </SurfaceCard>

              <SurfaceCard className="public-pricing-glass rounded-[24px] border-[var(--color-border-soft)] p-5 shadow-[0_24px_56px_-42px_rgba(36,62,124,0.34)]" padded={false}>
                <div className="p-5">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <MapPin className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <h2 className="type-body-strong text-[var(--color-ink)]">
                        {t('publicPricing.country', undefined, 'Country')}
                      </h2>
                    </div>
                    <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" strokeWidth={2.2} />
                  </div>

                  <div className="grid gap-5">
                    {locationSections.map((section) => (
                      <div key={section.id}>
                        <p className="type-label-sm text-[var(--color-muted)]">{section.label}</p>
                        <div className="mt-2 grid gap-1.5">
                          {section.locations.map((location) => (
                            <CountryRow
                              key={location.id}
                              active={selectedCountryCode === location.countryCode}
                              label={`${location.emoji} ${getPublicCountryLabel(location, t)}`}
                              onClick={() => selectCountry(location.countryCode)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SurfaceCard>
            </aside>

          <section className="public-pricing-main-column">
            {publicPricingCatalog?.errorMessage && visibleLocations.length === 0 ? (
              <SurfaceCard className="rounded-[24px] border-[var(--color-warning-panel-border)] bg-[var(--color-warning-soft)] p-6">
                <p className="type-body text-[var(--color-ink)]">{publicPricingCatalog.errorMessage}</p>
              </SurfaceCard>
            ) : null}

            {selectedCountry ? (
              countryLoadError ? (
                <SurfaceCard className="rounded-[24px] border-[var(--color-warning-panel-border)] bg-[var(--color-warning-soft)] p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="type-body text-[var(--color-ink)]">{countryLoadError}</p>
                    <button
                      className="theme-button-secondary type-button inline-flex h-11 items-center justify-center rounded-[12px] border px-4"
                      type="button"
                      onClick={retrySelectedCountryLoad}
                    >
                      {t('common.actions.retry', undefined, 'Retry')}
                    </button>
                  </div>
                </SurfaceCard>
              ) : isLoadingPlans ? (
                <div className="grid gap-5 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <SurfaceCard
                      key={`loading-card-${index}`}
                      className="rounded-[24px] border-[var(--color-border-soft)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-5 shadow-[0_24px_56px_-42px_rgba(36,62,124,0.34)]"
                    >
                      <div className="animate-pulse">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {Array.from({ length: 4 }).map((__, metricIndex) => (
                            <div key={`metric-${metricIndex}`} className="rounded-[18px] bg-[var(--color-panel-soft)] px-4 py-8" />
                          ))}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <div className="h-8 w-20 rounded-[10px] bg-[var(--color-panel-soft)]" />
                          <div className="h-8 w-20 rounded-[10px] bg-[var(--color-panel-soft)]" />
                          <div className="h-8 w-20 rounded-[10px] bg-[var(--color-panel-soft)]" />
                        </div>
                        <div className="mt-5 flex items-end gap-4">
                          <div className="h-12 flex-1 rounded-[12px] bg-[var(--color-panel-soft)]" />
                          <div className="h-14 w-24 rounded-[12px] bg-[var(--color-panel-soft)]" />
                        </div>
                      </div>
                    </SurfaceCard>
                  ))}
                </div>
              ) : filteredPlans.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2">
              {filteredPlans.map((plan) => (
                <OfferCard
                  cloudVpsConfig={cloudVpsConfig}
                  key={plan.id}
                  formatCurrency={formatCurrency}
                  loginUrl={loginUrl}
                  localizeDigits={localizeDigits}
                  plan={plan}
                  t={t}
                    />
                  ))}
                </div>
              ) : (
                <SurfaceCard className="public-pricing-glass rounded-[24px] border-[var(--color-border-soft)] p-6">
                  <p className="type-body text-[var(--color-copy)]">
                    {t('publicPricing.noOffers', undefined, 'No offers match the current filters for this country.')}
                  </p>
                </SurfaceCard>
              )
            ) : hasVisibleLocations ? (
              <div className="grid gap-5">
                <SurfaceCard className="public-pricing-glass rounded-[28px] border-[var(--color-border-soft)] p-6 shadow-[0_28px_70px_-50px_rgba(36,62,124,0.34)] md:p-7" padded={false}>
                  <div className="p-6 md:p-7">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="type-section-title text-[var(--color-ink)]">
                          {t('publicPricing.chooseCountryTitle', undefined, 'Choose your Cloud VPS plan')}
                        </h2>
                        <p className="type-body mt-2 max-w-[42rem] text-[var(--color-copy)]">
                          {t(
                            'publicPricing.chooseCountryCopy',
                            undefined,
                            'To view Cloud VPS server plans, first select your preferred country. After selection, pricing, resources, and Cloud VPS plans for that location will be displayed.',
                          )}
                        </p>
                      </div>

                    </div>

                    <div className="mt-6 grid gap-5">
                      {locationSections.map((section) => (
                        <div
                          key={section.id}
                          className="rounded-[24px] border border-[var(--color-border-soft)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] p-4 shadow-[0_18px_42px_-34px_rgba(36,62,124,0.22)] md:p-5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="type-card-title text-[var(--color-ink)]">{section.label}</h3>
                            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 type-label-sm text-[var(--color-primary)]">
                              {localizeDigits(String(section.locations.length))}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {section.locations.map((location) => (
                              <CountrySelectionCard
                                emoji={location.emoji}
                                key={location.id}
                                label={getPublicCountryLabel(location, t)}
                                onClick={() => selectCountry(location.countryCode)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SurfaceCard>
              </div>
            ) : (
              <SurfaceCard className="public-pricing-glass rounded-[24px] border-[var(--color-border-soft)] p-6">
                <p className="type-body text-[var(--color-copy)]">
                  {t('publicPricing.noCountriesAvailable', undefined, 'No countries are available right now.')}
                </p>
              </SurfaceCard>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
