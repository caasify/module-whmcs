import { ArrowUpRight, CirclePlus } from '@/components/icons'
import { formatTicketDisplayId, resolveTicketPortalUrl } from '../config/tickets'
import { Button } from '../components/ui/Button'
import { DataTable } from '../components/ui/DataTable'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { WhmcsRedirectPanel } from '../components/ui/WhmcsRedirectPanel'
import { useDashboardApp } from '../context/useDashboardApp'
import { formatRelativeTime, getDateSortValue } from '../lib/formatters'
import { redirectToWhmcsUrl } from '../lib/whmcsClientArea'

function TicketSummaryCard({ label, value }) {
  return (
    <SurfaceCard className="min-h-[132px] rounded-[22px] px-7 py-7" padded={false}>
      <p className="type-label text-[var(--color-copy)]">{label}</p>
      <p className="type-metric-lg mt-6 text-[var(--color-ink)]">{value}</p>
    </SurfaceCard>
  )
}

export function TicketListPage() {
  const {
    formatNumber,
    locale,
    localizeDigits,
    nativeRoutes,
    ticketReadState,
    tickets,
    loading,
    whmcsAccess,
    t,
  } = useDashboardApp()
  const openCount = tickets.filter((ticket) => ticket.statusCode === 'open').length
  const awaitingCount = tickets.filter((ticket) => ticket.statusCode === 'awaitingReply').length

  if (!whmcsAccess.canUseCustomTicketsAndInvoices || ticketReadState.nativeFallbackRequired) {
    return (
      <WhmcsRedirectPanel
        actionLabel={t('common.actions.openInWhmcs', undefined, 'Open in WHMCS')}
        actionUrl={nativeRoutes.ticketListUrl}
        description={t(
          'tickets.list.nativeRedirect.description',
          undefined,
          'This account uses the native WHMCS support pages for ticket access.',
        )}
        eyebrow={t('tickets.center')}
        title={t('tickets.list.title')}
      />
    )
  }

  const columns = [
    {
      key: 'ticket',
      label: t('tickets.table.ticket'),
      mobileLayout: 'primary',
      sortable: true,
      sortValue: (ticket) => ticket.caseId || ticket.id,
      render: (ticket) => (
        <div>
          <p className="type-list-title text-[var(--color-ink)]">
            {localizeDigits(formatTicketDisplayId(ticket.caseId || ticket.id))}
          </p>
        </div>
      ),
    },
    {
      key: 'subject',
      label: t('tickets.table.subject'),
      sortable: true,
      sortValue: (ticket) =>
        ticket.subjectKey ? t(ticket.subjectKey, undefined, ticket.subject) : ticket.subject,
      render: (ticket) => (
        <div>
          <p className="type-list-title text-[var(--color-ink)]">
            {ticket.subjectKey ? t(ticket.subjectKey, undefined, ticket.subject) : ticket.subject}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('tickets.table.status'),
      sortable: true,
      sortValue: (ticket) => t(`common.status.${ticket.statusCode}`, undefined, ticket.status),
      render: (ticket) => (
        <StatusBadge
          className="w-fit px-4 py-2"
          tone={ticket.statusTone}
          withDot
        >
          {t(`common.status.${ticket.statusCode}`, undefined, ticket.status)}
        </StatusBadge>
      ),
    },
    {
      key: 'lastReply',
      label: t('tickets.table.lastReply'),
      sortable: true,
      sortValue: (ticket) => getDateSortValue(ticket.lastReply || ticket.activityLabel, locale),
      render: (ticket) => (
        <p className="type-body text-[var(--color-copy)]">
          {formatRelativeTime(ticket.lastReply || ticket.activityLabel, locale)}
        </p>
      ),
    },
    {
      key: 'action',
      label: t('tickets.table.action'),
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      mobileCellClassName: 'text-start',
      mobileLayout: 'footer',
      render: (ticket) => (
        <a
          className="theme-button-secondary type-label inline-flex items-center gap-2 rounded-2xl border px-4 py-3 transition"
          href={resolveTicketPortalUrl(ticket.id, ticket.portalUrl, nativeRoutes.ticketDetailUrl)}
        >
          <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
          {t('common.actions.view')}
        </a>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1320px]">
      <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] px-10 py-10 shadow-[var(--shadow-surface-strong)] md:px-12 md:py-12">
        <div className="grid gap-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="type-page-eyebrow text-[var(--color-copy)]">{t('tickets.center')}</p>
              <h1 className="type-page-title mt-6 text-[var(--color-ink)]">{t('tickets.list.title')}</h1>
              <p className="type-body-lg mt-5 max-w-[820px] text-[var(--color-copy)]">
                {t('tickets.list.description')}
              </p>
            </div>

            <Button
              className="self-start px-8 py-4 lg:self-center"
              onClick={() => redirectToWhmcsUrl(nativeRoutes.ticketCreateUrl)}
            >
              <CirclePlus className="h-5 w-5" strokeWidth={2.2} />
              {t('nav.items.openTicket')}
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <TicketSummaryCard label={t('tickets.summary.total')} value={formatNumber(tickets.length)} />
            <TicketSummaryCard label={t('tickets.summary.open')} value={formatNumber(openCount)} />
            <TicketSummaryCard label={t('tickets.summary.awaitingReply')} value={formatNumber(awaitingCount)} />
          </div>

          <DataTable
            columns={columns}
            emptyMessage={
              loading.tickets
                ? t('tickets.list.loading', undefined, 'Loading tickets...')
                : t('tickets.list.empty', undefined, 'No tickets found yet.')
            }
            gridClassName="grid grid-cols-[0.9fr_2.4fr_0.9fr_1fr_0.8fr] gap-4"
            minWidth="920px"
            rows={tickets}
            variant="card"
          />
        </div>
      </section>
    </div>
  )
}
