import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  FileText,
  Plus,
  Receipt,
  Ticket,
  TrendingUp,
  WalletCards,
} from '@/components/icons'
import { Link, useNavigate } from 'react-router-dom'
import { resolveTicketPortalUrl } from '../config/tickets'
import { Button } from '../components/ui/Button'
import { DataTable } from '../components/ui/DataTable'
import { ServerAddressCell, ServerInstanceCell, ServerLocationCell } from '../components/ui/ServerTableCells'
import { StatusBadge } from '../components/ui/StatusBadge'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { LoadingState } from '../components/ui/LoadingState'
import { useDashboardApp } from '../context/useDashboardApp'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import {
  compareIpAddress,
  getServerDisplayName,
  getServerLocationLabel,
} from '../lib/serverTable'
import { formatRelativeTime } from '../lib/formatters'
import { redirectToWhmcsUrl } from '../lib/whmcsClientArea'

const DASHBOARD_ACTIVE_SERVER_LIMIT = 5
const activeDashboardStatusCodes = new Set(['active', 'online'])

function isActiveDashboardServer(server) {
  return activeDashboardStatusCodes.has(server.statusCode)
}

function SummaryMetric({ actions, icon: Icon, label, loading = false, unit, value }) {
  if (loading) {
    return (
      <div className="min-h-[150px] px-8 py-8">
        <div className="mb-6 flex items-center gap-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-info-soft)] text-[var(--color-primary)]">
            <Icon className="h-5 w-5" strokeWidth={2.1} />
          </span>
          <p className="type-label text-[var(--color-copy)]">{label}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Activity className="h-4 w-4 animate-spin" strokeWidth={2.1} />
          </span>
          <p className="type-body text-[var(--color-copy)]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[150px] px-8 py-8">
      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-info-soft)] text-[var(--color-primary)]">
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </span>
        <p className="type-label text-[var(--color-copy)]">{label}</p>
      </div>
      <div className="flex items-end gap-3">
        <p className="type-metric-lg text-[var(--color-ink)]">{value}</p>
        {unit ? <span className="type-body-strong mb-1 text-[var(--color-copy)]">{unit}</span> : null}
      </div>
      {actions ? <div className="mt-5">{actions}</div> : null}
    </div>
  )
}

export function DashboardPage() {
  const {
    tickets,
    ticketReadState,
    servers,
    invoices,
    invoiceReadState,
    serverOverview,
    companyProfile,
    loading,
    nativeRoutes,
    whmcsAccess,
    actions,
    formatCurrency,
    formatNumber,
    formatWhmcsCurrency,
    locale,
    localizeDigits,
    t,
  } = useDashboardApp()
  const navigate = useNavigate()
  const { copiedKey, copyValue } = useCopyToClipboard()
  const brandName = companyProfile?.name || 'Company'
  const supportTickets = tickets.slice(0, 2)
  const isOverviewLoading = loading.serverOverview || loading.directAuth || !serverOverview.ready
  const serviceRows = servers
    .filter(isActiveDashboardServer)
    .sort((a, b) => Number(b.orderId ?? 0) - Number(a.orderId ?? 0))
    .slice(0, DASHBOARD_ACTIVE_SERVER_LIMIT)
  const showWelcomeState =
    serverOverview.ready
    && serverOverview.directTokenPresent
    && Number(serverOverview.rawActiveOrdersTotal ?? 0) === 0
  const emptyResourcesMessage = isOverviewLoading ? (
    <LoadingState
      copy={t(
        'dashboard.loading.copy',
        undefined,
        'We are preparing your latest data.',
      )}
      size="compact"
      title={t('dashboard.loading.title', undefined, 'Loading your cloud summary...')}
    />
  ) : showWelcomeState ? (
    <div className="grid justify-items-center gap-3 text-center">
      <p className="type-card-title text-[var(--color-ink)]">
        {t('dashboard.emptyOrders.title', { brandName }, `Welcome to ${brandName}`)}
      </p>
      <p className="type-body text-[var(--color-copy)]">
        {t(
          'dashboard.emptyOrders.copy',
          undefined,
          'Your account is ready. Create your first service and it will appear here.',
        )}
      </p>
      <Link
        className="theme-button-primary type-button inline-flex items-center justify-center rounded-full border px-5 py-3"
        to="/deploy/location"
        onClick={() => actions.startDeploy()}
      >
        {t('common.actions.createService')}
      </Link>
    </div>
  ) : t('servers.noResults')
  const resourceColumns = [
    {
      key: 'instance',
      label: t('servers.table.instance'),
      mobileLayout: 'primary',
      sortable: true,
      sortValue: (server) => getServerDisplayName(server),
      render: (server) => <ServerInstanceCell name={getServerDisplayName(server)} />,
    },
    {
      key: 'location',
      label: t('servers.table.location'),
      sortable: true,
      sortValue: (server) => getServerLocationLabel(server, t),
      render: (server) => (
        <ServerLocationCell
          city={t(`locations.city.${server.location.cityCode}`, undefined, server.location.city)}
          country={t(
            `locations.country.${server.location.countryCode}`,
            undefined,
            server.location.country,
          )}
        />
      ),
    },
    {
      key: 'ipAddress',
      label: t('servers.table.ipAddress'),
      mobileCellClassName: 'text-start',
      sortable: true,
      sortComparator: (left, right) => compareIpAddress(left, right),
      sortValue: (server) => server.ipAddress,
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      mobileRender: (server) => (
        <ServerAddressCell
          addresses={[server.ipAddress, server.ipv6Address]}
          align="start"
          copiedValue={copiedKey}
          onCopy={async (event, address) => {
            event.stopPropagation()
            await copyValue(address, address)
          }}
        />
      ),
      render: (server) => (
        <ServerAddressCell
          addresses={[server.ipAddress, server.ipv6Address]}
          copiedValue={copiedKey}
          onCopy={async (event, address) => {
            event.stopPropagation()
            await copyValue(address, address)
          }}
        />
      ),
    },
  ]
  const latestInvoices = [...invoices]
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 2)

  return (
    <div className="mx-auto grid w-full max-w-[1320px] gap-12">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="type-page-eyebrow mb-2">
            <span className="text-[var(--color-primary)]">{t('dashboard.portal')}</span>
            <span className="text-[var(--color-copy)]"> / {t('dashboard.title')}</span>
          </p>
          <h1 className="type-page-title text-[var(--color-ink)]">{t('dashboard.title')}</h1>
        </div>
        <Button
          className="self-start px-7 py-4 sm:self-auto"
          onClick={() => {
            actions.startDeploy()
            navigate('/deploy/location')
          }}
        >
          <Plus className="h-5 w-5" strokeWidth={2.2} />
          {t('common.actions.deployService')}
        </Button>
      </section>

      <SurfaceCard
        className="overflow-hidden rounded-[26px]"
        padded={false}
      >
        <div className="grid divide-y divide-[var(--color-border)] md:grid-cols-3 md:divide-x md:divide-y-0">
          <SummaryMetric
            icon={WalletCards}
            label={t('dashboard.accountBalance')}
            loading={isOverviewLoading}
            value={formatCurrency(serverOverview.accountBalance)}
            actions={
              <div className="flex items-center gap-4">
                <Link className="theme-button-primary type-body-sm-strong rounded-full border px-4 py-2" to="/billing/add-funds">
                  {t('common.actions.addFunds')}
                </Link>
                <span className="h-5 w-px bg-[var(--color-border)]" />
                <Link className="type-body-sm-strong text-[var(--color-copy)]" to="/billing">
                  {t('common.history')}
                </Link>
              </div>
            }
          />
          <SummaryMetric
            icon={BriefcaseBusiness}
            label={t('dashboard.activeOrders')}
            loading={isOverviewLoading}
            value={formatNumber(serverOverview.activeOrders)}
          />
          <SummaryMetric
            icon={TrendingUp}
            label={t('dashboard.totalSpend')}
            loading={isOverviewLoading}
            value={formatCurrency(serverOverview.totalSpend)}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden rounded-[26px] border-transparent shadow-[var(--shadow-surface-strong)]" padded={false}>
        <div className="px-8 py-9 md:px-10 md:py-10">
          <h2 className="type-card-title text-[var(--color-ink)]">{t('dashboard.activeResources')}</h2>
          <DataTable
            className="mt-9"
            columns={resourceColumns}
            emptyMessage={emptyResourcesMessage}
            getRowKey={(server) => server.id}
            getRowProps={(server) => ({
              className: 'cursor-pointer',
              role: 'link',
              tabIndex: 0,
              onClick: () => navigate(`/servers/${server.id}`),
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate(`/servers/${server.id}`)
                }
              },
            })}
            gridClassName="grid grid-cols-[1.3fr_0.9fr_1fr] gap-4"
            minWidth="980px"
            rows={serviceRows}
            variant="card"
          />
        </div>
      </SurfaceCard>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
        <SurfaceCard className="min-h-[360px] rounded-[26px] p-8" padded={false}>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-info-soft)] text-[var(--color-primary)]">
                <Receipt className="h-5 w-5" strokeWidth={2} />
              </span>
              <h3 className="type-card-title text-[var(--color-ink)]">{t('dashboard.billing')}</h3>
            </div>
            <Link className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-panel-soft)] text-[var(--color-primary)]" to="/billing/add-funds">
              <Plus className="h-5 w-5" strokeWidth={2.2} />
            </Link>
          </div>
          <div className="space-y-7">
            {latestInvoices.length > 0 ? latestInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[18px] px-2 py-2 transition hover:bg-[var(--color-panel-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                to={`/billing/invoices/${invoice.id}`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-panel-soft)] text-[var(--color-muted)]">
                  <FileText className="h-5 w-5" strokeWidth={2} />
                </span>
                <div>
                  <p className="type-list-title text-[var(--color-ink)]">#{localizeDigits(invoice.id)}</p>
                  <p className="type-list-meta mt-1 text-[var(--color-copy)]">{formatRelativeTime(invoice.issuedDate, locale)}</p>
                </div>
                <div className="text-end">
                  <p className="type-list-title text-[var(--color-ink)]">
                    {invoice.totalDisplay ? localizeDigits(invoice.totalDisplay) : formatWhmcsCurrency(invoice.total)}
                  </p>
                  <p
                    className={`type-label-sm mt-1 ${
                      invoice.statusTone === 'success'
                        ? 'text-[var(--color-success)]'
                        : 'text-[var(--color-warning)]'
                    }`}
                  >
                    {t(`common.status.${invoice.statusCode}`, undefined, invoice.status)}
                  </p>
                </div>
              </Link>
            )) : (!whmcsAccess.canUseCustomTicketsAndInvoices || invoiceReadState.listNativeFallbackRequired) ? (
              <a
                className="theme-button-secondary type-button inline-flex w-fit items-center gap-3 rounded-full border px-5 py-3"
                href={nativeRoutes.invoiceListUrl}
              >
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
                {t('common.actions.openInWhmcs', undefined, 'Open in WHMCS')}
              </a>
            ) : (
              <div className="type-body rounded-[18px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-8 text-[var(--color-copy)]">
                {t('billing.invoices.empty', undefined, 'No invoices found yet.')}
              </div>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="min-h-[360px] rounded-[26px] p-8" padded={false}>
          <div className="mb-7 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-success-soft)] text-[var(--color-success)]">
                <Ticket className="h-5 w-5" strokeWidth={2} />
              </span>
              <h3 className="type-card-title text-[var(--color-ink)]">{t('dashboard.support')}</h3>
            </div>
            <button
              className="type-body-strong text-[var(--color-primary)]"
              type="button"
              onClick={() => redirectToWhmcsUrl(nativeRoutes.ticketCreateUrl)}
            >
              {t('common.actions.newTicket')}
            </button>
          </div>
          <div className="space-y-5">
            {supportTickets.length > 0 ? supportTickets.map((ticket) => (
              <a
                key={ticket.id}
                className="block rounded-[18px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)]"
                href={resolveTicketPortalUrl(ticket.id, ticket.portalUrl)}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <p className="type-list-title line-clamp-2 text-[var(--color-ink)]">
                    {ticket.subjectKey ? t(ticket.subjectKey, undefined, ticket.subject) : ticket.subject}
                  </p>
                  <StatusBadge tone={ticket.statusTone}>
                    {t(`common.status.${ticket.statusCode}`, undefined, ticket.status)}
                  </StatusBadge>
                </div>
                <p className="type-body-sm text-[var(--color-copy)]">
                  {ticket.activityLabelKey
                    ? t(ticket.activityLabelKey, undefined, ticket.activityLabel)
                    : formatRelativeTime(ticket.activityLabel, locale)}
                </p>
              </a>
            )) : (!whmcsAccess.canUseCustomTicketsAndInvoices || ticketReadState.nativeFallbackRequired) ? (
              <a
                className="theme-button-secondary type-button inline-flex w-fit items-center gap-3 rounded-full border px-5 py-3"
                href={nativeRoutes.ticketListUrl}
              >
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
                {t('common.actions.openInWhmcs', undefined, 'Open in WHMCS')}
              </a>
            ) : (
              <div className="type-body rounded-[18px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-8 text-[var(--color-copy)]">
                {t('tickets.list.empty', undefined, 'No tickets found yet.')}
              </div>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="min-h-[360px] rounded-[26px] p-8" padded={false}>
          <div className="mb-7 flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-accent-purple-soft)] text-[var(--color-accent-purple)]">
              <Activity className="h-5 w-5" strokeWidth={2} />
            </span>
            <h3 className="type-card-title text-[var(--color-ink)]">{t('dashboard.activity')}</h3>
          </div>
          <div className="type-body flex min-h-[88px] items-center rounded-[18px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 text-[var(--color-copy)]">
            {t('dashboard.noRecentActivity')}
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}
