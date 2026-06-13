function toNumber(value, fallback = 0) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function roundToPrecision(value, digits = 2) {
  return Number(toNumber(value).toFixed(digits))
}

function normalizeCurrencyMeta(currency, fallbackCode = 'EUR') {
  if (!currency || typeof currency !== 'object') {
    return {
      code: fallbackCode,
      prefix: fallbackCode === 'EUR' ? '€' : '',
      suffix: '',
      format: fallbackCode === 'EUR' ? '1,234.56' : '',
    }
  }

  const code =
    typeof currency.code === 'string' && currency.code.trim()
      ? currency.code.trim().toUpperCase()
      : fallbackCode

  return {
    id: Number.isFinite(Number(currency.id)) ? Number(currency.id) : null,
    code,
    prefix:
      typeof currency.prefix === 'string'
        ? currency.prefix.trim()
        : '',
    suffix:
      typeof currency.suffix === 'string'
        ? currency.suffix.trim()
        : '',
    format:
      typeof currency.format === 'string'
        ? currency.format.trim()
        : '',
  }
}

export function normalizePricingContext(rawPricingContext) {
  const displayMode =
    rawPricingContext?.displayMode === 'converted'
      ? 'converted'
      : 'raw_eur_fallback'
  const clientCurrency = normalizeCurrencyMeta(
    rawPricingContext?.clientCurrency,
    typeof rawPricingContext?.clientCurrencyCode === 'string'
      ? rawPricingContext.clientCurrencyCode
      : 'EUR',
  )
  const displayCurrency = normalizeCurrencyMeta(
    rawPricingContext?.displayCurrency,
    typeof rawPricingContext?.displayCurrencyCode === 'string'
      ? rawPricingContext.displayCurrencyCode
      : displayMode === 'converted'
        ? clientCurrency.code
        : 'EUR',
  )
  const eurRate = Number(rawPricingContext?.eurRate)

  return {
    clientCurrency,
    clientCurrencyCode: clientCurrency.code,
    clientCurrencyId: Number.isFinite(Number(rawPricingContext?.clientCurrencyId))
      ? Number(rawPricingContext.clientCurrencyId)
      : clientCurrency.id,
    displayCurrency,
    displayCurrencyCode: displayCurrency.code,
    displayCurrencyId: Number.isFinite(Number(rawPricingContext?.displayCurrencyId))
      ? Number(rawPricingContext.displayCurrencyId)
      : displayCurrency.id,
    commissionPercent: Math.max(0, toNumber(rawPricingContext?.commissionPercent, 0)),
    displayMode,
    eurRate: Number.isFinite(eurRate) && eurRate > 0 ? eurRate : null,
    moneyActionsBlocked: rawPricingContext?.moneyActionsBlocked === true,
  }
}

export function getCurrencyLabel(currency) {
  return currency?.code || 'EUR'
}

export function getDisplayCurrency(pricingContext) {
  return normalizePricingContext(pricingContext).displayCurrency
}

export function getWhmcsCurrency(pricingContext) {
  return normalizePricingContext(pricingContext).clientCurrency
}

export function isMoneyActionsBlocked(pricingContext) {
  return normalizePricingContext(pricingContext).moneyActionsBlocked
}

export function convertHubAmount(value, pricingContext, digits = 2) {
  const normalizedPricing = normalizePricingContext(pricingContext)
  const amount = toNumber(value, 0)

  if (normalizedPricing.displayMode !== 'converted' || !(normalizedPricing.eurRate > 0)) {
    return roundToPrecision(amount, digits)
  }

  const markupMultiplier = 1 + (normalizedPricing.commissionPercent / 100)

  return roundToPrecision(amount * normalizedPricing.eurRate * markupMultiplier, digits)
}

export function convertClientAmountToHubEur(value, pricingContext, digits = 2) {
  const normalizedPricing = normalizePricingContext(pricingContext)
  const amount = toNumber(value, 0)

  if (normalizedPricing.displayMode !== 'converted' || !(normalizedPricing.eurRate > 0)) {
    return null
  }

  const markupMultiplier = 1 + (normalizedPricing.commissionPercent / 100)

  if (!(markupMultiplier > 0)) {
    return null
  }

  return roundToPrecision(amount / normalizedPricing.eurRate / markupMultiplier, digits)
}
