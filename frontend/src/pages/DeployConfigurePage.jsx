import {
  ArrowRight,
  AlertTriangle,
  Check,
  Cpu,
  FileText,
  HardDrive,
  Network,
  Zap,
} from '@/components/icons'
import { startTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeployStepLayout } from '../components/deploy/DeployStepLayout'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { useDashboardApp } from '../context/useDashboardApp'
import { getDeployPlanMetricDisplay, getDeployPlanUnitLabel } from '../lib/deployPlanMetrics'
import { getDeployCurrencyFormatOptions } from '../lib/deployPricing'
import { formatLocationParts, translateDatacenterName } from '../lib/locationDisplay'
import { formatOperatingSystemDisplayName, translateOperatingSystemTitle } from '../lib/operatingSystems'
import { cn } from '../lib/cn'
import almaLinuxLogo from '../assets/os/almalinux.svg'
import debianLogo from '../assets/os/debian.svg'
import rockyLinuxLogo from '../assets/os/rockylinux.svg'
import ubuntuLogo from '../assets/os/ubuntu.svg'
import windowsServerLogo from '../assets/os/windows-server.svg'

const operatingSystemLogos = {
  almalinux: almaLinuxLogo,
  debian: debianLogo,
  rockylinux: rockyLinuxLogo,
  ubuntu: ubuntuLogo,
  windows: windowsServerLogo,
}

function getOsLogo(system) {
  return operatingSystemLogos[system.icon] ?? windowsServerLogo
}

function BillingCard({ active, duration, onSelect }) {
  const { formatCurrency, t } = useDashboardApp()

  return (
    <SurfaceCard
      as="button"
      className={cn(
        'flex min-h-[172px] flex-col rounded-[24px] border-[var(--color-border-strong)] px-5 py-5 text-start shadow-none transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/15 md:min-h-[184px] md:px-6 md:py-6',
        active
          ? 'border-[var(--color-primary)] shadow-[inset_0_0_0_1px_var(--color-primary)]'
          : 'hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-panel)]',
      )}
      padded={false}
      aria-checked={active}
      role="radio"
      type="button"
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition',
            active
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-surface)]'
              : 'border-[var(--color-border-strong)] bg-[var(--color-surface)] text-transparent',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
        </span>
        <span className="type-list-title block text-[var(--color-ink)]">
          {t(duration.labelKey, undefined, duration.label)}
        </span>
      </div>

      <div className="mt-auto flex items-end justify-between gap-4 pt-6">
        {duration.badge ? (
          <span className="type-badge inline-flex rounded-[9px] bg-[var(--color-nav-active)] px-2.5 py-1.5 text-[var(--color-primary)]">
            {t(duration.badgeKey, undefined, duration.badge)}
          </span>
        ) : (
          <span aria-hidden="true" />
        )}
        <span className="flex items-end gap-1.5">
          <span className={cn('type-price-lg', active ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)]')}>
            {formatCurrency(duration.total, undefined, getDeployCurrencyFormatOptions(duration.id))}
          </span>
        </span>
      </div>
    </SurfaceCard>
  )
}

function OperatingSystemCard({ active, label, system, onSelect }) {
  return (
    <SurfaceCard
      as="button"
      className={cn(
        'flex items-center justify-between gap-4 rounded-[20px] px-5 py-4 text-start',
        active
          ? 'border-[var(--color-primary)] shadow-[inset_0_0_0_1px_var(--color-primary)]'
          : 'hover:border-[var(--color-primary)]',
      )}
      interactive
      padded={false}
      aria-checked={active}
      role="radio"
      type="button"
      onClick={onSelect}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)]">
          <img alt={label} className="h-7 w-7" src={getOsLogo(system)} />
        </span>
        <span className="type-list-title text-[var(--color-ink)]">{label}</span>
      </div>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition',
          active
            ? 'theme-fill-primary'
            : 'border-[var(--color-border-strong)] bg-[var(--color-surface)] text-transparent',
        )}
      >
        <Check className="h-4 w-4" strokeWidth={2.4} />
      </span>
    </SurfaceCard>
  )
}

function SummaryDetailCard({ label, secondary, secondaryLabel = '', value }) {
  const { localizeDigits } = useDashboardApp()

  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 shadow-[var(--shadow-panel)]">
      <p className="type-label-sm text-[var(--color-copy)]">{label}</p>
      <p className="type-list-title mt-4 text-[var(--color-ink)]">{localizeDigits(value)}</p>
      {secondary ? (
        <p className="type-body-sm mt-1 text-[var(--color-copy)]">
          {localizeDigits(secondaryLabel ? `${secondaryLabel}: ${secondary}` : secondary)}
        </p>
      ) : null}
    </div>
  )
}

function SummarySpecificationMetric({ icon: Icon, label, unit, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="type-label-sm text-[var(--color-copy)]">{label}</p>
        <div className="mt-1 flex items-end gap-1">
          <p className="type-body-strong text-[var(--color-ink)]">{value}</p>
          {unit ? <p className="type-list-meta pb-0.5 text-[var(--color-copy)]">{unit}</p> : null}
        </div>
      </div>
    </div>
  )
}

function SummarySpecificationsCard({ plan }) {
  const { localizeDigits, t } = useDashboardApp()
  const ramMetric = getDeployPlanMetricDisplay(plan?.ram, localizeDigits, 'gb')
  const diskMetric = getDeployPlanMetricDisplay(plan?.disk, localizeDigits, 'gb')
  const networkMetric = getDeployPlanMetricDisplay(plan?.net, localizeDigits, 'gb')

  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 shadow-[var(--shadow-panel)]">
      <p className="type-label-sm text-[var(--color-copy)]">{t('common.specifications')}</p>

      <div className="mt-4 divide-y divide-[var(--color-border)]">
        <SummarySpecificationMetric
          icon={Cpu}
          label={t('publicPricing.metric.cpu', undefined, t('deploy.plan.cpu'))}
          unit={plan?.cpu ? getDeployPlanUnitLabel(t, 'cpu') : ''}
          value={plan?.cpu ? localizeDigits(plan.cpu) : 'n/a'}
        />
        <SummarySpecificationMetric
          icon={Zap}
          label={t('publicPricing.metric.ram', undefined, t('deploy.plan.ram'))}
          unit={ramMetric.unit ? getDeployPlanUnitLabel(t, ramMetric.unit) : ''}
          value={ramMetric.value}
        />
        <SummarySpecificationMetric
          icon={HardDrive}
          label={t('deploy.plan.disk')}
          unit={diskMetric.unit ? getDeployPlanUnitLabel(t, diskMetric.unit) : ''}
          value={diskMetric.value}
        />
        <SummarySpecificationMetric
          icon={Network}
          label={t('deploy.plan.net')}
          unit={networkMetric.unit ? getDeployPlanUnitLabel(t, networkMetric.unit) : ''}
          value={networkMetric.value}
        />
      </div>
    </div>
  )
}

function NetworkToggleCard({ badge, checked, description, disabled = false, label, onToggle }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-[18px] border px-4 py-4 transition',
        disabled
          ? 'cursor-not-allowed opacity-60'
          : checked
          ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]',
      )}
    >
      <input
        checked={checked}
        className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onToggle(event.target.checked)}
      />
      <span className="flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="type-body-strong text-[var(--color-ink)]">{label}</span>
          {badge ? (
            <span className="type-badge rounded-md bg-[var(--color-nav-active)] px-2 py-1 text-[var(--color-primary)]">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="type-detail-copy mt-2 block text-[var(--color-copy)]">{description}</span>
      </span>
    </label>
  )
}

export function DeployConfigurePage() {
  const {
    cloudVpsConfig,
    deployDraft,
    selectedDeployBilling,
    selectedDeployLocation,
    selectedDeployPlan,
    selectedDeploySystem,
    deployErrorMessage,
    deployPreview,
    formatCurrency,
    isRtl,
    pricingContext,
    actions,
    t,
  } = useDashboardApp()
  const navigate = useNavigate()
  const selectedPlan = selectedDeployPlan
  const selectedDuration = selectedDeployBilling
  const selectedSystem = selectedDeploySystem
  const selectedLocation = selectedDeployLocation ?? selectedDeployPlan?.location ?? null
  const ipv4Enabled = Boolean(deployDraft.ipv4Enabled)
  const ipv6Enabled = Boolean(deployDraft.ipv6Enabled)
  const networkCharge =
    (ipv4Enabled ? deployPreview.ipv4Charge : 0)
    + (ipv6Enabled ? deployPreview.ipv6Charge : 0)
  const checkoutTotal = deployPreview.checkoutTotal
  const ipv4Required = Boolean(selectedPlan?.ipv4Config?.required)
  const ipv4Supported = Boolean(selectedPlan?.ipv4Config?.supported)
  const ipv6Required = Boolean(selectedPlan?.ipv6Config?.required)
  const ipv6Supported = Boolean(selectedPlan?.ipv6Config?.supported)
  const networkLabel = deployDraft.ipv4Enabled
    ? t('deploy.network.dualStack')
    : deployDraft.ipv6Enabled
      ? t('deploy.network.ipv6Only')
      : t('common.noPublicIp')
  const moneyActionsBlocked = pricingContext.moneyActionsBlocked === true
  const deployErrorDescription = deployErrorMessage
    ? t(deployErrorMessage, undefined, deployErrorMessage)
    : ''
  const deployErrorTitle = deployErrorMessage === 'deploy.configure.balanceInsufficient'
    ? t('deploy.configure.balanceInsufficientTitle', undefined, 'Insufficient balance')
    : t('deploy.configure.deployFailed', undefined, 'Deployment failed')
  const checkoutLabel = t('deploy.configure.checkoutSummary', {
    duration: selectedDuration?.label
      ? t(selectedDuration.labelKey, undefined, selectedDuration.label)
      : t('deploy.billing.hourly'),
  })
  const selectedSystemLabel = selectedSystem
    ? formatOperatingSystemDisplayName(t, selectedSystem)
    : 'Template'
  const selectedLocationLabel = formatLocationParts(
    [
      t(`locations.city.${selectedLocation?.cityCode}`, undefined, selectedLocation?.city),
      t(
        `locations.country.${selectedLocation?.countryCode}`,
        undefined,
        selectedLocation?.country,
      ),
    ],
    isRtl,
  )
  const selectedDatacenterLabel =
    cloudVpsConfig.displayDatacenterName && selectedLocation?.datacenterName
      ? translateDatacenterName(t, selectedLocation.datacenterName)
      : ''
  const formatDeployCurrency = (value, durationId) =>
    formatCurrency(value, undefined, getDeployCurrencyFormatOptions(durationId))

  async function handleConfirm() {
    const serverId = await actions.confirmDeployment()

    if (!serverId) {
      return
    }

    startTransition(() => {
      navigate(`/servers/${serverId}`)
    })
  }

  return (
    <DeployStepLayout
      backLabelKey="common.actions.backToPlan"
      backTo="/deploy/plan"
      currentStep={3}
      maxWidthClassName="max-w-[1534px]"
      sectionDescriptionKey="deploy.steps.configure.description"
      sectionTitleKey="deploy.steps.configure.title"
    >
      <ConfirmationDialog
        cancelLabel={t('common.actions.close', undefined, 'Close')}
        confirmLabel={t('common.actions.ok', undefined, 'OK')}
        description={deployErrorDescription}
        icon={AlertTriangle}
        open={Boolean(deployErrorMessage)}
        title={deployErrorTitle}
        tone="danger"
        onClose={actions.dismissDeployError}
        onConfirm={actions.dismissDeployError}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          {moneyActionsBlocked ? (
            <div className="rounded-[20px] border border-[var(--color-warning-panel-border)] bg-[var(--color-warning-soft)] px-5 py-4 text-[var(--color-warning)]">
              {t(
                'billing.pricingUnavailable',
                undefined,
                'Pricing for your currency is not configured yet, so deployment checkout is temporarily unavailable.',
              )}
            </div>
          ) : null}
          <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-5 shadow-[var(--shadow-surface)] md:px-6 md:py-6">
            <h3 className="type-section-title text-[var(--color-ink)]">
              {t('deploy.configure.billingDuration')}
            </h3>
            <p className="type-page-subtitle mt-2 max-w-[760px] text-[var(--color-copy)]">
              {t('deploy.configure.billingDurationCopy')}
            </p>
            <div
              aria-label={t('deploy.configure.billingDuration')}
              className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              role="radiogroup"
            >
              {(selectedPlan?.billingOptions ?? []).map((duration) => (
                <BillingCard
                  key={duration.id}
                  active={duration.id === deployDraft.billingDurationId}
                  duration={duration}
                  onSelect={() => actions.updateDeployDraft({ billingDurationId: duration.id })}
                />
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 shadow-[var(--shadow-surface)]">
            <h3 className="type-section-title text-[var(--color-ink)]">
              {t('deploy.configure.chooseOperatingSystem')}
            </h3>
            <p className="type-page-subtitle mt-2 text-[var(--color-copy)]">
              {t('deploy.configure.chooseOperatingSystemCopy')}
            </p>
            <div
              aria-label={t('deploy.configure.chooseOperatingSystem')}
              className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              role="radiogroup"
            >
              {(selectedPlan?.operatingSystems ?? []).map((system) => (
                <OperatingSystemCard
                  key={system.id}
                  active={system.id === deployDraft.operatingSystemId}
                  label={translateOperatingSystemTitle(t, system.title)}
                  system={system}
                  onSelect={() => actions.updateDeployDraft({ operatingSystemId: system.id })}
                />
              ))}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 shadow-[var(--shadow-surface)]">
              <h3 className="type-label text-[var(--color-ink)]">{t('deploy.configure.ipConfiguration')}</h3>
              <div className="mt-5 grid gap-4">
                <NetworkToggleCard
                  badge={`+${formatDeployCurrency(deployPreview.ipv4Charge, deployDraft.billingDurationId)}`}
                  checked={ipv4Enabled}
                  description={t('deploy.configure.enableIpv4Copy')}
                  disabled={!ipv4Supported || ipv4Required}
                  label={t('deploy.configure.enableIpv4')}
                  onToggle={(checked) =>
                    actions.updateDeployDraft({
                      ipv4Enabled: checked,
                    })
                  }
                />
                <NetworkToggleCard
                  checked={ipv6Enabled}
                  description={t('deploy.configure.enableIpv6Copy')}
                  disabled={!ipv6Supported || ipv6Required}
                  label={t('deploy.configure.enableIpv6')}
                  onToggle={(checked) => actions.updateDeployDraft({ ipv6Enabled: checked })}
                />
              </div>
            </section>

            <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 shadow-[var(--shadow-surface)]">
              <h3 className="type-label text-[var(--color-ink)]">{t('common.serverName')}</h3>
              <p className="type-detail-copy mt-3 text-[var(--color-copy)]">
                {t('deploy.configure.serverNameCopy')}
              </p>
              <input
                className="type-input text-start mt-6 h-[58px] w-full rounded-[16px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                type="text"
                value={deployDraft.serverName}
                onChange={(event) => actions.updateDeployDraft({ serverName: event.target.value })}
              />
            </section>
          </div>
        </div>

        <aside className="w-full lg:sticky lg:top-8">
          <SurfaceCard className="overflow-hidden rounded-[24px]" padded={false}>
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-6">
              <div>
                <h3 className="type-card-title text-[var(--color-ink)]">
                  {t('common.summary')}
                </h3>
                <p className="type-label-sm mt-1 text-[var(--color-copy)]">
                  {t('common.configurationCheck')}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <FileText className="h-5 w-5" strokeWidth={2} />
              </span>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4">
                <SummaryDetailCard
                  label={t('common.location')}
                  secondary={selectedDatacenterLabel}
                  secondaryLabel={selectedDatacenterLabel ? t('serverDetail.dataCenter') : ''}
                  value={selectedLocationLabel}
                />

                <SummaryDetailCard
                  label={t('deploy.configure.operatingSystem')}
                  value={selectedSystemLabel}
                />

                <SummarySpecificationsCard plan={selectedPlan} />

                <SummaryDetailCard
                  label={t('common.serverName')}
                  value={deployDraft.serverName || selectedPlan?.title || t('servers.types.cloudVps', undefined, 'Cloud VPS')}
                />
              </div>
            </div>

            <div className="border-y border-[var(--color-border)] bg-[var(--color-surface-alt)] px-6 py-5">
              <div className="type-body flex items-center justify-between">
                <span className="type-body-strong text-[var(--color-ink)]">{t('common.billing')}</span>
                <span className="type-body-strong text-[var(--color-ink)]">
                  {t(selectedDuration?.labelKey, undefined, selectedDuration?.label)}
                </span>
              </div>
              <div className="type-detail-copy mt-4 flex items-center justify-between">
                <span className="text-[var(--color-copy)]">{t('common.selectedPrice')}</span>
                <span className="type-body-strong text-[var(--color-ink)]">
                  {formatDeployCurrency(selectedDuration?.total ?? 0, selectedDuration?.id ?? 'hourly')}
                </span>
              </div>
              <div className="type-detail-copy mt-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[var(--color-copy)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-primary-soft-strong)]" />
                  {networkLabel}
                </span>
                <span className="type-body-strong text-[var(--color-ink)]">
                  +{formatDeployCurrency(networkCharge, selectedDuration?.id ?? 'hourly')}
                </span>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div className="type-body-strong max-w-[120px] text-[var(--color-ink)]">
                  {checkoutLabel}
                </div>
                <div className="text-end">
                  <p className="type-price-xl text-[var(--color-primary)]">
                    {formatDeployCurrency(checkoutTotal, selectedDuration?.id ?? 'hourly')}
                  </p>
                </div>
              </div>

              <button
                className="theme-button-primary type-button inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-[16px] border px-6 transition"
                type="button"
                disabled={moneyActionsBlocked}
                onClick={handleConfirm}
              >
                {t('deploy.configure.confirmAndDeploy')}
                <ArrowRight className="rtl-flip h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>
          </SurfaceCard>
        </aside>
      </div>
    </DeployStepLayout>
  )
}
