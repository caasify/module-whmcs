import { defaultLocale, getLocaleMeta, resolveSupportedLocale, supportedLanguages } from './config'
import { messages } from './messages'
import { formatNumber, localizeDigits } from '../lib/formatters'

function formatInterpolatedValue(value, locale) {
  if (typeof value === 'number') {
    return formatNumber(value, locale)
  }

  return localizeDigits(value, locale)
}

function interpolate(template, locale, values = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key]
    return value === undefined || value === null ? '' : formatInterpolatedValue(value, locale)
  })
}

export function translate(locale, key, values, fallback) {
  const message = messages[locale]?.[key] ?? messages.en?.[key] ?? fallback

  if (message === undefined || message === null) {
    return key
  }

  if (typeof message === 'string') {
    return interpolate(message, locale, values)
  }

  return message
}

export function createTranslator(locale) {
  const resolvedLocale = resolveSupportedLocale(locale)

  return (key, values, fallback) => translate(resolvedLocale, key, values, fallback)
}

export function resolveCopy(t, key, fallback, values) {
  if (!key) {
    return fallback
  }

  return t(key, values, fallback)
}

export { defaultLocale, getLocaleMeta, resolveSupportedLocale, supportedLanguages }
