export const defaultLocale = 'fa'

export const supportedLanguages = [
  {
    code: 'fa',
    label: 'فارسی',
    country: 'Iran',
    flag: '🇮🇷',
    dir: 'rtl',
    active: true,
  },
  {
    code: 'en',
    label: 'English',
    country: 'United States',
    flag: '🇺🇸',
    dir: 'ltr',
    active: true,
  },
  {
    code: 'es',
    label: 'Español',
    country: 'Spain',
    flag: '🇪🇸',
    dir: 'ltr',
    active: true,
  },
  {
    code: 'ru',
    label: 'Русский',
    country: 'Russia',
    flag: '🇷🇺',
    dir: 'ltr',
    active: true,
  },
]

export function getLocaleMeta(locale) {
  return supportedLanguages.find((item) => item.code === locale) ?? supportedLanguages[0]
}

export function isSupportedLocale(locale) {
  return supportedLanguages.some((item) => item.code === locale && item.active)
}

export function resolveSupportedLocale(locale) {
  return isSupportedLocale(locale) ? locale : defaultLocale
}
