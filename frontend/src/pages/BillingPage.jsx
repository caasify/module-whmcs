import {
  ArrowDownToLine,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  SlidersHorizontal,
} from '@/components/icons'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable } from '../components/ui/DataTable'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { WhmcsRedirectPanel } from '../components/ui/WhmcsRedirectPanel'
import { useDashboardApp } from '../context/useDashboardApp'
import { formatRelativeTime, getDateSortValue } from '../lib/formatters'

function BillingTitle({ t }) {
  return (
    <section className="flex items-center gap-6">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-panel)]">
        <ReceiptText className="h-8 w-8" strokeWidth={2.1} />
      </span>
      <div>
        <h1 className="type-page-title text-[var(--color-ink)]">{t('billing.title')}</h1>
        <p className="type-body-lg mt-2 text-[var(--color-copy)]">
          {t('billing.description')}
        </p>
      </div>
    </section>
  )
}

function InvoiceView({
  formatWhmcsCurrency,
  invoices,
  locale,
  localizeDigits,
  nativeRoutes,
  showNativeRedirect,
  t,
}) {
  if (showNativeRedirect) {
    return (
      <WhmcsRedirectPanel
        actionLabel={t('common.actions.openInWhmcs', undefined, 'Open in WHMCS')}
        actionUrl={nativeRoutes.invoiceListUrl}
        autoRedirect={false}
        description={t(
          'billing.nativeRedirect.description',
          undefined,
          'This account uses the native WHMCS billing pages for invoice access and payments.',
        )}
        eyebrow={t('billing.title')}
        title={t('billing.invoices.title')}
      />
    )
  }

  const rows = [...invoices].sort((a, b) => Number(b.id) - Number(a.id))
  const columns = [
    {
      key: 'invoice',
      label: t('billing.invoices.table.invoice'),
      mobileLayout: 'primary',
      sortable: true,
      sortValue: (invoice) => Number(invoice.id),
      render: (invoice) => (
        <div>
          <p className="type-list-title text-[var(--color-ink)]">#{localizeDigits(invoice.id)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('billing.invoices.table.status'),
      sortable: true,
      sortValue: (invoice) => t(`common.status.${invoice.statusCode}`, undefined, invoice.status),
      render: (invoice) => (
        <StatusBadge
          className="w-fit rounded-lg border-transparent px-3 py-2"
          tone={invoice.statusTone}
        >
          {t(`common.status.${invoice.statusCode}`, undefined, invoice.status)}
        </StatusBadge>
      ),
    },
    {
      key: 'total',
      label: t('billing.invoices.table.total'),
      sortable: true,
      sortValue: (invoice) => invoice.total,
      render: (invoice) => (
        <p className="type-list-title text-[var(--color-ink)]">
          {invoice.totalDisplay ? localizeDigits(invoice.totalDisplay) : formatWhmcsCurrency(invoice.total)}
        </p>
      ),
    },
    {
      key: 'issuedDate',
      label: t('billing.invoices.table.issuedDate'),
      sortable: true,
      sortValue: (invoice) => getDateSortValue(invoice.issuedDate, locale),
      render: (invoice) => (
        <p className="type-body text-[var(--color-copy)]">{formatRelativeTime(invoice.issuedDate, locale)}</p>
      ),
    },
    {
      key: 'dueDate',
      label: t('billing.invoices.table.dueDate'),
      sortable: true,
      sortValue: (invoice) => getDateSortValue(invoice.dueDate, locale),
      render: (invoice) => (
        <p className="type-body text-[var(--color-copy)]">{formatRelativeTime(invoice.dueDate, locale)}</p>
      ),
    },
    {
      key: 'action',
      label: t('billing.invoices.table.action'),
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      mobileCellClassName: 'text-start',
      mobileLayout: 'footer',
      render: (invoice) => (
        <Link
          className="theme-button-secondary type-label inline-flex items-center gap-2 rounded-2xl border px-4 py-3 transition"
          to={`/billing/invoices/${invoice.id}`}
        >
          <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
          {t('common.actions.view')}
        </Link>
      ),
    },
  ]

  return (
    <div className="grid gap-9">
      <div>
        <h2 className="type-section-title text-[var(--color-ink)]">{t('billing.invoices.title')}</h2>
        <p className="type-body-lg mt-2 text-[var(--color-copy)]">
          {t('billing.invoices.description')}
        </p>
      </div>

      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          emptyMessage={t('billing.invoices.empty', undefined, 'No invoices found yet.')}
          gridClassName="grid grid-cols-[1.1fr_0.75fr_0.8fr_1fr_1fr_0.7fr] gap-4"
          minWidth="980px"
          rows={rows}
          variant="card"
        />
      </div>

      <div className="flex justify-end pt-6">
        <span className="type-body-lg rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-[var(--color-copy)] shadow-[var(--shadow-panel)]">
          {t('billing.invoices.showingRange', { total: rows.length })}
        </span>
      </div>
    </div>
  )
}

function UsageView({ billingUsage, formatCurrency, formatNumber, locale, localizeDigits, t }) {
  const rows = billingUsage.rows
  const monthLabel = localizeDigits(billingUsage.monthLabel || t('billing.month'))
  const columns = [
    {
      key: 'product',
      label: t('billing.usage.product'),
      mobileLayout: 'primary',
      sortable: true,
      sortValue: (row) => row.product,
      render: (row) => (
        <div>
          <p className="type-list-title text-[var(--color-ink)]">{row.product}</p>
          <p className="type-list-meta mt-1 text-[var(--color-copy)]">
            {row.order}
          </p>
        </div>
      ),
    },
    {
      key: 'serviceType',
      label: t('billing.usage.serviceType'),
      sortable: true,
      render: (row) => (
        <span className="type-body-sm w-fit rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-[var(--color-copy)]">
          {row.serviceType}
        </span>
      ),
    },
    {
      key: 'amount',
      label: t('billing.usage.amount'),
      sortable: true,
      sortValue: (row) => row.amountValue ?? Number.parseFloat(row.amount),
      render: (row) => (
        <p className="type-body-lg text-[var(--color-copy)]">{localizeDigits(row.amount)}</p>
      ),
    },
    {
      key: 'createDate',
      label: t('billing.usage.createDate'),
      sortable: true,
      sortValue: (row) => getDateSortValue(row.createDate, locale),
      render: (row) => (
        <p className="type-body-lg text-[var(--color-copy)]">{formatRelativeTime(row.createDate, locale)}</p>
      ),
    },
    {
      key: 'totalExpense',
      label: t('billing.usage.totalExpense'),
      mobileCellClassName: 'text-start',
      sortable: true,
      sortValue: (row) => row.totalExpenseValue ?? Number.parseFloat(row.totalExpense),
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      render: (row) => (
        <p className="type-body-lg-strong text-[var(--color-primary)]">
          {formatCurrency(row.totalExpenseValue)}
        </p>
      ),
    },
  ]

  return (
    <div className="grid gap-9">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="type-section-title text-[var(--color-ink)]">{t('billing.usage.title')}</h2>
          <p className="type-body-lg mt-2 text-[var(--color-copy)]">
            {t('billing.usage.description')}
          </p>
        </div>
        <div className="theme-button-secondary type-body-lg-strong inline-flex w-fit items-center gap-8 rounded-[18px] border px-6 py-4 shadow-[var(--shadow-panel)]">
          <ChevronLeft className="h-5 w-5 text-[var(--color-copy)]" strokeWidth={2.2} />
          <span className="inline-flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-[var(--color-muted)]" strokeWidth={2} />
            {monthLabel}
          </span>
          <ChevronRight className="h-5 w-5 text-[var(--color-muted)]" strokeWidth={2.2} />
        </div>
      </div>

      <button
        className="theme-button-secondary type-body-lg inline-flex w-fit items-center gap-3 rounded-[18px] border px-6 py-4 shadow-[var(--shadow-panel)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled
        type="button"
      >
        <SlidersHorizontal className="h-5 w-5 text-[var(--color-ink)]" strokeWidth={2} />
        {t('billing.filters.serviceType')}
      </button>

      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          emptyMessage={t('billing.usage.empty', undefined, 'No usage data is available for this period.')}
          gridClassName="grid grid-cols-[1.25fr_0.9fr_0.8fr_1fr_0.9fr] gap-4"
          minWidth="940px"
          rows={rows}
          variant="card"
        />
      </div>

      <div className="grid gap-8 pt-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <button
          className="theme-button-secondary type-body-lg-strong inline-flex w-fit items-center gap-3 rounded-[18px] border px-6 py-4 shadow-[var(--shadow-panel)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled
          type="button"
        >
          <ArrowDownToLine className="h-5 w-5" strokeWidth={2.2} />
          {t('common.actions.downloadReport')}
        </button>
        <div className="type-label flex items-center gap-6 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-7 py-5 text-[var(--color-copy)] shadow-[var(--shadow-panel)]">
          {t('billing.usage.totalSpent')}
          <span className="type-metric-md text-[var(--color-primary)]">
            {formatCurrency(billingUsage.totalSpent)}
          </span>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] pt-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="type-label text-[var(--color-copy)]">{t('common.show')}</span>
            <div className="inline-flex rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-panel)]">
              {[10, 25, 50, 100].map((item) => (
                <button
                  key={item}
                  className={`type-body-lg rounded-2xl px-4 py-2 ${
                    item === 10
                      ? 'theme-fill-primary'
                      : 'text-[var(--color-ink)]'
                  }`}
                  disabled
                  type="button"
                >
                  {formatNumber(item)}
                </button>
              ))}
            </div>
          </div>
          <span className="type-body-lg rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-[var(--color-copy)] shadow-[var(--shadow-panel)]">
            {t('billing.usage.showingRange', {
              from: rows.length > 0 ? 1 : 0,
              total: rows.length,
              to: rows.length,
            })}
          </span>
        </div>
      </div>
    </div>
  )
}

export function BillingPage() {
  const {
    billingUsage,
    formatCurrency,
    formatNumber,
    formatWhmcsCurrency,
    invoices,
    invoiceReadState,
    locale,
    localizeDigits,
    nativeRoutes,
    t,
    whmcsAccess,
  } = useDashboardApp()
  const showInvoiceNativeRedirect =
    !whmcsAccess.canUseCustomTicketsAndInvoices || invoiceReadState.listNativeFallbackRequired
  const [tab, setTab] = useState(() => (showInvoiceNativeRedirect ? 'usage' : 'invoices'))

  return (
    <div className="mx-auto grid w-full max-w-[1320px] gap-10">
      <BillingTitle t={t} />

      <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-surface-strong)] md:p-10">
        <SegmentedTabs
          ariaLabel={t('billing.title')}
          className="mb-10 rounded-[26px] p-1 [&_button]:rounded-[22px] [&_button]:py-4"
          items={[
            { label: t('billing.tabs.usage'), value: 'usage' },
            { label: t('billing.tabs.invoices'), value: 'invoices' },
          ]}
          onChange={setTab}
          value={tab}
        />

        {tab === 'invoices' ? (
          <InvoiceView
            formatWhmcsCurrency={formatWhmcsCurrency}
            invoices={invoices}
            locale={locale}
            localizeDigits={localizeDigits}
            nativeRoutes={nativeRoutes}
            showNativeRedirect={showInvoiceNativeRedirect}
            t={t}
          />
        ) : (
          <UsageView
            billingUsage={billingUsage}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
            locale={locale}
            localizeDigits={localizeDigits}
            t={t}
          />
        )}
      </section>
    </div>
  )
}
