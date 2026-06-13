import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  FileText,
  HardDrive,
  Image,
  MapPin,
  Network,
  Server,
  Zap,
} from '@/components/icons'
import { Link } from 'react-router-dom'
import { DeployStepLayout } from '../components/deploy/DeployStepLayout'
import { LoadingState } from '../components/ui/LoadingState'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { useDashboardApp } from '../context/useDashboardApp'
import { cn } from '../lib/cn'
import { getDeployPlanMetricDisplay, getDeployPlanUnitLabel } from '../lib/deployPlanMetrics'
import { getDeployCurrencyFormatOptions } from '../lib/deployPricing'
import { formatLocationParts, translateDatacenterName } from '../lib/locationDisplay'
import { getPlanCityOptions } from '../lib/services/server'

function PlanMetric({ icon: Icon, label, value, unit }) {
  return (
    <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-primary-soft)] text-[var(--color-copy)]">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="type-label-sm text-[var(--color-copy)]">{label}</p>
        <div className="mt-1 flex items-end gap-1">
          <span className="type-detail-value text-[var(--color-ink)]">{value}</span>
          {unit ? (
            <span className="type-list-meta pb-0.5 text-[var(--color-copy)]">{unit}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CityOptionButton({
  cityCode,
  datacenterName = '',
  fallbackLabel,
  primary = false,
  selected,
  onSelect,
}) {
  const { cloudVpsConfig, isRtl, t } = useDashboardApp()
  const shouldShowDatacenter = cloudVpsConfig.displayDatacenterName && datacenterName
  const locationLabel = formatLocationParts(
    [
      t(`locations.city.${cityCode}`, undefined, fallbackLabel),
      shouldShowDatacenter ? translateDatacenterName(t, datacenterName) : '',
    ],
    isRtl,
  )

  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-3 py-2 transition',
        selected
          ? 'theme-button-primary border shadow-[var(--shadow-primary-soft)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-copy)] hover:border-[var(--color-primary)]',
      )}
      type="button"
      onClick={onSelect}
    >
      {primary || selected ? <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> : null}
      <span className="min-w-0 text-start">
        <span className="type-button block truncate">
          {locationLabel}
        </span>
      </span>
      {selected ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} /> : null}
    </button>
  )
}

function PlanCard({ active, plan, selectedCity, onSelect, onSelectCity }) {
  const { formatCurrency, isRtl, localizeDigits, t } = useDashboardApp()
  const cityOptions = getPlanCityOptions(plan)
  const [primaryCity, ...extraCities] = cityOptions
  const primaryCitySelected = active && selectedCity === primaryCity?.cityCode
  const ramMetric = getDeployPlanMetricDisplay(plan.ram, localizeDigits, 'gb')
  const diskMetric = getDeployPlanMetricDisplay(plan.disk, localizeDigits, 'gb')
  const netMetric = getDeployPlanMetricDisplay(plan.net, localizeDigits, 'gb')

  return (
    <SurfaceCard
      as="div"
      className={cn(
        'rounded-[24px] p-5',
        active
          ? 'border-[var(--color-primary)] shadow-[inset_0_0_0_1px_var(--color-primary)]'
          : 'hover:border-[var(--color-primary)]',
      )}
      interactive
      padded={false}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className={cn(
              'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
              active
                ? 'border-[var(--color-primary)] bg-[var(--color-surface)]'
                : 'border-[var(--color-border-strong)] bg-[var(--color-surface)]',
            )}
          >
            {active ? <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" /> : null}
          </span>

          <div className="grid w-full min-w-0 grid-cols-2 gap-4 xl:grid-cols-4 xl:gap-6">
            <PlanMetric
              icon={Cpu}
              label={t('publicPricing.metric.cpu', undefined, t('deploy.plan.cpu'))}
              unit={getDeployPlanUnitLabel(t, 'cpu')}
              value={localizeDigits(plan.cpu)}
            />
            <PlanMetric
              icon={Zap}
              label={t('publicPricing.metric.ram', undefined, t('deploy.plan.ram'))}
              unit={getDeployPlanUnitLabel(t, ramMetric.unit)}
              value={ramMetric.value}
            />
            <PlanMetric
              icon={HardDrive}
              label={t('deploy.plan.disk')}
              unit={getDeployPlanUnitLabel(t, diskMetric.unit)}
              value={diskMetric.value}
            />
            <PlanMetric
              icon={Network}
              label={t('deploy.plan.net')}
              unit={getDeployPlanUnitLabel(t, netMetric.unit)}
              value={netMetric.value}
            />
          </div>
        </div>

        <div
          className={cn(
            'border-t border-[var(--color-border)] pt-4 sm:border-t-0 sm:pt-0',
            isRtl ? 'sm:border-r sm:pr-6' : 'sm:border-l sm:pl-6',
          )}
        >
          <div className="flex items-end gap-1 sm:justify-end">
            <span className={cn('type-price-lg', active ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)]')}>
              {formatCurrency(plan.monthly)}
            </span>
            <span className={cn('type-price-unit pb-1', active ? 'text-[var(--color-primary)]' : 'text-[var(--color-copy)]')}>
              {t('deploy.plan.perMonth')}
            </span>
          </div>
          <p className="type-body-sm mt-2 text-end text-[var(--color-copy)]">
            {t('deploy.plan.perHour', {
              value: formatCurrency(plan.hourly, undefined, getDeployCurrencyFormatOptions('hourly')),
            })}
          </p>
        </div>
      </div>

      <div className={cn('mt-5 flex flex-wrap gap-2 border-t pt-4', active ? 'border-[var(--color-primary-soft)]' : 'border-[var(--color-border)]')}>
        {primaryCity ? (
          <CityOptionButton
            cityCode={primaryCity.cityCode}
            datacenterName={primaryCity.datacenterName}
            fallbackLabel={primaryCity.cityLabel}
            primary={primaryCity.primary}
            selected={primaryCitySelected}
            onSelect={(event) => {
              event.stopPropagation()
              onSelectCity(primaryCity.cityCode)
            }}
          />
        ) : null}

        {extraCities.map((cityOption) => (
          <CityOptionButton
            key={cityOption.cityCode}
            cityCode={cityOption.cityCode}
            datacenterName={cityOption.datacenterName}
            fallbackLabel={cityOption.cityLabel}
            selected={active && selectedCity === cityOption.cityCode}
            onSelect={(event) => {
              event.stopPropagation()
              onSelectCity(cityOption.cityCode)
            }}
          />
        ))}
      </div>
    </SurfaceCard>
  )
}

export function DeployPlanPage() {
  const {
    cloudVpsConfig,
    deployDraft,
    deployPlans,
    formatCurrency,
    isRtl,
    loading,
    selectedDeployLocation,
    selectedDeployPlan,
    pricingContext,
    actions,
    t,
  } = useDashboardApp()
  const selectedPlan = selectedDeployPlan
  const selectedLocation = selectedDeployLocation ?? selectedPlan?.location ?? null
  const selectedLocationLabel = formatLocationParts(
    [
      t(`locations.city.${selectedLocation?.cityCode}`, undefined, selectedLocation?.city),
      cloudVpsConfig.displayDatacenterName && selectedLocation?.datacenterName
        ? translateDatacenterName(t, selectedLocation.datacenterName)
        : '',
    ],
    isRtl,
  )
  const moneyActionsBlocked = pricingContext.moneyActionsBlocked === true
  const hasPlans = deployPlans.length > 0
  const isLoadingPlans = loading.deployPlans

  return (
    <DeployStepLayout
      backLabelKey="common.actions.backToLocation"
      backTo="/deploy/location"
      backUppercase
      currentStep={2}
      maxWidthClassName="max-w-[1534px]"
      sectionDescriptionKey="deploy.steps.plan.description"
      sectionTitleKey="deploy.steps.plan.title"
    >
      <div className={cn('grid items-start gap-8', hasPlans && 'lg:grid-cols-[minmax(0,1fr)_380px]')}>
        <div className="grid gap-5">
          {moneyActionsBlocked ? (
            <div className="rounded-[20px] border border-[var(--color-warning-panel-border)] bg-[var(--color-warning-soft)] px-5 py-4 text-[var(--color-warning)]">
              {t(
                'billing.pricingUnavailable',
                undefined,
                'Pricing for your currency is not configured yet, so deployment checkout is temporarily unavailable.',
              )}
            </div>
          ) : null}
          {isLoadingPlans ? (
            <LoadingState
              copy={t(
                'deploy.plans.loading.copy',
                undefined,
                'We are fetching the plans for your selected location.',
              )}
              title={t('deploy.plans.loading.title', undefined, 'Loading VPS plans...')}
            />
          ) : hasPlans ? deployPlans.map((plan) => {
            const active = plan.id === deployDraft.planId

            return (
              <PlanCard
                key={plan.id}
                active={active}
                plan={plan}
                selectedCity={deployDraft.planCityCode}
                onSelect={() =>
                  actions.updateDeployDraft({
                    planId: plan.id,
                  })
                }
                onSelectCity={(cityCode) =>
                  actions.updateDeployDraft({
                    planId: plan.id,
                    planCityCode: cityCode,
                  })
                }
              />
            )
          }) : (
            <SurfaceCard className="rounded-[24px] px-6 py-6">
              <p className="type-card-title text-[var(--color-ink)]">
                {t('deploy.planUnavailableTitle', undefined, 'No VPS plans are currently available for this location')}
              </p>
              <p className="type-body mt-3 text-[var(--color-copy)]">
                {t('deploy.planUnavailableCopy', undefined, 'Choose another location or try again later.')}
              </p>
            </SurfaceCard>
          )}
        </div>

        {!isLoadingPlans && hasPlans ? (
          <aside className="w-full lg:sticky lg:top-8">
          <SurfaceCard className="overflow-hidden rounded-[24px]" padded={false}>
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] px-6 py-5">
              <div>
                <h3 className="type-card-title text-[var(--color-ink)]">{t('deploy.plan.orderSummary')}</h3>
                <p className="type-label-sm mt-1 text-[var(--color-copy)]">{t('common.configurationCheck')}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-soft)] text-[var(--color-copy)]">
                <FileText className="h-5 w-5" strokeWidth={2} />
              </span>
            </div>

            <div className="space-y-4 bg-[var(--color-surface-alt)] px-5 py-5">
              <div className="flex items-center justify-between rounded-[18px] border border-[var(--color-info-border)] bg-[var(--color-surface)] px-4 py-4 shadow-[var(--shadow-panel)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-nav-active)] text-[var(--color-primary)]">
                    <Server className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="type-label-sm text-[var(--color-copy)]">{t('deploy.plan.serverType')}</p>
                    <p className="type-list-title mt-1 text-[var(--color-ink)]">{t('deploy.plan.browseAll')}</p>
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-[var(--color-primary)]" strokeWidth={2.2} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative rounded-[18px] border border-[var(--color-info-border)] bg-[var(--color-surface)] px-4 py-4 shadow-[var(--shadow-panel)]">
                  <CheckCircle2 className={`absolute top-3 h-4 w-4 text-[var(--color-primary)] ${isRtl ? 'left-3' : 'right-3'}`} strokeWidth={2.2} />
                  <MapPin className="h-4 w-4 text-[var(--color-copy)]" strokeWidth={2} />
                  <p className="type-label-sm mt-3 text-[var(--color-copy)]">{t('common.location')}</p>
                  <p className="type-list-title mt-1 text-[var(--color-ink)]">
                    {selectedLocationLabel}
                  </p>
                  <p className="type-list-meta mt-1 text-[var(--color-copy)]">
                    {t(
                      `locations.country.${selectedLocation?.countryCode}`,
                      undefined,
                      selectedLocation?.country,
                    )}
                  </p>
                </div>

                <div className="rounded-[18px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-primary-soft)] px-4 py-4">
                  <Image className="h-4 w-4 text-[var(--color-muted)]" strokeWidth={2} />
                  <p className="type-label-sm mt-3 text-[var(--color-copy)]">{t('common.system')}</p>
                  <p className="type-detail-copy mt-1 italic text-[var(--color-muted)]">{t('common.required')}</p>
                </div>
              </div>

            </div>

            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="type-label-sm text-[var(--color-copy)]">{t('common.monthlyTotal')}</p>
                </div>
                <div className="text-end">
                  <p className="type-price-lg text-[var(--color-primary)]">
                    {formatCurrency(selectedPlan?.monthly ?? 0)}
                    <span className="type-price-unit ml-1 text-[var(--color-copy)]">
                      {t('deploy.plan.perMonth')}
                    </span>
                  </p>
                  <p className="type-body-sm mt-1 text-[var(--color-copy)]">{t('deploy.plan.excludingVat')}</p>
                </div>
              </div>

              <Link
                className="theme-button-primary type-button mt-6 inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-[16px] border px-6 transition"
                to="/deploy/configure"
              >
                {t('common.actions.nextStep')}
                <ArrowRight className="rtl-flip h-4 w-4" strokeWidth={2.2} />
              </Link>
            </div>
          </SurfaceCard>
          </aside>
        ) : null}
      </div>
    </DeployStepLayout>
  )
}
