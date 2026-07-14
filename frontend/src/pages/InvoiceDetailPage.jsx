import { ArrowLeft, ArrowRight, Printer } from '@/components/icons'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useDashboardApp } from '../context/useDashboardApp'
import { cn } from '../lib/cn'
import { formatRelativeTime } from '../lib/formatters'
import { buildWhmcsClientAreaUrl, redirectToWhmcsUrl } from '../lib/whmcsClientArea'

function statusStyles(status, amountDue) {
  if (amountDue === 0 || status?.toLowerCase() === 'paid') {
    return 'border-[var(--color-success-border)] bg-[var(--color-success-soft)] text-[var(--color-success)]'
  }

  return 'border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
}

function DetailField({ children, label }) {
  return (
    <div>
      <p className="type-label mb-3 text-[var(--color-muted)]">{label}</p>
      <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5 shadow-[var(--shadow-panel)]">
        {children}
      </div>
    </div>
  )
}

function getInvoiceLineItemTitle(lineItem, t) {
  const description = String(lineItem?.description ?? '').trim()

  if (description.toLowerCase().includes('caasify_add_funds')) {
    return t('invoice.lineItemAddFunds')
  }

  return ''
}

function getInvoiceLineItemDescription(lineItem, t) {
  const description = String(lineItem?.description ?? '').trim()

  if (description.toLowerCase().includes('caasify_add_funds')) {
    return t('invoice.lineItemAddFunds')
  }

  return description || ''
}

function humanizeGatewayName(value) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return ''
  }

  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/\bPpcpv\b/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolvePaymentMethodLabel(paymentMethods, invoice) {
  const code = String(invoice?.paymentMethodCode ?? invoice?.paymentMethod ?? '').trim().toLowerCase()

  if (!code) {
    return '--'
  }

  const matchedGateway = Array.isArray(paymentMethods)
    ? paymentMethods.find((method) => String(method?.module ?? method?.id ?? '').trim().toLowerCase() === code)
    : null

  const resolvedLabel =
    String(matchedGateway?.displayName ?? matchedGateway?.module ?? '').trim() ||
    String(invoice?.paymentMethodLabel ?? invoice?.paymentMethod ?? '').trim()

  if (resolvedLabel) {
    return resolvedLabel
  }

  return humanizeGatewayName(code)
}

export function InvoiceDetailPage() {
  const { invoiceId } = useParams()
  const {
    invoices,
    invoiceDetails,
    invoiceReadState,
    loading,
    nativeRoutes,
    paymentMethods,
    whmcsAccess,
    actions,
    formatWhmcsCurrency,
    isRtl,
    locale,
    localizeDigits,
    t,
  } = useDashboardApp()
  const { loadInvoiceDetail } = actions
  const invoice =
    (invoiceId ? invoiceDetails[invoiceId] : null) ??
    invoices.find((item) => item.id === invoiceId) ??
    null
  const invoiceRequiresNativeFallback = Boolean(invoiceId) && Boolean(invoiceReadState.detailNativeFallback[invoiceId])
  const isLoading = Boolean(invoiceId) && Boolean(loading.invoiceDetails[invoiceId])
  const subtotal = invoice?.subtotal ?? invoice?.total ?? 0
  const vat = Number.isFinite(Number(invoice?.vat)) ? Number(invoice.vat) : 0
  const hasVat = Math.abs(vat) > 0.00001 || String(invoice?.vatDisplay ?? '').trim() !== ''
  const paymentMethodLabel = resolvePaymentMethodLabel(paymentMethods, invoice)
  const fallbackInvoiceUrl = buildWhmcsClientAreaUrl('viewinvoice.php', { id: invoiceId })
  const nativeInvoiceUrl = new URL(nativeRoutes.invoiceDetailUrl, window.location.href)

  nativeInvoiceUrl.searchParams.set('id', invoiceId)

  const invoicePortalUrl = invoice?.portalUrl || fallbackInvoiceUrl

  useEffect(() => {
    if (!invoiceId) {
      return
    }

    void loadInvoiceDetail(invoiceId)
  }, [invoiceId, loadInvoiceDetail])

  useEffect(() => {
    if (whmcsAccess.canUseCustomTicketsAndInvoices && !invoiceRequiresNativeFallback) {
      return
    }

    redirectToWhmcsUrl(invoicePortalUrl, nativeRoutes.invoiceListUrl)
  }, [
    invoicePortalUrl,
    invoiceRequiresNativeFallback,
    nativeRoutes.invoiceListUrl,
    whmcsAccess.canUseCustomTicketsAndInvoices,
  ])

  function formatInvoiceAmount(value, displayText = '') {
    if (Number.isFinite(Number(value))) {
      return formatWhmcsCurrency(value)
    }

    return displayText ? localizeDigits(displayText) : formatWhmcsCurrency(0)
  }

  function formatInvoiceDate(value) {
    return formatRelativeTime(value, locale) || '--/--/----'
  }

  if (!whmcsAccess.canUseCustomTicketsAndInvoices || invoiceRequiresNativeFallback) {
    return null
  }

  if (!invoice) {
    return (
      <div className="page-grid mx-auto max-w-[1120px]">
        <div className="flex justify-start">
          <Button
            className="type-button w-fit rounded-full px-6 py-3 text-[var(--color-copy)]"
            to="/billing"
            variant="secondary"
          >
            <ArrowLeft className={`h-4 w-4 ${isRtl ? 'rtl-flip' : ''}`} strokeWidth={2.3} />
            {t('common.actions.backToBilling')}
          </Button>
        </div>

        <section className="rounded-[36px] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-10 shadow-[var(--shadow-surface-strong)] sm:px-10 lg:px-12">
          <h1 className="type-page-title text-[var(--color-ink)]">{t('header.pages.invoice')}</h1>
          <p className="type-body-lg mt-4 text-[var(--color-copy)]">
            {isLoading
              ? t('invoice.loading', undefined, 'Loading invoice details...')
              : t('invoice.missing', undefined, 'Invoice details are not available right now.')}
          </p>
          <div className="mt-6">
            <Button
              className="type-button w-fit rounded-full px-6 py-3"
              onClick={() => redirectToWhmcsUrl(invoicePortalUrl, nativeRoutes.invoiceListUrl)}
            >
              {t('common.actions.openInWhmcs', undefined, 'Open in WHMCS')}
            </Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-grid mx-auto max-w-[1120px]">
      <div className="flex justify-start">
        <Button
          to="/billing"
          variant="secondary"
          className="type-button w-fit rounded-full px-6 py-3 text-[var(--color-copy)]"
        >
          <ArrowLeft className={`h-4 w-4 ${isRtl ? 'rtl-flip' : ''}`} strokeWidth={2.3} />
          {t('common.actions.backToBilling')}
        </Button>
      </div>

      <section className="overflow-hidden rounded-[36px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-surface-strong)]">
        <div className="h-[5px] w-full bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-secondary-soft)_100%)]" />
        <div className="px-8 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="type-page-title text-[var(--color-ink)]">
                {t('invoice.invoiceNumber', { id: invoice.id })}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <span
                  className={cn(
                    'type-badge inline-flex rounded-full border px-4 py-1.5',
                    statusStyles(invoice.status, invoice.amountDue),
                  )}
                >
                  {t(`common.status.${invoice.statusCode}`, undefined, invoice.status)}
                </span>
                <p className="type-body text-[var(--color-copy)]">
                  {t('invoice.dueDate')}:{' '}
                  <span className="type-body-strong text-[var(--color-ink)]">
                    {formatInvoiceDate(invoice.dueDate)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                className="type-button h-[54px] min-w-[132px] rounded-[18px] px-6"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" strokeWidth={2.1} />
                {t('common.actions.print')}
              </Button>
              <Button
                variant="secondary"
                className="type-button h-[54px] min-w-[154px] rounded-[18px] px-6"
                onClick={() => redirectToWhmcsUrl(nativeInvoiceUrl.toString(), invoicePortalUrl || nativeRoutes.invoiceListUrl)}
              >
                <ArrowRight className="rtl-flip h-4 w-4" strokeWidth={2.1} />
                {t('common.actions.openInWhmcs', undefined, 'Open in WHMCS')}
              </Button>
              {invoice.amountDue > 0 ? (
                <Button
                  className="type-button h-[54px] min-w-[164px] rounded-[18px] px-8"
                  onClick={() => redirectToWhmcsUrl(nativeInvoiceUrl.toString(), invoicePortalUrl || nativeRoutes.invoiceListUrl)}
                >
                  {t('common.actions.payNow')}
                  <ArrowRight className="rtl-flip h-4 w-4" strokeWidth={2.1} />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-10 border-t border-[var(--color-border)] pt-10">
            <div className="grid gap-8 lg:grid-cols-2">
              <DetailField label={t('invoice.invoiceDate')}>
                <p className="type-detail-value text-[var(--color-ink)]">
                  {formatInvoiceDate(invoice.issuedDate)}
                </p>
              </DetailField>

              <DetailField label={t('invoice.paymentMethod')}>
                <p className="type-detail-value text-[var(--color-ink)]">{localizeDigits(paymentMethodLabel)}</p>
              </DetailField>
            </div>
          </div>

          <div className="mt-10 rounded-[24px] bg-[var(--color-surface)] shadow-[var(--shadow-panel)]">
            <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--color-border)] px-8 py-5">
              <p className="type-label text-[var(--color-muted)]">{t('invoice.descriptionLabel')}</p>
              <p className="type-label text-[var(--color-muted)]">{t('invoice.amountLabel')}</p>
            </div>
            {(invoice.lineItems?.length ? invoice.lineItems : [
              {
                id: `${invoice.id}-fallback-line`,
                description: invoice.notes || t('invoice.lineItemFallback'),
                amount: subtotal,
                amountDisplay: invoice.subtotalDisplay || invoice.totalDisplay || '',
              },
            ]).map((lineItem) => (
              <div key={lineItem.id} className="grid grid-cols-[1fr_auto] gap-6 border-b border-[var(--color-border)] px-8 py-7 last:border-b-0">
                <div>
                  <p className="type-page-subtitle mt-2 text-[var(--color-copy)]">
                    {localizeDigits(getInvoiceLineItemTitle(lineItem, t) || getInvoiceLineItemDescription(lineItem, t))}
                  </p>
                </div>
                <p className="type-detail-value text-end text-[var(--color-ink)]">
                  {formatInvoiceAmount(lineItem.amount ?? 0, lineItem.amountDisplay)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <div className="w-full rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-7 shadow-[var(--shadow-surface)]">
              <div className="space-y-5">
                <div className="type-body flex items-center justify-between">
                  <span className="text-[var(--color-copy)]">{t('invoice.subtotal')}</span>
                  <span className="type-body-strong text-[var(--color-ink)]">{formatInvoiceAmount(subtotal, invoice.subtotalDisplay)}</span>
                </div>
                {hasVat ? (
                  <div className="type-body flex items-center justify-between">
                    <span className="text-[var(--color-copy)]">{t('invoice.vat')}</span>
                    <span className="type-body-strong text-[var(--color-ink)]">
                      {formatInvoiceAmount(vat, invoice.vatDisplay)}
                    </span>
                  </div>
                ) : null}
                <div className="type-body flex items-center justify-between">
                  <span className="text-[var(--color-copy)]">{t('invoice.creditApplied')}</span>
                  <span className="type-body-strong text-[var(--color-ink)]">
                    {formatInvoiceAmount(invoice.creditApplied, invoice.creditAppliedDisplay)}
                  </span>
                </div>
              </div>

              <div className="mt-6 border-t border-[var(--color-border)] pt-6">
                <div className="flex items-end justify-between gap-4">
                  <span className="type-card-title uppercase text-[var(--color-ink)]">
                    {t('invoice.total')}
                  </span>
                  <span className="type-price-lg text-[var(--color-primary)]">
                    {formatInvoiceAmount(invoice.amountDue > 0 ? invoice.amountDue : invoice.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
