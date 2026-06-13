import { ArrowLeft, ArrowRight, Plus, Search } from '@/components/icons'
import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { DataTable } from '../components/ui/DataTable'
import { LoadingState } from '../components/ui/LoadingState'
import { ServerAddressCell, ServerInstanceCell, ServerLocationCell } from '../components/ui/ServerTableCells'
import { useDashboardApp } from '../context/useDashboardApp'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import {
  compareIpAddress,
  getServerDisplayName,
  getServerLocationLabel,
} from '../lib/serverTable'
import { sortTableRows } from '../lib/tableSort'

const PAGE_SIZE = 10

export function ServersListPage() {
  const { servers, serverOverview, companyProfile, loading, actions, isRtl, t } = useDashboardApp()
  const navigate = useNavigate()
  const { copiedKey, copyValue } = useCopyToClipboard()
  const brandName = companyProfile?.name || 'Company'
  const [query, setQuery] = useState('')
  const [sortState, setSortState] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const deferredQuery = useDeferredValue(query)

  const cloudServers = servers.filter((server) => server.typeCode === 'cloudVps')
  const isOverviewLoading = loading.serverOverview || loading.directAuth || !serverOverview.ready
  const filtered = cloudServers.filter((server) => {
    const haystack = [
      getServerDisplayName(server),
      server.location.country,
      server.location.countryCode,
      server.location.city,
      server.location.cityCode,
      server.ipAddress,
      server.ipv6Address,
    ].join(' ').toLowerCase()

    return haystack.includes(deferredQuery.trim().toLowerCase())
  })
  const columns = [
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
  const sorted = sortTableRows(filtered, columns, sortState)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const activePage = Math.min(currentPage, totalPages)
  const rangeStart = sorted.length === 0 ? 0 : (activePage - 1) * PAGE_SIZE + 1
  const rangeEnd = sorted.length === 0 ? 0 : Math.min(activePage * PAGE_SIZE, sorted.length)
  const paginated = sorted.slice(rangeStart === 0 ? 0 : rangeStart - 1, rangeEnd)
  const showWelcomeState =
    deferredQuery.trim() === ''
    && serverOverview.ready
    && serverOverview.directTokenPresent
    && cloudServers.length === 0
  const emptyServersMessage = isOverviewLoading ? (
    <LoadingState
      copy={t('servers.loading.copy', undefined, 'Your server list will appear here in a moment.')}
      size="compact"
      title={t('servers.loading.title', undefined, 'Loading servers...')}
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
      <button
        className="theme-button-primary type-button inline-flex items-center justify-center rounded-full border px-5 py-3"
        type="button"
        onClick={() => {
          actions.startDeploy()
          navigate('/deploy/location')
        }}
      >
        {t('common.actions.createService')}
      </button>
    </div>
  ) : t('servers.noResults')

  return (
    <div className="mx-auto grid w-full max-w-[1320px] gap-10">
      <section className="grid gap-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <h1 className="type-page-title text-[var(--color-ink)]">{t('servers.title')}</h1>
          <Button
            className="self-start px-8 py-4"
            onClick={() => {
              actions.startDeploy()
              navigate('/deploy/location')
            }}
          >
            <Plus className="h-5 w-5" strokeWidth={2.4} />
            {t('common.actions.orderNew')}
          </Button>
        </div>

        <div className="grid gap-4">
          <label className="relative justify-self-end lg:w-full">
            <Search
              className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)] opacity-45 ${
                isRtl ? 'right-6' : 'left-6'
              }`}
              strokeWidth={2}
            />
            <input
              className={`type-input text-start h-16 w-full rounded-[20px] border border-transparent bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[var(--shadow-panel)] outline-none ring-1 ring-[var(--color-border-soft)] transition placeholder:text-[var(--color-muted)] focus:ring-2 focus:ring-[var(--color-primary)]/25 ${
                isRtl ? 'pr-16 pl-6' : 'pl-16 pr-6'
              }`}
              onChange={(event) => {
                setQuery(event.target.value)
                setCurrentPage(1)
              }}
              placeholder={t('servers.searchPlaceholder')}
              value={query}
            />
          </label>
        </div>
      </section>

      <section className="grid gap-6">
        <DataTable
          columns={columns}
          emptyMessage={emptyServersMessage}
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
          onSortChange={(nextSortState) => {
            setSortState(nextSortState)
            setCurrentPage(1)
          }}
          rows={paginated}
          sortRows={false}
          sortState={sortState}
          variant="card"
        />

        {!isOverviewLoading ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <span className="type-body-lg rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-[var(--color-copy)] shadow-[var(--shadow-panel)]">
              {t('servers.showingRange', {
                from: rangeStart,
                to: rangeEnd,
                total: sorted.length,
              })}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="min-w-[112px] justify-center"
                disabled={activePage === 1}
                variant="secondary"
                onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
              >
                {isRtl ? <ArrowRight className="h-4 w-4" strokeWidth={2.2} /> : <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />}
                {t('servers.pagination.previous')}
              </Button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  className={`type-body-strong inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border px-4 transition ${
                    page === activePage
                      ? 'theme-button-primary border'
                      : 'theme-button-secondary'
                  }`}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <Button
                className="min-w-[112px] justify-center"
                disabled={activePage === totalPages}
                variant="secondary"
                onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
              >
                {t('servers.pagination.next')}
                {isRtl ? <ArrowLeft className="h-4 w-4" strokeWidth={2.2} /> : <ArrowRight className="h-4 w-4" strokeWidth={2.2} />}
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
