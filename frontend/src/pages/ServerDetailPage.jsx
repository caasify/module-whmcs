import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Copy,
  Cpu,
  Database,
  Eye,
  EyeOff,
  HardDrive,
  Info,
  Play,
  RefreshCw,
  Server,
  Square,
  Terminal,
  Zap,
} from '@/components/icons'
import { useEffect, useEffectEvent, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import { LoadingState } from '../components/ui/LoadingState'
import { MetricCard } from '../components/ui/MetricCard'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { StepProgress } from '../components/ui/StepProgress'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { useDashboardApp } from '../context/useDashboardApp'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import { translateDatacenterName } from '../lib/locationDisplay'
import { formatOperatingSystemDisplayName } from '../lib/operatingSystems'
import { getServerProvisioningStatus } from '../lib/services/server'
import { cn } from '../lib/cn'
import { formatRelativeTime } from '../lib/formatters'

function getServerFlag(locationCode) {
  if (locationCode === 'TR') {
    return '🇹🇷'
  }

  if (locationCode === 'US' || locationCode === 'USA') {
    return '🇺🇸'
  }

  return '🌐'
}

function formatUsageValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function buildActivityHistory(server) {
  return Array.isArray(server.activityLog) ? server.activityLog : []
}

function getManagementModel(server, cloudVpsConfig, formatCurrency, locale, t) {
  const usedOutbound = Number(server.outboundUsed ?? 0)
  const outboundLimit = Number(server.outboundLimit ?? 0)
  const usagePercent = outboundLimit > 0 ? Math.round((usedOutbound / outboundLimit) * 100) : 0
  const flag = getServerFlag(server.location?.code)
  const rawIpAddress = String(server.ipAddress ?? '').trim()
  const rawIpv6Address = String(server.ipv6Address ?? '').trim()
  const ipAddress = rawIpAddress && rawIpAddress !== 'n/a' ? rawIpAddress : ''
  const ipv6Address = rawIpv6Address && rawIpv6Address !== 'n/a' ? rawIpv6Address : ''
  const username = String(server.username ?? '').trim() || 'root'
  const ipAvailable = ipAddress !== ''
  const ipv6Available = ipv6Address !== ''
  const additionalOutboundRate = formatCurrency(server.hourlyCost ?? 0)
  const datacenterName = String(server.datacenterName ?? '').trim()
  const translatedDatacenterName = translateDatacenterName(t, datacenterName)
  const shouldShowDatacenterName = cloudVpsConfig?.displayDatacenterName === true && datacenterName !== ''
  const translatedInfrastructure = t(
    `servers.infrastructure.${server.infrastructureCode}`,
    undefined,
    server.infrastructure ?? (server.typeCode === 'cloudVps' ? 'BigCore' : 'WHMCS'),
  )
  const infrastructureMatchesDatacenter = translatedDatacenterName !== '' && translatedInfrastructure === translatedDatacenterName
  const metadataRows = []

  if (shouldShowDatacenterName) {
    metadataRows.push({ label: t('serverDetail.dataCenter'), value: translatedDatacenterName })
  }

  if (!infrastructureMatchesDatacenter) {
    metadataRows.push({
      label: t('serverDetail.infrastructure'),
      value: translatedInfrastructure,
    })
  }

  metadataRows.push(
    {
      label: t('serverDetail.order'),
      value: server.orderNumber ?? `#${server.id.replace('srv-', '').slice(0, 6).toUpperCase()}`,
    },
    {
      label: t('serverDetail.totalExpenses'),
      value: formatCurrency(server.totalExpenses ?? server.monthlyCost ?? 0),
    },
  )

  return {
    flag,
    name: server.managementName ?? server.name,
    statusLabel: t(`common.status.${server.statusCode}`, undefined, server.status ?? 'Online'),
    city: t(`locations.city.${server.location?.cityCode}`, undefined, server.location?.city ?? 'Unknown'),
    country: t(
      `locations.country.${server.location?.countryCode}`,
      undefined,
      server.location?.country ?? 'Unknown',
    ),
    typeLabel: t(`servers.types.${server.typeCode}`, undefined, server.type ?? 'VPS'),
    operatingSystem: formatOperatingSystemDisplayName(t, server.operatingSystem ?? 'Unknown OS'),
    family: t(`servers.family.${server.familyCode}`, undefined, server.family ?? 'Linux'),
    createdAgo: server.createdAgoKey
      ? t(server.createdAgoKey, undefined, server.createdAgo)
      : formatRelativeTime(server.createdAgo ?? server.createdAt, locale) ?? t('common.relative.justNow'),
    createdDate: server.createdAt,
    hourlyCost: formatCurrency(server.hourlyCost ?? 0),
    monthlyEquivalent: formatCurrency(server.monthlyCost ?? 0),
    cpu: server.cpu ?? '1 vCPU',
    ram: server.ram ?? '1 GB RAM',
    storage: server.storage ?? '25 GB SSD',
    ipAddress,
    ipv6Address,
    username,
    password: server.password ?? 'not-available',
    outboundUsed: formatUsageValue(usedOutbound),
    inboundUsed: formatUsageValue(Number(server.inboundUsed ?? 0)),
    outboundLimit,
    usagePercent,
    additionalOutboundRate,
    activityLog: buildActivityHistory(server),
    metadataRows,
    quickConnect: ipAvailable
      ? `ssh ${username}@${ipAddress}`
      : t('common.connectionUnavailable'),
    canLaunchConsole: ipAvailable,
    canManageDirectly: ipAvailable || ipv6Available,
  }
}

function SectionHeader({ children }) {
  return (
    <div className="flex items-center gap-4 px-3">
      <span className="h-9 w-1.5 rounded-full bg-[var(--color-primary)]" />
      <h2 className="type-section-title text-[var(--color-ink)]">{children}</h2>
    </div>
  )
}

function IconButton({ children, onClick, title }) {
  return (
    <button
      className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-copy)] shadow-[var(--shadow-panel)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
      type="button"
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  )
}

function ConnectionField({ label, value, mono = false, actions, placeholder = false }) {
  return (
    <div className="grid gap-2.5">
      <p className="type-label text-[var(--color-copy)]">{label}</p>
      <div className="flex items-stretch gap-2">
        <div
          className={cn(
            'type-body flex h-14 flex-1 items-center rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-[var(--color-ink)] shadow-[var(--shadow-panel)]',
            mono && 'type-mono dir-ltr',
            placeholder && 'text-[var(--color-copy)]',
          )}
        >
          {value}
        </div>
        {actions}
      </div>
    </div>
  )
}

function getProvisioningSummaryKey(provisioningStatus) {
  if (provisioningStatus.isReady) {
    return 'serverDetail.provisioningReady'
  }

  const nextStep = provisioningStatus.steps.find((step) => !step.complete)?.key ?? 'order'

  if (nextStep === 'setup') {
    return 'serverDetail.provisioningSetupCopy'
  }

  if (nextStep === 'network') {
    return 'serverDetail.provisioningNetworkCopy'
  }

  if (nextStep === 'online') {
    return 'serverDetail.provisioningOnlineCopy'
  }

  return 'serverDetail.provisioningOrderCopy'
}

function ActivityTimelineCard({ items, locale, subtitle, t, className }) {
  return (
    <SurfaceCard className={cn('rounded-[30px] px-8 py-8 md:px-9', className)} padded={false}>
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--color-secondary-soft)] text-[var(--color-secondary)]">
          <Zap className="h-6 w-6" strokeWidth={2} />
        </span>
        <div>
          <h3 className="type-card-title text-[var(--color-ink)]">{t('serverDetail.activity')}</h3>
          {subtitle ? <p className="type-body mt-2 text-[var(--color-copy)]">{subtitle}</p> : null}
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mt-8 grid gap-7">
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full border bg-[var(--color-surface)] shadow-[var(--shadow-panel)]',
                    item.tone === 'warning'
                      ? 'border-[var(--color-warning-panel-border)] text-[var(--color-warning)]'
                      : 'border-[var(--color-success-border)] text-[var(--color-success)]',
                  )}
                >
                  {item.actionCode === 'stop' ? (
                    <Square className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Play className="h-4 w-4" strokeWidth={2} />
                  )}
                </span>
                {index < items.length - 1 ? <span className="mt-2 h-16 w-px bg-[var(--color-border)]" /> : null}
              </div>

              <div className="pt-1">
                <p className="type-card-title text-[var(--color-ink)]">
                  {t(`servers.activity.${item.actionCode}`, undefined, item.action)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="type-body-lg text-[var(--color-copy)]">
                    {t(`common.status.${item.statusCode}`, undefined, item.status)}
                  </p>
                  <span
                    className={cn(
                      'type-badge rounded-full px-3 py-1',
                      item.tone === 'warning'
                        ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
                        : 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
                    )}
                  >
                    {t('common.status.delivered')}
                  </span>
                </div>
              </div>

              <p className="type-body pt-2 text-[var(--color-copy)]">
                {item.ageKey ? t(item.ageKey, undefined, item.age) : formatRelativeTime(item.age, locale)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="type-body-lg mt-8 text-[var(--color-copy)]">{t('dashboard.noRecentActivity')}</p>
      )}
    </SurfaceCard>
  )
}

export function ServerDetailPage() {
  const navigate = useNavigate()
  const { serverId } = useParams()
  const {
    serverDetails,
    serverActionStates,
    actions,
    cloudVpsConfig,
    formatCurrency,
    formatNumber,
    isRtl,
    locale,
    localizeDigits,
    t,
  } = useDashboardApp()
  const server = serverId ? serverDetails[serverId] ?? null : null
  const [activeTab, setActiveTab] = useState('dashboard')
  const [detailStatus, setDetailStatus] = useState(() => (serverId ? 'loading' : 'idle'))
  const [pendingConfirmation, setPendingConfirmation] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const { copiedKey, copyValue } = useCopyToClipboard()
  const handleLoadServerDetail = useEffectEvent(async (nextServerId) => {
    const nextServer = await actions.loadServerDetail(nextServerId)
    setDetailStatus(nextServer ? 'ready' : 'missing')
  })
  const handleMonitorServer = useEffectEvent((nextServerId) => {
    void actions.loadServerDetail(nextServerId)
  })

  useEffect(() => {
    if (!serverId) {
      setDetailStatus('idle')
      return
    }

    setDetailStatus('loading')
    void handleLoadServerDetail(serverId)
  }, [serverId])

  const poweredOn = Boolean(server?.powerState)
  const pendingPowerAction = serverId ? serverActionStates[serverId]?.powerAction ?? null : null
  const effectivePoweredOn = pendingPowerAction ? pendingPowerAction === 'start' : poweredOn
  const provisioningStatus = getServerProvisioningStatus(server)
  const shouldMonitorServer = provisioningStatus.isProvisioning || Boolean(pendingPowerAction)

  useEffect(() => {
    if (!serverId || !shouldMonitorServer) {
      return
    }

    const intervalId = window.setInterval(() => {
      handleMonitorServer(serverId)
    }, 5000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [serverId, shouldMonitorServer])

  if (detailStatus === 'loading' || (serverId && !server && detailStatus === 'idle')) {
    return (
      <div className="page-grid mx-auto max-w-[1120px]">
        <div className="flex justify-start">
          <Button
            className="type-button w-fit rounded-full px-6 py-3 text-[var(--color-copy)]"
            to="/servers"
            variant="secondary"
          >
            <ArrowLeft className={`h-4 w-4 ${isRtl ? 'rtl-flip' : ''}`} strokeWidth={2.3} />
            {t('common.actions.backToServers')}
          </Button>
        </div>

        <LoadingState
          copy={t(
            'serverDetail.loading.copy',
            undefined,
            'Your order details will appear here in a moment.',
          )}
          title={t('serverDetail.loading.title', undefined, 'Loading order details...')}
        />
      </div>
    )
  }

  if (!server) {
    return (
      <div className="page-grid mx-auto max-w-[1120px]">
        <div className="flex justify-start">
          <Button
            className="type-button w-fit rounded-full px-6 py-3 text-[var(--color-copy)]"
            to="/servers"
            variant="secondary"
          >
            <ArrowLeft className={`h-4 w-4 ${isRtl ? 'rtl-flip' : ''}`} strokeWidth={2.3} />
            {t('common.actions.backToServers')}
          </Button>
        </div>

        <section className="rounded-[36px] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-10 shadow-[var(--shadow-surface-strong)] sm:px-10 lg:px-12">
          <h1 className="type-page-title text-[var(--color-ink)]">{t('header.pages.servers')}</h1>
          <p className="type-body-lg mt-4 text-[var(--color-copy)]">
            {t('servers.detailMissing', undefined, 'Server details are not available right now.')}
          </p>
        </section>
      </div>
    )
  }

  const model = getManagementModel(server, cloudVpsConfig, formatCurrency, locale, t)
  const recentActivity = model.activityLog.slice(0, 3)
  const activityHistory = model.activityLog.slice(0, 10)
  const passwordText = showPassword ? model.password : '•'.repeat(Math.max(12, model.password.length))
  const powerStatusCopy = pendingPowerAction === 'start'
    ? t('serverDetail.powerStarting')
    : pendingPowerAction === 'stop'
      ? t('serverDetail.powerStopping')
      : poweredOn
        ? t('serverDetail.powerRunning')
        : t('serverDetail.powerStopped')
  const provisioningSteps = [
    t('serverDetail.provisioningStep.order'),
    t('serverDetail.provisioningStep.setup'),
    t('serverDetail.provisioningStep.network'),
    t('serverDetail.provisioningStep.online'),
  ]
  const confirmationContent = pendingConfirmation
    ? {
        reboot: {
          confirmLabel: t('common.actions.reboot'),
          description: t('serverDetail.confirmRestartCopy'),
          title: t('serverDetail.confirmRestartTitle'),
          tone: 'info',
        },
        rebuild: {
          confirmLabel: t('common.actions.rebuild'),
          description: t('serverDetail.confirmRebuildCopy'),
          title: t('serverDetail.confirmRebuildTitle'),
          tone: 'warning',
        },
        delete: {
          confirmLabel: t('common.actions.delete'),
          description: t('serverDetail.confirmDeleteCopy'),
          title: t('serverDetail.confirmDeleteTitle'),
          tone: 'danger',
        },
      }[pendingConfirmation]
    : null

  async function handleConfirmAction() {
    if (!pendingConfirmation) {
      return
    }

    if (pendingConfirmation === 'reboot') {
      await actions.rebootServer(server.id)
      setPendingConfirmation(null)
      return
    }

    if (pendingConfirmation === 'rebuild') {
      await actions.rebuildServer(server.id)
      setPendingConfirmation(null)
      return
    }

    const deletedName = await actions.deleteServer(server.id)
    setPendingConfirmation(null)

    if (deletedName) {
      navigate('/servers')
    }
  }

  const managementTabs = [
    { label: t('serverDetail.tabs.dashboard'), value: 'dashboard' },
    { label: t('serverDetail.tabs.network'), value: 'network' },
    { label: t('serverDetail.tabs.activity'), value: 'activity' },
  ]

  return (
    <div className="mx-auto grid w-full max-w-[1320px] gap-6 md:gap-7">
      <SurfaceCard className="rounded-[34px] px-8 py-8 md:px-10 md:py-10 xl:px-12 xl:py-12" padded={false}>
        <div className="grid gap-10">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-start">
            <div className="grid gap-8">
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="type-page-title text-[var(--color-ink)]">{model.name}</h1>
                <span className="type-body-strong inline-flex items-center gap-2 rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-soft)] px-4 py-2 text-[var(--color-success)]">
                  <span className="h-3 w-3 rounded-full bg-current" />
                  {model.statusLabel}
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:max-w-[760px]">
                <div className="flex items-center gap-4">
                  <span className="type-symbol-lg flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-panel-soft)]">
                    {model.flag}
                  </span>
                  <div>
                    <p className="type-label text-[var(--color-copy)]">{t('serverDetail.location')}</p>
                    <p className="type-detail-value mt-2 text-[var(--color-ink)]">{model.city}</p>
                    <p className="type-detail-copy mt-1 text-[var(--color-copy)]">{model.country}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-panel-soft)] text-[var(--color-copy)]">
                    <CalendarDays className="h-6 w-6" strokeWidth={1.9} />
                  </span>
                  <div>
                    <p className="type-label text-[var(--color-copy)]">{t('serverDetail.created')}</p>
                    <p className="type-detail-value mt-2 text-[var(--color-ink)]">{model.createdAgo}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 text-start xl:text-end">
              <p className="type-page-subtitle text-[var(--color-copy)]">{t('dashboard.table.monthlyCost')}</p>
              <p className="type-price-xl text-[var(--color-ink)]">{model.monthlyEquivalent}</p>
              <p className="type-price-unit text-[var(--color-copy)]">{model.typeLabel}</p>
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-10">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center">
              <div>
                <h2 className="type-section-title text-[var(--color-ink)]">{t('serverDetail.serverPower')}</h2>
                <p className="type-page-subtitle mt-3 text-[var(--color-copy)]">
                  {powerStatusCopy}
                </p>
              </div>

              <div className="grid gap-5 xl:justify-items-end">
                <button
                  aria-label={t('serverDetail.serverPower')}
                  aria-busy={Boolean(pendingPowerAction)}
                  aria-pressed={effectivePoweredOn}
                  className={cn(
                    'relative h-[72px] w-[196px] justify-self-start rounded-full shadow-[var(--shadow-panel)] transition-all duration-300 xl:justify-self-end',
                    effectivePoweredOn
                      ? 'bg-[var(--color-success)] text-[#071126]'
                      : 'bg-[var(--color-panel-soft)] text-[var(--color-ink)]',
                    pendingPowerAction && 'cursor-wait opacity-80',
                  )}
                  disabled={Boolean(pendingPowerAction)}
                  type="button"
                  onClick={() => actions.toggleServerPower(server.id)}
                >
                  <span
                    className={cn(
                      'absolute top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] shadow-[var(--shadow-panel)] transition-all duration-300',
                      effectivePoweredOn
                        ? isRtl
                          ? 'left-2'
                          : 'right-2'
                        : isRtl
                          ? 'right-2'
                          : 'left-2',
                    )}
                  >
                    <span className="relative h-7 w-7 rounded-full border-[3px] border-[var(--color-success)]">
                      <span className="absolute left-1/2 top-[-4px] h-4 w-[3px] -translate-x-1/2 rounded-full bg-[var(--color-success)]" />
                    </span>
                  </span>
                </button>

                {pendingPowerAction ? (
                  <div className="type-body-sm flex items-center gap-2 text-[var(--color-copy)] xl:justify-end">
                    <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={2} />
                    {powerStatusCopy}
                  </div>
                ) : null}

                <Button
                  className="w-full justify-center rounded-full py-5 xl:max-w-[220px]"
                  variant="secondary"
                  onClick={() => setPendingConfirmation('reboot')}
                >
                  <RefreshCw className="h-5 w-5" strokeWidth={2.1} />
                  {t('common.actions.reboot')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {provisioningStatus.isProvisioning ? (
        <SurfaceCard className="rounded-[30px] px-8 py-8 md:px-10" padded={false}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="type-section-title text-[var(--color-ink)]">{t('serverDetail.provisioningTitle')}</h2>
              <p className="type-body-lg mt-3 max-w-3xl text-[var(--color-copy)]">
                {t(getProvisioningSummaryKey(provisioningStatus))}
              </p>
            </div>
            <span className="type-badge inline-flex items-center rounded-full bg-[var(--color-info-soft)] px-4 py-2 text-[var(--color-primary)]">
              {t('serverDetail.provisioningInProgress')}
            </span>
          </div>

          <div className="mt-8">
            <StepProgress currentStep={provisioningStatus.currentStep} steps={provisioningSteps} />
          </div>
        </SurfaceCard>
      ) : null}

      <ConfirmationDialog
        cancelLabel={t('common.actions.cancel')}
        confirmLabel={confirmationContent?.confirmLabel ?? t('common.actions.close')}
        description={confirmationContent?.description ?? ''}
        open={Boolean(confirmationContent)}
        title={confirmationContent?.title ?? ''}
        tone={confirmationContent?.tone}
        onClose={() => setPendingConfirmation(null)}
        onConfirm={handleConfirmAction}
      />

      <SegmentedTabs
        ariaLabel={t('serverDetail.tabs.label')}
        className="px-1"
        items={managementTabs}
        onChange={setActiveTab}
        value={activeTab}
        variant="underline"
      />

      {activeTab === 'network' ? (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <MetricCard
              badge={t('common.free')}
              caption={t('serverDetail.freeIngressTraffic')}
              className="rounded-[30px]"
              icon={Server}
              label={t('serverDetail.inbound')}
              suffix="GB"
              tone="success"
              value={localizeDigits(model.inboundUsed)}
            />
            <MetricCard
              caption={t('serverDetail.monthlyAllowance', { value: model.outboundLimit })}
              className="rounded-[30px]"
              icon={ArrowUpRight}
              label={t('serverDetail.outbound')}
              suffix="GB"
              value={localizeDigits(formatUsageValue(Number(server.outboundUsed ?? 0)))}
            />
          </div>

          <SurfaceCard className="overflow-hidden rounded-[30px] px-8 py-8 md:px-10" padded={false}>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <h2 className="type-section-title text-[var(--color-ink)]">{t('serverDetail.monthlyOutboundUsage')}</h2>
                <p className="type-body-lg mt-3 max-w-2xl text-[var(--color-copy)]">
                  {t('serverDetail.monthlyOutboundDescription')}
                </p>
              </div>
              <div className="rounded-[22px] border border-[var(--color-info-border)] bg-[var(--color-info-soft)] px-6 py-4 text-end">
                <p className="type-metric-md text-[var(--color-primary)]">{formatNumber(model.usagePercent)}%</p>
                <p className="type-label mt-1 text-[var(--color-copy)]">{t('serverDetail.liveUsage')}</p>
              </div>
            </div>

            <div className="mt-8 h-4 overflow-hidden rounded-full bg-[var(--color-panel-soft)] ring-1 ring-[var(--color-border-contrast)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-success))] transition"
                style={{ width: `${Math.min(model.usagePercent, 100)}%` }}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="type-metric-sm text-[var(--color-ink)]">{localizeDigits(model.outboundUsed)}</span>
                <span className="type-body-lg-strong text-[var(--color-copy)]">{t('serverDetail.gbUsed')}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="type-metric-sm text-[var(--color-ink)]">{formatNumber(model.outboundLimit)}</span>
                <span className="type-body-lg-strong text-[var(--color-copy)]">{t('serverDetail.gbIncluded')}</span>
              </div>
            </div>

            <div
              className={cn(
                'mt-8 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-5 md:px-7',
              )}
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-5">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[var(--color-surface-elevated)] text-[var(--color-primary)] shadow-[var(--shadow-panel)]">
                    <Info className="h-7 w-7" strokeWidth={2} />
                  </span>
                  <div>
                    <h3 className="type-card-title text-[var(--color-ink)]">{t('serverDetail.billingOverview')}</h3>
                    <p className="type-body-lg mt-3 text-[var(--color-copy)]">
                      {t('serverDetail.billingOverviewCopy', { allowance: model.outboundLimit })}
                    </p>
                  </div>
                </div>
                <span className="type-body-lg-strong flex shrink-0 items-center justify-center rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 py-3 text-[var(--color-primary)] shadow-[var(--shadow-panel)]">
                  {model.additionalOutboundRate}/GB
                </span>
              </div>
            </div>
          </SurfaceCard>
        </>
      ) : activeTab === 'activity' ? (
        <ActivityTimelineCard
          className="px-8 py-8 md:px-10"
          items={activityHistory}
          locale={locale}
          subtitle={t('serverDetail.activityWindow', { count: 10 })}
          t={t}
        />
      ) : (
        <>
          <SectionHeader>{t('serverDetail.accessAndConnect')}</SectionHeader>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_380px]">
            <SurfaceCard className="rounded-[30px] px-8 py-8 md:px-10" padded={false}>
              <h3 className="type-card-title text-[var(--color-ink)]">{t('serverDetail.connectionDetails')}</h3>

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <ConnectionField
                  actions={
                    model.ipAddress ? (
                      <IconButton title={t('serverDetail.copyIp')} onClick={() => copyValue('ip-address', model.ipAddress)}>
                        {copiedKey === 'ip-address' ? <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" strokeWidth={2} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
                      </IconButton>
                    ) : null
                  }
                  label={t('serverDetail.ipAddress')}
                  mono
                  value={model.ipAddress}
                />
                <ConnectionField
                  actions={
                    <IconButton title={t('serverDetail.copyUsername')} onClick={() => copyValue('username', model.username)}>
                      {copiedKey === 'username' ? <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" strokeWidth={2} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
                    </IconButton>
                  }
                  label={t('serverDetail.username')}
                  mono
                  value={model.username}
                />
                <ConnectionField
                  actions={
                    model.ipv6Address ? (
                      <IconButton title={t('serverDetail.copyIpv6')} onClick={() => copyValue('ipv6-address', model.ipv6Address)}>
                        {copiedKey === 'ipv6-address' ? <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" strokeWidth={2} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
                      </IconButton>
                    ) : null
                  }
                  label={t('serverDetail.ipv6')}
                  mono
                  value={model.ipv6Address}
                />
                <ConnectionField
                  actions={
                    <div className="flex items-stretch gap-2">
                      <IconButton title={showPassword ? t('serverDetail.hidePassword') : t('serverDetail.showPassword')} onClick={() => setShowPassword((current) => !current)}>
                        {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
                      </IconButton>
                      <IconButton title={t('serverDetail.copyPassword')} onClick={() => copyValue('password', model.password)}>
                        {copiedKey === 'password' ? <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" strokeWidth={2} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
                      </IconButton>
                    </div>
                  }
                  label={t('serverDetail.password')}
                  mono
                  value={passwordText}
                />
              </div>

              <div className="mt-8 border-t border-[var(--color-border)] pt-8">
                <p className="type-label text-[var(--color-copy)]">{t('serverDetail.quickConnectSsh')}</p>
                <div className="mt-4 flex overflow-hidden rounded-[20px] bg-[var(--color-code-surface)] shadow-[var(--shadow-panel)]">
                  <div className="type-mono dir-ltr min-w-0 flex-1 overflow-x-auto px-6 py-5 text-[var(--color-code-text)]">
                    {model.quickConnect}
                  </div>
                  <button
                    className="flex w-[72px] items-center justify-center bg-[var(--color-code-action)] text-white transition hover:bg-[var(--color-code-action-hover)]"
                    type="button"
                    onClick={() => copyValue('ssh-command', model.quickConnect)}
                  >
                    {copiedKey === 'ssh-command' ? (
                      <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" strokeWidth={2} />
                    ) : (
                      <Copy className="h-5 w-5" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard className="rounded-[30px] px-8 py-10" padded={false}>
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-nav-active)] text-[var(--color-primary)]">
                  <Terminal className="h-11 w-11" strokeWidth={1.8} />
                </span>
                <h3 className="type-section-title mt-8 text-[var(--color-ink)]">{t('serverDetail.webConsole')}</h3>
                <p className="type-body-lg mt-5 max-w-[270px] text-[var(--color-copy)]">
                  {t('serverDetail.webConsoleCopy')}
                </p>
                <Button
                  className="mt-10 w-full justify-center rounded-[20px] py-5"
                  disabled={!model.canLaunchConsole}
                >
                  <ArrowUpRight className="h-5 w-5" strokeWidth={2.1} />
                  {t('common.actions.launchConsole')}
                </Button>
              </div>
            </SurfaceCard>
          </div>

          <SectionHeader>{t('serverDetail.configurationAndSystem')}</SectionHeader>

          <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
            <SurfaceCard className="rounded-[30px] px-8 py-8 md:px-9" padded={false}>
              <h3 className="type-card-title text-[var(--color-ink)]">{t('common.specifications')}</h3>

              <div className="mt-8 grid gap-6">
                {[
                  {
                    label: t('deploy.plan.cpu'),
                    value: model.cpu,
                    subtitle: server.cpuSubtitle ?? 'Intel-V4-Shared',
                    icon: <Cpu className="h-5 w-5" strokeWidth={2} />,
                    tone: 'text-[var(--color-primary)]',
                  },
                  {
                    label: t('serverDetail.memory'),
                    value: model.ram,
                    subtitle: '',
                    icon: <Database className="h-5 w-5" strokeWidth={2} />,
                    tone: 'text-[var(--color-secondary)]',
                  },
                  {
                    label: t('serverDetail.storage'),
                    value: model.storage,
                    subtitle: '',
                    icon: <HardDrive className="h-5 w-5" strokeWidth={2} />,
                    tone: 'text-[var(--color-warning)]',
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-5">
                    <span className={cn('flex h-14 w-14 items-center justify-center rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)]', item.tone)}>
                      {item.icon}
                    </span>
                    <div>
                      <p className="type-label text-[var(--color-copy)]">{item.label}</p>
                      <p className="type-body-lg-strong mt-2 text-[var(--color-ink)]">{localizeDigits(item.value)}</p>
                      {item.subtitle ? <p className="type-body mt-1 text-[var(--color-copy)]">{localizeDigits(item.subtitle)}</p> : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 border-t border-[var(--color-border)] pt-8">
                <div className="grid gap-4">
                  {model.metadataRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4">
                      <p className="type-label text-[var(--color-copy)]">{row.label} :</p>
                      <p className="type-body-lg-strong text-end text-[var(--color-ink)]">{localizeDigits(row.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </SurfaceCard>

            <div className="grid gap-6">
              <ActivityTimelineCard
                items={recentActivity}
                locale={locale}
                subtitle={t('serverDetail.activityWindow', { count: 3 })}
                t={t}
              />

              <SurfaceCard
                className="rounded-[30px] border-[var(--color-danger-border)] px-8 py-8 md:px-9"
                padded={false}
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[var(--color-danger-soft)] text-[var(--color-danger-copy)]">
                    <AlertTriangle className="h-7 w-7" strokeWidth={2} />
                  </span>
                  <div>
                    <h3 className="type-card-title text-[var(--color-ink)]">{t('serverDetail.dangerZone')}</h3>
                    <p className="type-body-lg mt-2 text-[var(--color-copy)]">{t('serverDetail.dangerZoneCopy')}</p>
                  </div>
                </div>

                <div className="mt-7 grid gap-5 lg:grid-cols-2">
                  <div className="rounded-[24px] border border-[var(--color-warning-panel-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-surface)]">
                    <h4 className="type-card-title text-[var(--color-ink)]">{t('serverDetail.rebuildServer')}</h4>
                    <p className="type-body mt-4 text-[var(--color-copy)]">
                      {t('serverDetail.rebuildServerCopy')}
                    </p>
                    <button
                      className="theme-button-secondary type-button mt-8 flex w-full items-center justify-center rounded-[18px] border border-[var(--color-warning-panel-border)] px-5 py-4"
                      type="button"
                      onClick={() => setPendingConfirmation('rebuild')}
                    >
                      {t('common.actions.rebuild')}
                    </button>
                  </div>

                  <div className="rounded-[24px] border border-[var(--color-danger-border)] bg-[var(--color-danger-panel)] p-6">
                    <h4 className="type-card-title text-[var(--color-danger-title)]">{t('serverDetail.deleteServer')}</h4>
                    <p className="type-body mt-4 text-[var(--color-danger-copy)]">
                      {t('serverDetail.deleteServerCopy')}
                    </p>
                    <button
                      className="type-button mt-8 flex w-full items-center justify-center rounded-[18px] border border-[var(--color-danger-strong)] bg-[var(--color-danger-strong)] px-5 py-4 text-white transition hover:bg-[var(--color-danger-strong-hover)]"
                      type="button"
                      onClick={() => setPendingConfirmation('delete')}
                    >
                      {t('common.actions.delete')}
                    </button>
                  </div>
                </div>
              </SurfaceCard>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
