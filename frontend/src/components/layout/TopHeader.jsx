import { Check, LogOut, Menu, Moon, SunMedium } from '@/components/icons'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { WalletBalanceAction } from './WalletBalanceAction'

const pageCrumbs = [
  {
    match: /^\/dashboard$/,
    sectionKey: 'header.sections.overview',
    sectionLabel: 'Overview',
    pageKey: 'header.pages.dashboard',
    pageLabel: 'Dashboard',
  },
  {
    match: /^\/servers/,
    sectionKey: 'header.sections.overview',
    sectionLabel: 'Overview',
    pageKey: 'header.pages.servers',
    pageLabel: 'Servers List',
  },
  {
    match: /^\/deploy/,
    sectionKey: 'header.sections.overview',
    sectionLabel: 'Overview',
    pageKey: 'header.pages.deploy',
    pageLabel: 'Deploy Service',
  },
  {
    match: /^\/billing\/add-funds/,
    sectionKey: 'header.sections.account',
    sectionLabel: 'Account',
    pageKey: 'header.pages.addFunds',
    pageLabel: 'Add Funds',
  },
  {
    match: /^\/billing\/invoices\//,
    sectionKey: 'header.sections.account',
    sectionLabel: 'Account',
    pageKey: 'header.pages.invoice',
    pageLabel: 'Invoice Details',
  },
  {
    match: /^\/billing/,
    sectionKey: 'header.sections.account',
    sectionLabel: 'Account',
    pageKey: 'header.pages.billing',
    pageLabel: 'Billing',
  },
  {
    match: /^\/support\/tickets/,
    sectionKey: 'header.sections.account',
    sectionLabel: 'Account',
    pageKey: 'header.pages.tickets',
    pageLabel: 'Ticket List',
  },
]

export function TopHeader({
  formatCurrency,
  isRtl,
  locale,
  nativeRoutes,
  supportedLanguages,
  t,
  themeMode,
  user,
  wallet,
  onOpenMobileNav,
  onSetLocale,
  onToggleThemeMode,
}) {
  const location = useLocation()
  const [languageOpen, setLanguageOpen] = useState(false)
  const languageMenuRef = useRef(null)
  const crumb = pageCrumbs.find((item) => item.match.test(location.pathname)) ?? pageCrumbs[0]
  const activeLanguage =
    supportedLanguages.find((language) => language.code === locale) ?? supportedLanguages[0]
  const clientAreaUrl = nativeRoutes?.clientAreaUrl || 'clientarea.php'
  const avatarCharacter = (() => {
    const sourceName = String(user.fullName || user.name || '').trim()

    if (!sourceName) {
      return 'U'
    }

    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      const segment = segmenter.segment(sourceName).containing(0)

      return segment?.segment ?? sourceName.slice(0, 1)
    }

    return sourceName.slice(0, 1)
  })()

  useEffect(() => {
    function handlePointerDown(event) {
      if (!languageMenuRef.current?.contains(event.target)) {
        setLanguageOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setLanguageOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-header)] backdrop-blur">
      <div className="flex h-[76px] w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            aria-label={t('header.closeSidebarOverlay')}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] lg:hidden"
            type="button"
            onClick={onOpenMobileNav}
          >
            <Menu className="h-5 w-5" strokeWidth={2.1} />
          </button>
          <div className="hidden lg:block">
            <p className="type-body text-[var(--color-copy)]">
              <span>{t(crumb.sectionKey, undefined, crumb.sectionLabel)}</span>
              <span className="mx-2 text-[var(--color-muted)]">/</span>
              <span className="type-body-strong text-[var(--color-ink)]">
                {t(crumb.pageKey, undefined, crumb.pageLabel)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <WalletBalanceAction
            balance={wallet.balance}
            className="hidden lg:inline-flex"
            compact
            formatCurrency={formatCurrency}
            t={t}
          />

          <button
            aria-label={t('header.theme.toggle')}
            aria-pressed={themeMode === 'dark'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-primary)] outline-none transition hover:bg-[var(--color-panel-soft)] focus-visible:bg-[var(--color-panel-soft)]"
            title={themeMode === 'dark' ? t('header.theme.dark') : t('header.theme.light')}
            type="button"
            onClick={onToggleThemeMode}
          >
            {themeMode === 'dark' ? (
              <Moon className="h-5 w-5" strokeWidth={2.2} />
            ) : (
              <SunMedium className="h-5 w-5" strokeWidth={2.2} />
            )}
          </button>

          <div className="relative" ref={languageMenuRef}>
            <button
              aria-label={t('header.language.toggle')}
              aria-expanded={languageOpen}
              aria-haspopup="menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full outline-none transition hover:bg-[var(--color-panel-soft)] focus-visible:bg-[var(--color-panel-soft)]"
              title={activeLanguage.country}
              type="button"
              onClick={() => setLanguageOpen((current) => !current)}
            >
              <span aria-hidden="true" className="type-body-lg">
                {activeLanguage.flag}
              </span>
            </button>

            {languageOpen ? (
              <div
                className={`absolute top-[calc(100%+0.75rem)] z-30 min-w-[200px] overflow-hidden rounded-[22px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-menu)] ${
                  isRtl ? 'left-0' : 'right-0'
                }`}
                role="menu"
              >
                {supportedLanguages.map((language) => {
                  const selected = language.code === locale

                  return (
                    <button
                      key={language.code}
                      className={`flex w-full items-center justify-between rounded-[16px] px-4 py-3 text-start transition ${
                        selected
                          ? 'bg-[var(--color-nav-active)] text-[var(--color-primary)]'
                          : 'text-[var(--color-ink)] hover:bg-[var(--color-panel-soft)]'
                      }`}
                      role="menuitemradio"
                      type="button"
                      aria-checked={selected}
                      onClick={() => {
                        onSetLocale(language.code)
                        setLanguageOpen(false)
                      }}
                    >
                      <span className={selected ? 'type-body-strong' : 'type-body'}>
                        {language.label}
                      </span>
                      {selected ? <Check className="h-4 w-4" strokeWidth={2.4} /> : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          <div className="hidden h-12 w-px bg-[var(--color-border)] sm:block" />

          <div className="hidden items-center gap-3 sm:flex">
            <span dir="auto" className="type-body text-[var(--color-copy)]">{user.name}</span>
            <span dir="ltr" className="theme-button-primary type-body-strong flex h-11 w-11 items-center justify-center rounded-full border">
              {avatarCharacter}
            </span>
          </div>

          <a
            aria-label={t('header.clientArea.toggle', undefined, 'Open WHMCS client area')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-ink)] transition hover:bg-[var(--color-panel-soft)]"
            href={clientAreaUrl}
            title={t('header.clientArea.toggle', undefined, 'Open WHMCS client area')}
          >
            <LogOut className="h-5 w-5" strokeWidth={2} />
          </a>
        </div>
      </div>
    </header>
  )
}
