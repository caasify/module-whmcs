export const THEME_MODE_STORAGE_KEY = 'caasify-dashboard-theme-mode'
export const DEFAULT_THEME_MODE = 'light'
export const DEFAULT_APP_SCALE = 0.7

const sharedTypographyTokens = {
  '--font-primary':
    '"Manrope", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  '--font-secondary':
    '"Plus Jakarta Sans", "Manrope", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  '--font-mono-family':
    '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  '--type-page-eyebrow': '1.0625rem',
  '--type-page-title': 'clamp(2.72rem, 2.5vw, 3.28rem)',
  '--type-section-title': 'clamp(2rem, 1.8vw, 2.28rem)',
  '--type-card-title': '1.5rem',
  '--type-page-subtitle': '1.5rem',
  '--type-body-lg': '1.5rem',
  '--type-body': '1.375rem',
  '--type-body-sm': '1.25rem',
  '--type-list-title': '1.5rem',
  '--type-list-meta': '1.25rem',
  '--type-detail-value': '1.5rem',
  '--type-detail-copy': '1.25rem',
  '--type-label': '1.0625rem',
  '--type-label-sm': '1rem',
  '--type-metric-xl': '3.25rem',
  '--type-metric-lg': '2.75rem',
  '--type-metric-md': '2.25rem',
  '--type-metric-sm': '1.5rem',
  '--type-price-lg': '2rem',
  '--type-price-xl': '3rem',
  '--type-price-unit': '0.875rem',
  '--type-mono': '1.125rem',
  '--type-tab': '1.25rem',
  '--type-button': '1.25rem',
  '--type-badge': '1rem',
  '--type-nav-section': '1.0625rem',
  '--type-nav': '1.25rem',
  '--type-brand': '2.25rem',
  '--type-brand-mark': '1.5rem',
  '--type-input': '1.375rem',
  '--type-table-header': '1rem',
  '--type-table-cell': '1.25rem',
  '--type-symbol-sm': '1.25rem',
  '--type-symbol-md': '1.5rem',
  '--type-symbol-lg': '1.625rem',
  '--type-symbol-xl': '2rem',
}

const localeTypographyTokens = {
  default: {},
  fa: {
    '--font-primary':
      '"Vazirmatn", "Manrope", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    '--font-secondary':
      '"Vazirmatn", "Plus Jakarta Sans", "Manrope", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  },
}

function getLocaleTypographyTokens(lang = '') {
  const normalizedLang = typeof lang === 'string' ? lang.toLowerCase() : ''

  if (normalizedLang.startsWith('fa')) {
    return localeTypographyTokens.fa
  }

  return localeTypographyTokens.default
}

export const themeModes = {
  light: {
    ...sharedTypographyTokens,
    '--color-background': '#f6f8ff',
    '--color-surface': '#ffffff',
    '--color-surface-alt': '#f3f6ff',
    '--color-surface-elevated': '#ffffff',
    '--color-header': 'rgba(255,255,255,0.94)',
    '--color-sidebar': '#ffffff',
    '--color-overlay': 'rgba(20,26,43,0.42)',
    '--color-panel-soft': '#eef3ff',
    '--color-panel-muted': '#e4ebff',
    '--color-nav-active': '#d9e2ff',
    '--color-border': '#d8e0f7',
    '--color-border-strong': '#bcc8ed',
    '--color-border-soft': 'rgba(216,224,247,0.72)',
    '--color-border-soft-strong': 'rgba(216,224,247,0.86)',
    '--color-border-contrast': 'rgba(29,84,214,0.28)',
    '--color-row-hover': 'rgba(238,243,255,0.75)',
    '--color-ink': '#141a2b',
    '--color-copy': '#343f5e',
    '--color-muted': '#687796',
    '--color-primary': '#1d54d6',
    '--color-primary-dark': '#1748b9',
    '--color-primary-soft': 'rgba(29,84,214,0.14)',
    '--color-primary-soft-strong': 'rgba(29,84,214,0.22)',
    '--color-secondary': '#5368e8',
    '--color-secondary-soft': '#edf0ff',
    '--color-secondary-border': '#c8d0ff',
    '--color-success': '#16a34a',
    '--color-success-soft': '#f1fcf4',
    '--color-success-border': '#b4efc8',
    '--color-warning': '#d97706',
    '--color-warning-soft': '#fff7e9',
    '--color-warning-border': '#f7ce7c',
    '--color-warning-panel': '#fff7e9',
    '--color-warning-panel-border': '#f7ce7c',
    '--color-danger': '#d33e32',
    '--color-danger-soft': '#fff0ee',
    '--color-danger-border': '#f5b4b0',
    '--color-danger-panel': '#fff6f5',
    '--color-danger-title': '#b92f27',
    '--color-danger-copy': '#c84438',
    '--color-danger-strong': '#d33e32',
    '--color-danger-strong-hover': '#b92f27',
    '--color-info-soft': '#eff4ff',
    '--color-info-border': '#bfd2ff',
    '--color-code-surface': '#0f172a',
    '--color-code-action': '#1e2b48',
    '--color-code-action-hover': '#26395f',
    '--color-code-text': '#b9d2ff',
    '--color-toggle-on': '#1d54d6',
    '--color-toggle-thumb': '#fffdfa',
    '--color-badge-critical': '#db4b42',
    '--color-badge-critical-text': '#ffffff',
    '--color-accent-purple': '#6d5dfc',
    '--color-accent-purple-soft': 'rgba(109,93,252,0.14)',
    '--button-primary-bg': '#1d54d6',
    '--button-primary-border': '#1d54d6',
    '--button-primary-text': '#ffffff',
    '--button-primary-hover-bg': '#1748b9',
    '--button-primary-shadow': '0 14px 34px -18px rgba(29,84,214,0.48)',
    '--button-secondary-bg': '#ffffff',
    '--button-secondary-border': '#bcc8ed',
    '--button-secondary-text': '#141a2b',
    '--button-secondary-hover-bg': '#eff4ff',
    '--button-secondary-hover-border': '#1d54d6',
    '--button-secondary-hover-text': '#1d54d6',
    '--button-subtle-bg': '#eef3ff',
    '--button-subtle-hover-bg': '#e4ebff',
    '--button-subtle-text': '#141a2b',
    '--shadow-surface': '0 30px 70px -48px rgba(36,62,124,0.35)',
    '--shadow-surface-strong': '0 26px 72px -52px rgba(36,62,124,0.52)',
    '--shadow-sidebar': '0 36px 72px -52px rgba(28,58,128,0.55)',
    '--shadow-primary-soft': '0 14px 26px -24px rgba(29,84,214,0.35)',
    '--shadow-primary-strong': '0 20px 35px -24px rgba(29,84,214,0.65)',
    '--shadow-panel': '0 24px 48px -46px rgba(20,26,43,0.36)',
    '--shadow-menu': '0 28px 48px -28px rgba(24,45,107,0.42)',
    '--field-shell-bg': 'rgba(255,255,255,0.96)',
    '--field-shell-bg-alt': 'rgba(246,248,255,0.98)',
    '--field-shell-border-start': 'rgba(255,255,255,0.98)',
    '--field-shell-border-mid': 'rgba(216,224,247,0.92)',
    '--field-shell-border-end': 'rgba(29,84,214,0.22)',
    '--field-shell-shadow': '0 24px 54px -34px rgba(29,84,214,0.28)',
    '--field-shell-shadow-soft': '0 20px 40px -30px rgba(36,62,124,0.25)',
    '--field-shell-ring': 'rgba(29,84,214,0.16)',
    '--field-glow-primary': 'rgba(29,84,214,0.18)',
    '--field-glow-secondary': 'rgba(83,104,232,0.12)',
    '--field-highlight': 'rgba(255,255,255,0.72)',
    '--field-icon-bg': 'rgba(255,255,255,0.86)',
    '--field-icon-border': 'rgba(216,224,247,0.9)',
    '--field-icon-color': '#1d54d6',
    '--field-placeholder': '#687796',
    '--field-readonly-bg': 'rgba(238,243,255,0.94)',
    '--field-menu-shadow': '0 30px 60px -34px rgba(29,84,214,0.24)',
  },
  dark: {
    ...sharedTypographyTokens,
    '--color-background': '#0b1220',
    '--color-surface': '#111b31',
    '--color-surface-alt': '#16223d',
    '--color-surface-elevated': '#1b2a4a',
    '--color-header': 'rgba(11,18,32,0.94)',
    '--color-sidebar': '#0f1729',
    '--color-overlay': 'rgba(3,7,18,0.76)',
    '--color-panel-soft': '#182642',
    '--color-panel-muted': '#223456',
    '--color-nav-active': '#213967',
    '--color-border': '#2b3d62',
    '--color-border-strong': '#3a527d',
    '--color-border-soft': 'rgba(58,82,125,0.72)',
    '--color-border-soft-strong': 'rgba(58,82,125,0.86)',
    '--color-border-contrast': 'rgba(112,154,255,0.24)',
    '--color-row-hover': 'rgba(24,38,66,0.88)',
    '--color-ink': '#f3f6ff',
    '--color-copy': '#c2cbea',
    '--color-muted': '#8f9fc2',
    '--color-primary': '#78a2ff',
    '--color-primary-dark': '#5e88ed',
    '--color-primary-soft': 'rgba(120,162,255,0.18)',
    '--color-primary-soft-strong': 'rgba(120,162,255,0.26)',
    '--color-secondary': '#9aa7ff',
    '--color-secondary-soft': '#222a52',
    '--color-secondary-border': '#5967af',
    '--color-success': '#59d98a',
    '--color-success-soft': 'rgba(89,217,138,0.16)',
    '--color-success-border': 'rgba(89,217,138,0.34)',
    '--color-warning': '#ffbd6b',
    '--color-warning-soft': 'rgba(255,189,107,0.16)',
    '--color-warning-border': 'rgba(255,189,107,0.34)',
    '--color-warning-panel': '#302312',
    '--color-warning-panel-border': 'rgba(255,189,107,0.44)',
    '--color-danger': '#ff897d',
    '--color-danger-soft': 'rgba(255,137,125,0.18)',
    '--color-danger-border': 'rgba(255,137,125,0.34)',
    '--color-danger-panel': '#2d1918',
    '--color-danger-title': '#ff9d93',
    '--color-danger-copy': '#ffc2bb',
    '--color-danger-strong': '#ff6f61',
    '--color-danger-strong-hover': '#eb5a4d',
    '--color-info-soft': 'rgba(120,162,255,0.12)',
    '--color-info-border': 'rgba(120,162,255,0.28)',
    '--color-code-surface': '#050b18',
    '--color-code-action': '#17243e',
    '--color-code-action-hover': '#20335a',
    '--color-code-text': '#b9d2ff',
    '--color-toggle-on': '#78a2ff',
    '--color-toggle-thumb': '#f9fffc',
    '--color-badge-critical': '#ff7368',
    '--color-badge-critical-text': '#0b1220',
    '--color-accent-purple': '#9aa7ff',
    '--color-accent-purple-soft': 'rgba(154,167,255,0.18)',
    '--button-primary-bg': '#78a2ff',
    '--button-primary-border': '#78a2ff',
    '--button-primary-text': '#071126',
    '--button-primary-hover-bg': '#5e88ed',
    '--button-primary-shadow': '0 14px 34px -18px rgba(120,162,255,0.42)',
    '--button-secondary-bg': '#182642',
    '--button-secondary-border': '#3a527d',
    '--button-secondary-text': '#eef7f4',
    '--button-secondary-hover-bg': '#213967',
    '--button-secondary-hover-border': '#78a2ff',
    '--button-secondary-hover-text': '#78a2ff',
    '--button-subtle-bg': '#182642',
    '--button-subtle-hover-bg': '#223456',
    '--button-subtle-text': '#eef7f4',
    '--shadow-surface': '0 30px 70px -48px rgba(2,8,10,0.58)',
    '--shadow-surface-strong': '0 26px 72px -52px rgba(2,8,10,0.68)',
    '--shadow-sidebar': '0 36px 72px -52px rgba(2,8,10,0.72)',
    '--shadow-primary-soft': '0 14px 26px -24px rgba(120,162,255,0.2)',
    '--shadow-primary-strong': '0 20px 35px -24px rgba(120,162,255,0.32)',
    '--shadow-panel': '0 24px 48px -46px rgba(2,8,10,0.56)',
    '--shadow-menu': '0 28px 48px -28px rgba(2,8,10,0.72)',
    '--field-shell-bg': 'rgba(17,27,49,0.96)',
    '--field-shell-bg-alt': 'rgba(22,34,61,0.98)',
    '--field-shell-border-start': 'rgba(120,162,255,0.18)',
    '--field-shell-border-mid': 'rgba(120,162,255,0.32)',
    '--field-shell-border-end': 'rgba(154,167,255,0.28)',
    '--field-shell-shadow': '0 26px 58px -36px rgba(2,8,10,0.72)',
    '--field-shell-shadow-soft': '0 18px 42px -32px rgba(2,8,10,0.66)',
    '--field-shell-ring': 'rgba(120,162,255,0.22)',
    '--field-glow-primary': 'rgba(120,162,255,0.18)',
    '--field-glow-secondary': 'rgba(154,167,255,0.14)',
    '--field-highlight': 'rgba(255,255,255,0.05)',
    '--field-icon-bg': 'rgba(20,41,49,0.92)',
    '--field-icon-border': 'rgba(120,162,255,0.22)',
    '--field-icon-color': '#78a2ff',
    '--field-placeholder': '#9aa8c9',
    '--field-readonly-bg': 'rgba(24,38,66,0.94)',
    '--field-menu-shadow': '0 30px 60px -34px rgba(2,8,10,0.74)',
  },
}

export function isThemeMode(value) {
  return value === 'light' || value === 'dark'
}

export function resolveThemeMode(value) {
  return isThemeMode(value) ? value : DEFAULT_THEME_MODE
}

export function applyThemeMode(mode, root = document.documentElement) {
  const nextMode = resolveThemeMode(mode)
  const tokens = {
    ...themeModes[nextMode],
    ...getLocaleTypographyTokens(root?.lang),
  }

  root.dataset.themeMode = nextMode
  root.style.colorScheme = nextMode

  Object.entries(tokens).forEach(([token, tokenValue]) => {
    root.style.setProperty(token, tokenValue)
  })

  return nextMode
}

export function resolveAppScale(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_APP_SCALE
  }

  if (numericValue < 0.5) {
    return 0.5
  }

  if (numericValue > 1.25) {
    return 1.25
  }

  return Math.round(numericValue * 100) / 100
}

function sanitizeOptionalCssText(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()

  return trimmedValue ? trimmedValue : null
}

function sanitizeHexColor(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim().toLowerCase()

  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/.test(trimmedValue) ? trimmedValue : null
}

export function normalizeDashboardUiSettings(settings = {}) {
  const fonts = settings?.fonts && typeof settings.fonts === 'object' ? settings.fonts : {}
  const colors = settings?.colors && typeof settings.colors === 'object' ? settings.colors : {}

  return {
    themeMode: resolveThemeMode(settings?.themeMode),
    appScale: resolveAppScale(settings?.appScale),
    fonts: {
      primary: sanitizeOptionalCssText(fonts.primary),
      secondary: sanitizeOptionalCssText(fonts.secondary),
      mono: sanitizeOptionalCssText(fonts.mono),
    },
    colors: {
      background: sanitizeHexColor(colors.background),
      surface: sanitizeHexColor(colors.surface),
      copy: sanitizeHexColor(colors.copy),
      primary: sanitizeHexColor(colors.primary),
      secondary: sanitizeHexColor(colors.secondary),
      buttonPrimaryBg: sanitizeHexColor(colors.buttonPrimaryBg),
      buttonPrimaryText: sanitizeHexColor(colors.buttonPrimaryText),
      buttonSecondaryBg: sanitizeHexColor(colors.buttonSecondaryBg),
      buttonSecondaryText: sanitizeHexColor(colors.buttonSecondaryText),
    },
  }
}

export function applyDashboardUiSettings(settings, root = document.documentElement) {
  const normalizedSettings = normalizeDashboardUiSettings(settings)
  const colorSettings = normalizedSettings.colors
  const fontSettings = normalizedSettings.fonts
  const colorTokenMap = {
    background: '--color-background',
    surface: '--color-surface',
    copy: '--color-copy',
    primary: '--color-primary',
    secondary: '--color-secondary',
    buttonPrimaryBg: '--button-primary-bg',
    buttonPrimaryText: '--button-primary-text',
    buttonSecondaryBg: '--button-secondary-bg',
    buttonSecondaryText: '--button-secondary-text',
  }

  root.style.setProperty('--app-scale', String(normalizedSettings.appScale))

  if (fontSettings.primary) {
    root.style.setProperty('--font-primary', fontSettings.primary)
  }

  if (fontSettings.secondary) {
    root.style.setProperty('--font-secondary', fontSettings.secondary)
  }

  if (fontSettings.mono) {
    root.style.setProperty('--font-mono-family', fontSettings.mono)
  }

  Object.entries(colorTokenMap).forEach(([key, token]) => {
    const colorValue = colorSettings[key]

    if (!colorValue) {
      return
    }

    root.style.setProperty(token, colorValue)
  })

  if (colorSettings.buttonPrimaryBg) {
    root.style.setProperty('--button-primary-border', colorSettings.buttonPrimaryBg)
  }

  return normalizedSettings
}
