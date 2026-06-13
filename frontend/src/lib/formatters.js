function resolveIntlLocale(locale) {
  if (locale === 'fa') {
    return 'fa-IR'
  }

  if (locale === 'es') {
    return 'es-ES'
  }

  if (locale === 'ru') {
    return 'ru-RU'
  }

  return 'en-US'
}

const persianDigitMap = {
  0: '۰',
  1: '۱',
  2: '۲',
  3: '۳',
  4: '۴',
  5: '۵',
  6: '۶',
  7: '۷',
  8: '۸',
  9: '۹',
}

const DEFAULT_CURRENCY_FORMAT = '1,234.56'

function normalizeWhmcsCurrencyFormat(format) {
  const normalizedFormat = String(format ?? '').trim()

  if (normalizedFormat === '1') {
    return '1234.56'
  }

  if (normalizedFormat === '2') {
    return '1,234.56'
  }

  if (normalizedFormat === '3') {
    return '1.234,56'
  }

  if (normalizedFormat === '4') {
    return '1,234'
  }

  return normalizedFormat
}

function normalizeCurrencyInput(currency) {
  if (currency && typeof currency === 'object') {
    return {
      code:
        typeof currency.code === 'string' && currency.code.trim()
          ? currency.code.trim().toUpperCase()
          : 'EUR',
      prefix:
        typeof currency.prefix === 'string'
          ? currency.prefix.trim()
          : '',
      suffix:
        typeof currency.suffix === 'string'
          ? currency.suffix.trim()
          : '',
      format: normalizeWhmcsCurrencyFormat(currency.format),
    }
  }

  return {
    code: typeof currency === 'string' && currency.trim() ? currency.trim().toUpperCase() : 'EUR',
    prefix: '',
    suffix: '',
    format: '',
  }
}

function parseCurrencyFormat(format) {
  const sample = String(normalizeWhmcsCurrencyFormat(format) || DEFAULT_CURRENCY_FORMAT)
    .replace(/[^\d.,]/g, '')
    .trim()

  if (!sample) {
    return {
      decimalSeparator: '.',
      fractionDigits: 2,
      groupSeparator: ',',
      useGrouping: true,
    }
  }

  const lastDot = sample.lastIndexOf('.')
  const lastComma = sample.lastIndexOf(',')

  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSeparator = lastDot > lastComma ? '.' : ','
    const groupSeparator = decimalSeparator === '.' ? ',' : '.'
    const decimalIndex = sample.lastIndexOf(decimalSeparator)

    return {
      decimalSeparator,
      fractionDigits: Math.max(sample.length - decimalIndex - 1, 0),
      groupSeparator,
      useGrouping: sample.includes(groupSeparator),
    }
  }

  if (lastDot >= 0 || lastComma >= 0) {
    const separator = lastDot >= 0 ? '.' : ','
    const separatorPattern = new RegExp(`\\${separator}`, 'g')
    const groupOnlyPattern = new RegExp(`^\\d{1,3}(\\${separator}\\d{3})+$`)

    if (groupOnlyPattern.test(sample)) {
      return {
        decimalSeparator: separator === ',' ? '.' : ',',
        fractionDigits: 0,
        groupSeparator: separator,
        useGrouping: true,
      }
    }

    return {
      decimalSeparator: separator,
      fractionDigits: Math.max(sample.length - sample.lastIndexOf(separator) - 1, 0),
      groupSeparator: separator === ',' ? '.' : ',',
      useGrouping: separatorPattern.test(sample.slice(0, sample.lastIndexOf(separator))),
    }
  }

  return {
    decimalSeparator: '.',
    fractionDigits: 0,
    groupSeparator: ',',
    useGrouping: false,
  }
}

function resolveFractionDigits(parsedFormat, options = {}) {
  const requestedDigits = Number(options?.fractionDigits)

  if (Number.isInteger(requestedDigits) && requestedDigits >= 0) {
    return requestedDigits
  }

  return parsedFormat.fractionDigits
}

export function localizeDigits(value, locale = 'en') {
  if (value === undefined || value === null) {
    return ''
  }

  const normalizedValue = String(value)

  if (locale !== 'fa') {
    return normalizedValue
  }

  return normalizedValue.replace(/\d/g, (digit) => persianDigitMap[digit] ?? digit)
}

export function formatNumber(value, locale = 'en', options = {}) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return localizeDigits(value, locale)
  }

  return new Intl.NumberFormat(resolveIntlLocale(locale), options).format(numericValue)
}

function formatCurrencyAmount(value, currency = 'EUR', locale = 'en', options = {}) {
  const normalizedCurrency = normalizeCurrencyInput(currency)
  const parsedFormat = parseCurrencyFormat(normalizedCurrency.format)
  const fractionDigits = resolveFractionDigits(parsedFormat, options)

  return new Intl.NumberFormat(resolveIntlLocale(locale), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: parsedFormat.useGrouping,
  })
    .formatToParts(Number.isFinite(Number(value)) ? Number(value) : 0)
    .map((part) => {
      if (part.type === 'group') {
        return parsedFormat.groupSeparator
      }

      if (part.type === 'decimal') {
        return parsedFormat.decimalSeparator
      }

      return part.value
    })
    .join('')
}

export function formatCurrency(value, currency = 'EUR', locale = 'en', options = {}) {
  const normalizedCurrency = normalizeCurrencyInput(currency)
  const formattedValue = formatCurrencyAmount(value, normalizedCurrency, locale, options)
  const prefix = normalizedCurrency.prefix
  const suffix = normalizedCurrency.suffix

  if (prefix) {
    return `${prefix}${formattedValue}`.trim()
  }

  if (suffix) {
    return `${formattedValue} ${suffix}`.trim()
  }

  return formattedValue
}

export function formatCompactCurrency(value, currency = 'EUR', locale = 'en', options = {}) {
  return formatCurrencyAmount(value, currency, locale, options)
}

export function roundCurrency(value) {
  return Number(value.toFixed(2))
}

const ISO_DATE_TIME_PATTERN = /\d{4}-\d{1,2}-\d{1,2}[ T]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g
const LOCAL_DATE_WITH_TIME_PATTERN = /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?/g
const LOCAL_DATE_WITH_PREFIX_TIME_PATTERN = /\(\d{1,2}:\d{2}\)\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g
const ISO_DATE_PATTERN = /\d{4}-\d{1,2}-\d{1,2}/g
const LOCAL_DATE_PATTERN = /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g

function createValidLocalDate(year, month, day, hours = 0, minutes = 0, seconds = 0) {
  const parsed = new Date(year, month - 1, day, hours, minutes, seconds)

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hours ||
    parsed.getMinutes() !== minutes ||
    parsed.getSeconds() !== seconds
  ) {
    return null
  }

  return parsed
}

function normalizeTwoDigitYear(year) {
  if (year >= 100) {
    return year
  }

  return year >= 70 ? 1900 + year : 2000 + year
}

function prefersMonthFirstDate(locale = 'en') {
  return locale === 'en'
}

function resolveMonthAndDay(first, second, locale = 'en') {
  if (first > 12) {
    return {
      day: first,
      month: second,
    }
  }

  if (second > 12) {
    return {
      day: second,
      month: first,
    }
  }

  if (prefersMonthFirstDate(locale)) {
    return {
      day: second,
      month: first,
    }
  }

  return {
    day: first,
    month: second,
  }
}

function parseIsoDateString(value) {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hours = Number(match[4] ?? 0)
  const minutes = Number(match[5] ?? 0)
  const seconds = Number(match[6] ?? 0)
  const timezone = match[7] ?? ''

  if (timezone) {
    const normalizedTimezone = timezone.includes(':') || timezone === 'Z'
      ? timezone
      : `${timezone.slice(0, 3)}:${timezone.slice(3)}`
    const isoValue = `${match[1]}-${match[2]}-${match[3]}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${normalizedTimezone}`
    const parsed = new Date(isoValue)

    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return createValidLocalDate(year, month, day, hours, minutes, seconds)
}

function parseLocalDateString(value, locale = 'en') {
  const match = String(value ?? '')
    .trim()
    .match(/^(?:\((\d{1,2}):(\d{2})\)\s*)?(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)

  if (!match) {
    return null
  }

  const prefixHours = Number(match[1] ?? Number.NaN)
  const prefixMinutes = Number(match[2] ?? Number.NaN)
  const first = Number(match[3])
  const second = Number(match[4])
  const year = normalizeTwoDigitYear(Number(match[5]))
  const suffixHours = Number(match[6] ?? Number.NaN)
  const suffixMinutes = Number(match[7] ?? Number.NaN)
  const suffixSeconds = Number(match[8] ?? Number.NaN)
  const { day, month } = resolveMonthAndDay(first, second, locale)
  const hasSuffixTime = Number.isFinite(suffixHours) && Number.isFinite(suffixMinutes)
  const hasPrefixTime = Number.isFinite(prefixHours) && Number.isFinite(prefixMinutes)
  const hours = hasSuffixTime ? suffixHours : hasPrefixTime ? prefixHours : 0
  const minutes = hasSuffixTime ? suffixMinutes : hasPrefixTime ? prefixMinutes : 0
  const seconds = hasSuffixTime ? (Number.isFinite(suffixSeconds) ? suffixSeconds : 0) : 0

  return createValidLocalDate(year, month, day, hours, minutes, seconds)
}

function extractDateCandidates(value) {
  const candidates = []
  const seen = new Set()

  for (const pattern of [
    ISO_DATE_TIME_PATTERN,
    LOCAL_DATE_WITH_TIME_PATTERN,
    LOCAL_DATE_WITH_PREFIX_TIME_PATTERN,
    ISO_DATE_PATTERN,
    LOCAL_DATE_PATTERN,
  ]) {
    const matches = String(value ?? '').match(pattern) ?? []

    for (const match of matches) {
      if (!match || seen.has(match)) {
        continue
      }

      seen.add(match)
      candidates.push(match)
    }
  }

  const trimmed = String(value ?? '').trim()

  if (trimmed && !seen.has(trimmed)) {
    candidates.push(trimmed)
  }

  return candidates
}

function hasExplicitTime(value) {
  const normalizedValue = String(value ?? '')

  return /\(\d{1,2}:\d{2}\)/.test(normalizedValue) || /[ T]\d{1,2}:\d{2}/.test(normalizedValue)
}

function parseDateDescriptor(value, locale = 'en') {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : {
          date: value,
          hasExplicitTime: true,
        }
  }

  if (typeof value === 'number') {
    const parsed = new Date(value)

    return Number.isNaN(parsed.getTime())
      ? null
      : {
          date: parsed,
          hasExplicitTime: true,
        }
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  for (const candidate of extractDateCandidates(trimmed)) {
    const candidateHasExplicitTime = hasExplicitTime(candidate)
    const isoParsed = parseIsoDateString(candidate)

    if (isoParsed) {
      return {
        date: isoParsed,
        hasExplicitTime: candidateHasExplicitTime,
      }
    }

    const localParsed = parseLocalDateString(candidate, locale)

    if (localParsed) {
      return {
        date: localParsed,
        hasExplicitTime: candidateHasExplicitTime,
      }
    }

    const normalizedIso = candidate.replace(/\.(\d{3})\d+(Z|[+-]\d{2}:\d{2})$/, '.$1$2')
    const nativeParsed = new Date(normalizedIso)

    if (!Number.isNaN(nativeParsed.getTime())) {
      return {
        date: nativeParsed,
        hasExplicitTime: candidateHasExplicitTime,
      }
    }
  }

  return null
}

function parseDateValue(value, locale = 'en') {
  return parseDateDescriptor(value, locale)?.date ?? null
}

export function getDateSortValue(value, locale = 'en') {
  const parsed = parseDateValue(value, locale)

  return parsed ? parsed.getTime() : 0
}

export function formatRelativeTime(value, locale = 'en', now = new Date()) {
  const descriptor = parseDateDescriptor(value, locale)
  const date = descriptor?.date ?? null
  const current = parseDateValue(now, locale) ?? new Date()

  if (!date) {
    return value
  }

  const diffInSeconds = Math.round((date.getTime() - current.getTime()) / 1000)
  const absDiffInSeconds = Math.abs(diffInSeconds)
  const resolvedLocale = resolveIntlLocale(locale)
  const formatter = new Intl.RelativeTimeFormat(resolvedLocale, {
    numeric: 'always',
  })
  const autoFormatter = new Intl.RelativeTimeFormat(resolvedLocale, {
    numeric: 'auto',
  })

  if (!descriptor?.hasExplicitTime && typeof value === 'string') {
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const currentStart = new Date(current.getFullYear(), current.getMonth(), current.getDate())
    const diffInDays = Math.round((dateStart.getTime() - currentStart.getTime()) / 86400000)
    const absDiffInDays = Math.abs(diffInDays)

    if (absDiffInDays < 32) {
      return autoFormatter.format(diffInDays, 'day')
    }

    if (absDiffInDays < 365) {
      return formatter.format(Math.round(diffInDays / 30), 'month')
    }

    return formatter.format(Math.round(diffInDays / 365), 'year')
  }

  if (absDiffInSeconds < 45) {
    return autoFormatter.format(0, 'second')
  }

  if (absDiffInSeconds < 3600) {
    return formatter.format(Math.round(diffInSeconds / 60), 'minute')
  }

  if (absDiffInSeconds < 86400) {
    return formatter.format(Math.round(diffInSeconds / 3600), 'hour')
  }

  if (absDiffInSeconds < 2592000) {
    return formatter.format(Math.round(diffInSeconds / 86400), 'day')
  }

  if (absDiffInSeconds < 31536000) {
    return formatter.format(Math.round(diffInSeconds / 2592000), 'month')
  }

  return formatter.format(Math.round(diffInSeconds / 31536000), 'year')
}
