function getOperatingSystemNameParts(title) {
  const compactTitle = String(title ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  const has64Bit = /\s+64(\s*bit)?$/i.test(compactTitle)
  const cleanedTitle = compactTitle.replace(/\s+64(\s*bit)?$/i, '').trim()

  return {
    cleanedTitle: cleanedTitle || 'Template',
    has64Bit,
  }
}

const operatingSystemPatterns = [
  { regex: /^debian(?:\s+(.+))?$/i, key: 'operatingSystems.debian' },
  { regex: /^ubuntu(?:\s+(.+))?$/i, key: 'operatingSystems.ubuntu' },
  { regex: /^rocky(?:\s+linux)?(?:\s+(.+))?$/i, key: 'operatingSystems.rockyLinux' },
  { regex: /^alma(?:\s*linux)?(?:\s+(.+))?$/i, key: 'operatingSystems.almaLinux' },
  { regex: /^windows(?:\s+(.+))?$/i, key: 'operatingSystems.windows' },
  { regex: /^mikrotik(?:\s+chr)?(?:\s+(.+))?$/i, key: 'operatingSystems.mikroTik' },
  { regex: /^vpn\s+trojan(?:\s+(.+))?$/i, key: 'operatingSystems.vpnTrojan' },
]

function getOperatingSystemTranslationMeta(title) {
  const { cleanedTitle } = getOperatingSystemNameParts(title)
  const normalizedTitle = cleanedTitle

  for (const pattern of operatingSystemPatterns) {
    const match = normalizedTitle.match(pattern.regex)

    if (!match) {
      continue
    }

    const version = String(match[1] ?? '').trim()

    return {
      key: version ? `${pattern.key}Version` : pattern.key,
      values: version ? { version } : undefined,
      fallback: normalizedTitle,
    }
  }

  return {
    key: null,
    values: undefined,
    fallback: normalizedTitle,
  }
}

export function translateOperatingSystemTitle(t, title) {
  const translationMeta = getOperatingSystemTranslationMeta(title)

  if (!translationMeta.key) {
    return translationMeta.fallback
  }

  return t(translationMeta.key, translationMeta.values, translationMeta.fallback)
}

export function formatOperatingSystemDisplayName(t, operatingSystem) {
  const source = typeof operatingSystem === 'string'
    ? { title: operatingSystem }
    : (operatingSystem ?? {})
  const { has64Bit } = getOperatingSystemNameParts(source.title)
  const title = translateOperatingSystemTitle(t, source.title)
  const hasSubtitle = Boolean(
    source.subtitleKey
    || (source.subtitle && String(source.subtitle).trim().toLowerCase() !== 'template')
    || has64Bit,
  )

  if (!hasSubtitle) {
    return title
  }

  const subtitle = source.subtitleKey || source.subtitle
    ? t(source.subtitleKey, undefined, source.subtitle)
    : t('common.bits64')

  return [title, subtitle].filter(Boolean).join(' ')
}
