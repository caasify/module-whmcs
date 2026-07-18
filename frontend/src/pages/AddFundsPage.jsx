import { Check, CreditCard, Landmark, WalletCards } from '../components/icons'
import { startTransition, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addFundsPresetAmounts } from '../config/addFunds'
import { Button } from '../components/ui/Button'
import { PageHero } from '../components/ui/PageHero'
import { SummaryCard } from '../components/ui/SummaryCard'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { useDashboardApp } from '../context/useDashboardApp'
import { cn } from '../lib/cn'
import { convertHubAmount } from '../lib/pricing'

const methodIcons = {
  netbilling: Landmark,
  skrill: CreditCard,
}

function roundSuggestedAmountDown(amount) {
  const numericAmount = Number(amount)

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return 0
  }

  if (numericAmount < 10) {
    return Math.floor(numericAmount)
  }

  if (numericAmount < 100) {
    return Math.floor(numericAmount / 5) * 5
  }

  const integerAmount = Math.floor(numericAmount)
  const digits = String(integerAmount).length
  const step = 5 * (10 ** Math.max(digits - 2, 0))

  return Math.floor(integerAmount / step) * step
}

function resolveSuggestedPresetAmount(eurAmount, pricingContext) {
  return roundSuggestedAmountDown(convertHubAmount(eurAmount, pricingContext, 2))
}

function roundCurrencyAmount(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function resolveAddFundsSummary(amount, addFundsTax) {
  const normalizedAmount = Number(amount)

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return {
      subtotal: 0,
      total: 0,
      vat: 0,
    }
  }

  const rateOne = Math.max(0, Number(addFundsTax?.level1Rate ?? 0)) / 100
  const rateTwo = Math.max(0, Number(addFundsTax?.level2Rate ?? 0)) / 100

  if (addFundsTax?.enabled !== true || (rateOne <= 0 && rateTwo <= 0)) {
    return {
      subtotal: roundCurrencyAmount(normalizedAmount),
      total: roundCurrencyAmount(normalizedAmount),
      vat: 0,
    }
  }

  if (addFundsTax?.inclusive === true) {
    const subtotal = addFundsTax?.compound === true
      ? normalizedAmount / ((1 + rateOne) * (1 + rateTwo))
      : normalizedAmount / (1 + rateOne + rateTwo)
    const vatLevelOne = subtotal * rateOne
    const vatLevelTwo = addFundsTax?.compound === true
      ? (subtotal + vatLevelOne) * rateTwo
      : subtotal * rateTwo

    const vat = roundCurrencyAmount(vatLevelOne) + roundCurrencyAmount(vatLevelTwo)
    const total = roundCurrencyAmount(normalizedAmount)

    return {
      subtotal: roundCurrencyAmount(total - vat),
      total,
      vat: roundCurrencyAmount(vat),
    }
  }

  const subtotal = roundCurrencyAmount(normalizedAmount)
  const vatLevelOne = roundCurrencyAmount(subtotal * rateOne)
  const vatLevelTwoBase = addFundsTax?.compound === true ? subtotal + vatLevelOne : subtotal
  const vatLevelTwo = roundCurrencyAmount(vatLevelTwoBase * rateTwo)
  const vat = roundCurrencyAmount(vatLevelOne + vatLevelTwo)

  return {
    subtotal,
    total: roundCurrencyAmount(subtotal + vat),
    vat,
  }
}

export function AddFundsPage() {
  const {
    wallet,
    billingContext,
    paymentMethods,
    loading,
    actions,
    formatCurrency,
    formatWhmcsCurrency,
    pricingContext,
    t,
  } = useDashboardApp()
  const navigate = useNavigate()
  const [method, setMethod] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [selectedPresetEurAmount, setSelectedPresetEurAmount] = useState(addFundsPresetAmounts[0] ?? 10)
  const moneyActionsBlocked = pricingContext.moneyActionsBlocked === true
  const minimumAddFundsEurAmount = Math.max(0, Number(billingContext?.minimumAddFundsEurAmount ?? 0))
  const minimumAllowedAmount = minimumAddFundsEurAmount > 0
    ? convertHubAmount(minimumAddFundsEurAmount, pricingContext, 2)
    : 0
  const availablePresetEurAmounts = addFundsPresetAmounts.filter((amount) => amount >= minimumAddFundsEurAmount)
  const activePresetEurAmount = availablePresetEurAmounts.includes(selectedPresetEurAmount)
    ? selectedPresetEurAmount
    : (availablePresetEurAmounts[0] ?? null)
  const selectedMethodId =
    paymentMethods.some((item) => item.id === method)
      ? method
      : (paymentMethods[0]?.id ?? '')
  const activeMethod = paymentMethods.find((item) => item.id === selectedMethodId) ?? null
  const resolvedPresetAmount = activePresetEurAmount !== null
    ? resolveSuggestedPresetAmount(activePresetEurAmount, pricingContext)
    : 0
  const resolvedAmount = customAmount !== '' ? Number(customAmount) || 0 : resolvedPresetAmount
  const addFundsSummary = resolveAddFundsSummary(resolvedAmount, billingContext?.addFundsTax)
  const meetsMinimumAmount = minimumAllowedAmount <= 0 || resolvedAmount >= minimumAllowedAmount
  const canSubmit =
    resolvedAmount > 0 &&
    meetsMinimumAmount &&
    activeMethod &&
    !moneyActionsBlocked &&
    !loading.creatingAddFundsInvoice &&
    !loading.gateways

  async function handleCreateInvoice() {
    if (!activeMethod || !canSubmit) {
      return
    }

    const invoiceId = await actions.createAddFundsInvoice(resolvedAmount, activeMethod.id)

    if (!invoiceId) {
      return
    }

    startTransition(() => {
      navigate(`/billing/invoices/${invoiceId}`)
    })
  }

  return (
    <div className="page-grid mx-auto w-full max-w-[1508px]">
      <PageHero
        description={t('addFunds.description')}
        title={t('addFunds.title')}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
        <SurfaceCard className="page-grid">
          {moneyActionsBlocked ? (
            <p className="type-body rounded-2xl border border-[var(--color-warning-panel-border)] bg-[var(--color-warning-soft)] px-6 py-5 text-[var(--color-warning)]">
              {t(
                'billing.pricingUnavailable',
                undefined,
                'Top-ups are temporarily unavailable because pricing for your currency is not configured yet.',
              )}
            </p>
          ) : null}
          <div>
            <p className="type-label text-[var(--color-ink)]">{t('addFunds.paymentMethod')}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {loading.gateways ? (
              <p className="type-body rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-5 text-[var(--color-copy)]">
                {t('billing.paymentMethods.loading', undefined, 'Loading payment methods...')}
              </p>
            ) : null}

            {!loading.gateways && !moneyActionsBlocked && paymentMethods.length === 0 ? (
              <p className="type-body rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-5 text-[var(--color-copy)]">
                {t('billing.paymentMethods.unavailable', undefined, 'No payment methods are available right now.')}
              </p>
            ) : null}

            {paymentMethods.map((item) => {
              const Icon = methodIcons[item.id] ?? CreditCard
              const active = selectedMethodId === item.id

              return (
                <SurfaceCard
                  as="button"
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between rounded-[24px] px-6 py-5 text-start',
                    active
                      ? 'border-[var(--color-primary)] shadow-[inset_0_0_0_1px_var(--color-primary)]'
                      : 'hover:border-[var(--color-primary)]',
                  )}
                  interactive
                  padded={false}
                  type="button"
                  disabled={moneyActionsBlocked}
                  onClick={() => {
                    setMethod(item.id)
                    setCustomAmount('')
                  }}
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-primary)]">
                      <Icon className="h-5 w-5" strokeWidth={1.9} />
                    </span>
                    <div>
                      <p className="type-card-title text-[var(--color-ink)]">
                        {item.displayName}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border text-[var(--color-primary)] transition',
                      active
                        ? 'theme-fill-primary'
                        : 'border-[var(--color-border-strong)] bg-[var(--color-surface)]',
                    )}
                  >
                    <Check className="h-4 w-4" strokeWidth={2.4} />
                  </span>
                </SurfaceCard>
              )
            })}
          </div>
        </SurfaceCard>

        <SummaryCard
          className="h-fit self-start lg:row-span-2"
          subtitle={t('common.summary')}
          title={t('addFunds.paymentSummary')}
        >
          <div className="space-y-5">
            <div className="type-body-lg flex items-center justify-between text-[var(--color-copy)]">
              <span>{t('addFunds.method')}</span>
              <span className="theme-button-secondary type-button rounded-xl border px-3 py-2">
                {activeMethod?.displayName ?? '--'}
              </span>
            </div>
            <div className="type-body-lg flex items-center justify-between text-[var(--color-copy)]">
              <span>{t('invoice.subtotal')}</span>
              <span className="type-body-strong text-[var(--color-ink)]">
                {formatWhmcsCurrency(addFundsSummary.subtotal)}
              </span>
            </div>
            <div className="type-body-lg flex items-center justify-between text-[var(--color-copy)]">
              <span>{t('invoice.vat')}</span>
              <span className="type-body-strong text-[var(--color-ink)]">
                {formatWhmcsCurrency(addFundsSummary.vat)}
              </span>
            </div>
            <div className="type-body-lg flex items-center justify-between text-[var(--color-copy)]">
              <span>{t('addFunds.youPay')}</span>
              <span className="type-metric-md text-[var(--color-ink)]">
                {formatWhmcsCurrency(addFundsSummary.total)}
              </span>
            </div>
            <div className="type-body-lg flex items-center justify-between text-[var(--color-copy)]">
              <span>{t('addFunds.currentBalance')}</span>
              <span className="type-body-strong text-[var(--color-ink)]">
                {formatCurrency(wallet.balance)}
              </span>
            </div>
            <Button
              className="mt-5 w-full justify-center py-4"
              disabled={!canSubmit}
              onClick={handleCreateInvoice}
            >
              <WalletCards className="h-5 w-5" strokeWidth={2.2} />
              {loading.creatingAddFundsInvoice
                ? t('addFunds.creatingInvoice', undefined, 'Creating invoice...')
                : t('common.actions.paySecurely')}
            </Button>
            <p className="type-body-sm text-center text-[var(--color-copy)]">
              {t('addFunds.terms')}
            </p>
          </div>
        </SummaryCard>

        <SurfaceCard className="page-grid">
          <div>
            <p className="type-label text-[var(--color-ink)]">{t('addFunds.selectAmount')}</p>
            {minimumAllowedAmount > 0 ? (
              <p className="type-body-sm text-[var(--color-copy)]">
                {t('addFunds.minimumAmount', { amount: formatWhmcsCurrency(minimumAllowedAmount) }, `Minimum top-up: ${formatWhmcsCurrency(minimumAllowedAmount)}`)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            {availablePresetEurAmounts.map((amount) => (
              <button
                key={amount}
                className={cn(
                  'type-button min-w-[164px] rounded-2xl border px-6 py-4 transition',
                  customAmount === '' && activePresetEurAmount === amount
                    ? 'theme-button-primary'
                    : 'border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-primary)]',
                )}
                disabled={moneyActionsBlocked}
                type="button"
                onClick={() => {
                  setSelectedPresetEurAmount(amount)
                  setCustomAmount('')
                }}
              >
                {formatWhmcsCurrency(resolveSuggestedPresetAmount(amount, pricingContext))}
              </button>
            ))}
            <label className="min-w-[214px]">
              <input
                className="type-input h-[58px] w-full rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 text-start text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-copy)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                disabled={moneyActionsBlocked}
                min={minimumAllowedAmount > 0 ? minimumAllowedAmount : undefined}
                onChange={(event) => setCustomAmount(event.target.value)}
                placeholder={t('addFunds.customAmount')}
                step="0.01"
                type="number"
                value={customAmount}
              />
            </label>
          </div>
          {minimumAllowedAmount > 0 && customAmount !== '' && !meetsMinimumAmount ? (
            <p className="type-body-sm text-[var(--color-warning)]">
              {t('addFunds.minimumAmountHint', { amount: formatWhmcsCurrency(minimumAllowedAmount) }, `Enter at least ${formatWhmcsCurrency(minimumAllowedAmount)}.`)}
            </p>
          ) : null}
        </SurfaceCard>
      </div>
    </div>
  )
}
