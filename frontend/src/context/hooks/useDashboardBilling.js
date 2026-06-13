import { useCallback, useEffect, useState } from 'react'
import { dashboardWhmcsApi } from '../../lib/dashboardWhmcsApi'
import { convertHubAmount, isMoneyActionsBlocked } from '../../lib/pricing'
import { fetchInvoiceDetail, fetchInvoiceList, isWhmcsHandoffError } from '../../lib/services/whmcs'
import { caasifyServerApi, isSilentDirectApiFailure } from '../../lib/services/server'
import { buildWhmcsClientAreaUrl } from '../../lib/whmcsClientArea'
import { mergeItemById } from '../dashboardCollections'

function toNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback
}

function resolveUsagePeriodEntry(entry) {
  if (typeof entry === 'string') {
    const match = entry.match(/(\d{4})[/-](\d{1,2})/)

    if (!match) {
      return null
    }

    const [, year, month] = match

    return {
      key: `${year}-${month.padStart(2, '0')}`,
      label: `${year}/${month.padStart(2, '0')}`,
      month: month.padStart(2, '0'),
      year,
    }
  }

  if (!entry || typeof entry !== 'object') {
    return null
  }

  const rawYear = entry.year ?? entry.y ?? entry.label ?? entry.date ?? ''
  const rawMonth = entry.month ?? entry.m ?? entry.label ?? entry.date ?? ''

  if (typeof rawYear === 'number' && typeof rawMonth === 'number') {
    return {
      key: `${rawYear}-${String(rawMonth).padStart(2, '0')}`,
      label: `${rawYear}/${String(rawMonth).padStart(2, '0')}`,
      month: String(rawMonth).padStart(2, '0'),
      year: String(rawYear),
    }
  }

  if (typeof rawYear === 'string') {
    return resolveUsagePeriodEntry(rawYear)
  }

  return null
}

function getLatestUsagePeriod(expenseDates) {
  const periods = expenseDates
    .map(resolveUsagePeriodEntry)
    .filter(Boolean)
    .sort((left, right) => right.key.localeCompare(left.key))

  return periods[0] ?? null
}

function humanizeServiceType(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'VPS'
  }

  return value.trim()
}

function resolveUsageAmountLabel(row) {
  const usageValue = toNumber(
    row?.total_hours
    ?? row?.hours
    ?? row?.usage_hours
    ?? row?.duration_hours
    ?? row?.quantity,
    Number.NaN,
  )

  if (Number.isFinite(usageValue) && usageValue > 0) {
    return {
      amount: `${usageValue.toFixed(2)} h`,
      amountValue: usageValue,
    }
  }

  const textValue = row?.amount_display ?? row?.usage_display ?? row?.duration

  return {
    amount: typeof textValue === 'string' && textValue.trim() ? textValue.trim() : '--',
    amountValue: 0,
  }
}

function mapExpenseOrdersToUsageRows(rows, pricingContext) {
  return rows.map((row, index) => {
    const product =
      String(
        row?.product_name
        ?? row?.product
        ?? row?.name
        ?? row?.title
        ?? row?.plan_name
        ?? 'Service',
      ).trim() || 'Service'
    const orderId = row?.order_id ?? row?.id ?? row?.relid ?? index + 1
    const totalExpenseValue = convertHubAmount(
      row?.total_expenses
      ?? row?.total_expense
      ?? row?.amount
      ?? row?.price
      ?? 0,
      pricingContext,
      2,
    )
    const { amount, amountValue } = resolveUsageAmountLabel(row)

    return {
      id: String(orderId),
      product,
      order: `Order #${orderId}`,
      serviceType: humanizeServiceType(
        String(row?.service_type ?? row?.order_type ?? row?.type ?? 'VPS'),
      ),
      amount,
      amountValue,
      createDate: String(row?.create_date ?? row?.created_at ?? row?.date ?? '').trim(),
      totalExpenseValue,
    }
  })
}

export function useDashboardBilling({
  nativeRoutes,
  pricingContext,
  serverOverview,
  showErrorNotice,
  whmcsAccess,
}) {
  const [invoices, setInvoices] = useState([])
  const [invoiceDetails, setInvoiceDetails] = useState({})
  const [paymentMethods, setPaymentMethods] = useState([])
  const [invoiceReadState, setInvoiceReadState] = useState({
    detailNativeFallback: {},
    listNativeFallbackRequired: false,
  })
  const [billingUsage, setBillingUsage] = useState({
    monthLabel: '',
    rows: [],
    totalSpent: 0,
  })
  const [loading, setLoading] = useState({
    creatingAddFundsInvoice: false,
    gateways: true,
    invoiceDetails: {},
    invoices: true,
    payInvoice: false,
    usage: false,
  })

  const setLoadingFlag = useCallback((key, value) => {
    setLoading((current) => ({
      ...current,
      [key]: value,
    }))
  }, [])

  const setDetailLoadingFlag = useCallback((key, id, value) => {
    setLoading((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [id]: value,
      },
    }))
  }, [])

  const refreshWhmcsInvoices = useCallback(async () => {
    if (!whmcsAccess.canUseCustomTicketsAndInvoices) {
      setInvoices([])
      setInvoiceReadState({
        detailNativeFallback: {},
        listNativeFallbackRequired: false,
      })
      setLoadingFlag('invoices', false)
      return
    }

    setLoadingFlag('invoices', true)

    try {
      const nextInvoices = await fetchInvoiceList(nativeRoutes.invoiceListUrl)
      setInvoices(Array.isArray(nextInvoices) ? nextInvoices : [])
      setInvoiceReadState((current) => ({
        ...current,
        listNativeFallbackRequired: false,
      }))
    } catch (error) {
      if (isWhmcsHandoffError(error)) {
        setInvoices([])
        setInvoiceReadState((current) => ({
          ...current,
          listNativeFallbackRequired: true,
        }))
        return
      }

      setInvoices([])
      setInvoiceReadState((current) => ({
        ...current,
        listNativeFallbackRequired: false,
      }))
      showErrorNotice(error?.message || 'Unable to load invoices right now.')
    } finally {
      setLoadingFlag('invoices', false)
    }
  }, [nativeRoutes.invoiceListUrl, setLoadingFlag, showErrorNotice, whmcsAccess.canUseCustomTicketsAndInvoices])

  const loadPaymentMethods = useCallback(async () => {
    if (isMoneyActionsBlocked(pricingContext)) {
      setPaymentMethods([])
      setLoadingFlag('gateways', false)
      return
    }

    setLoadingFlag('gateways', true)

    try {
      const payload = await dashboardWhmcsApi.getPaymentMethods()
      setPaymentMethods(Array.isArray(payload?.paymentMethods) ? payload.paymentMethods : [])
    } catch (error) {
      setPaymentMethods([])
      showErrorNotice(error?.message || 'Unable to load payment methods right now.')
    } finally {
      setLoadingFlag('gateways', false)
    }
  }, [pricingContext, setLoadingFlag, showErrorNotice])

  const loadInvoiceDetail = useCallback(async (invoiceId, options = {}) => {
    const resolvedInvoiceId = String(invoiceId ?? '')

    if (!resolvedInvoiceId) {
      return null
    }

    if (!whmcsAccess.canUseCustomTicketsAndInvoices) {
      setInvoiceReadState((current) => ({
        ...current,
        detailNativeFallback: {
          ...current.detailNativeFallback,
          [resolvedInvoiceId]: true,
        },
      }))
      return null
    }

    if (!options.force && invoiceDetails[resolvedInvoiceId]) {
      return invoiceDetails[resolvedInvoiceId]
    }

    setDetailLoadingFlag('invoiceDetails', resolvedInvoiceId, true)

    try {
      const invoiceListEntry = invoices.find((item) => String(item?.id ?? '') === resolvedInvoiceId)
      const invoicePortalUrl =
        options.portalUrl ||
        invoiceDetails[resolvedInvoiceId]?.portalUrl ||
        invoiceListEntry?.portalUrl ||
        buildWhmcsClientAreaUrl('viewinvoice.php', {
          id: resolvedInvoiceId,
        })
      const nextInvoice = await fetchInvoiceDetail(invoicePortalUrl, {
        companyProfile: options.companyProfile,
        currentClient: options.currentClient,
      })

      if (nextInvoice) {
        setInvoiceDetails((current) => ({
          ...current,
          [resolvedInvoiceId]: nextInvoice,
        }))
        setInvoices((current) => mergeItemById(current, nextInvoice))
        setInvoiceReadState((current) => ({
          ...current,
          detailNativeFallback: {
            ...current.detailNativeFallback,
            [resolvedInvoiceId]: false,
          },
        }))
      }

      return nextInvoice
    } catch (error) {
      if (isWhmcsHandoffError(error)) {
        setInvoiceReadState((current) => ({
          ...current,
          detailNativeFallback: {
            ...current.detailNativeFallback,
            [resolvedInvoiceId]: true,
          },
        }))
        return null
      }

      if (!options.silent) {
        showErrorNotice(error?.message || 'Unable to load the invoice details right now.')
      }

      return null
    } finally {
      setDetailLoadingFlag('invoiceDetails', resolvedInvoiceId, false)
    }
  }, [
    invoiceDetails,
    invoices,
    setDetailLoadingFlag,
    showErrorNotice,
    whmcsAccess.canUseCustomTicketsAndInvoices,
  ])

  const loadBillingUsage = useCallback(async () => {
    const directTokenPresent = Boolean(serverOverview?.directTokenPresent)

    if (!directTokenPresent) {
      setBillingUsage({
        monthLabel: '',
        rows: [],
        totalSpent: 0,
      })

      return
    }

    const latestPeriod = getLatestUsagePeriod(serverOverview.expenseDates ?? [])

    if (!latestPeriod) {
      setBillingUsage({
        monthLabel: '',
        rows: [],
        totalSpent: serverOverview.totalSpend ?? 0,
      })

      return
    }

    setLoadingFlag('usage', true)

    try {
      const payload = await caasifyServerApi.getExpenseOrders(latestPeriod.year, latestPeriod.month)
      const rows = Array.isArray(payload?.data) ? payload.data : []

      setBillingUsage({
        monthLabel: latestPeriod.label,
        rows: mapExpenseOrdersToUsageRows(rows, pricingContext),
        totalSpent: serverOverview.totalSpend ?? 0,
      })
    } catch (error) {
      if (!isSilentDirectApiFailure(error)) {
        showErrorNotice('Unable to load usage data right now.')
      }

      setBillingUsage({
        monthLabel: latestPeriod.label,
        rows: [],
        totalSpent: serverOverview.totalSpend ?? 0,
      })
    } finally {
      setLoadingFlag('usage', false)
    }
  }, [pricingContext, serverOverview, setLoadingFlag, showErrorNotice])

  const createAddFundsInvoice = useCallback(async (amount, paymentMethodCode) => {
    if (isMoneyActionsBlocked(pricingContext)) {
      showErrorNotice('Top-ups are temporarily unavailable because pricing for your currency is not configured yet.')
      return ''
    }

    setLoadingFlag('creatingAddFundsInvoice', true)

    try {
      const response = await dashboardWhmcsApi.createAddFundsInvoice(amount, paymentMethodCode)
      const invoiceId = String(response?.invoiceId ?? '')

      if (invoiceId) {
        await Promise.all([
          refreshWhmcsInvoices(),
          loadInvoiceDetail(invoiceId, { force: true, silent: true }),
        ])
      }

      return invoiceId
    } catch (error) {
      showErrorNotice(error?.message || 'Unable to create the top-up invoice right now.')
      return ''
    } finally {
      setLoadingFlag('creatingAddFundsInvoice', false)
    }
  }, [loadInvoiceDetail, pricingContext, refreshWhmcsInvoices, setLoadingFlag, showErrorNotice])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void Promise.all([
        refreshWhmcsInvoices(),
        loadPaymentMethods(),
      ])
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadPaymentMethods, refreshWhmcsInvoices])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBillingUsage()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadBillingUsage, serverOverview])

  return {
    billingUsage,
    createAddFundsInvoice,
    invoiceReadState,
    invoices,
    invoiceDetails,
    loadPaymentMethods,
    paymentMethods,
    loadInvoiceDetail,
    loading,
    refreshWhmcsInvoices,
  }
}
