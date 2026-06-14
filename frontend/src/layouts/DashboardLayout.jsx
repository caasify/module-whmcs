import { AlertTriangle, CheckCircle2, X } from '@/components/icons'
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { TopHeader } from '../components/layout/TopHeader'
import { useDashboardApp } from '../context/useDashboardApp'
import { cn } from '../lib/cn'

const NOTICE_DISMISS_DELAY_MS = 4_000

export function DashboardLayout() {
  const {
    user,
    wallet,
    ui,
    actions,
    companyProfile,
    formatCurrency,
    isRtl,
    locale,
    nativeRoutes,
    supportedLanguages,
    t,
    themeMode,
  } = useDashboardApp()

  useEffect(() => {
    if (!ui.notice) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      actions.dismissNotice()
    }, NOTICE_DISMISS_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [ui.notice, actions.dismissNotice])
  const scaledViewportHeight = { height: 'calc(100vh / var(--app-scale))' }
  const shellStyle = {
    ...scaledViewportHeight,
    '--sidebar-width': ui.desktopSidebarCollapsed ? '7.25rem' : '19.875rem',
  }
  const noticeIsError = ui.notice?.type === 'error'
  const noticeMessage = ui.notice?.message
    ? ui.notice.message
    : ui.notice?.key
      ? t(ui.notice.key, ui.notice.values)
      : ''

  return (
    <div
      className="relative isolate overflow-hidden bg-[var(--color-background)] text-[var(--color-copy)]"
      style={shellStyle}
    >
      <Sidebar
        companyLogoUrl={companyProfile.logoUrl}
        companyName={companyProfile.name}
        desktopCollapsed={ui.desktopSidebarCollapsed}
        formatCurrency={formatCurrency}
        isRtl={isRtl}
        mobileOpen={ui.mobileNavOpen}
        nativeRoutes={nativeRoutes}
        onClose={actions.closeMobileNav}
        onStartDeploy={actions.startDeploy}
        onToggleDesktopCollapsed={actions.toggleDesktopSidebar}
        t={t}
        wallet={wallet}
      />
      <div className="app-content relative z-10 flex flex-col" style={scaledViewportHeight}>
        <TopHeader
          formatCurrency={formatCurrency}
          isRtl={isRtl}
          locale={locale}
          nativeRoutes={nativeRoutes}
          supportedLanguages={supportedLanguages}
          t={t}
          themeMode={themeMode}
          user={user}
          wallet={wallet}
          onOpenMobileNav={actions.openMobileNav}
          onSetLocale={actions.setLocale}
          onToggleThemeMode={actions.toggleThemeMode}
        />
        <main className="min-h-0 w-full flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-[48px]">
          {ui.notice ? (
            <div
              className={cn(
                'mb-6 flex items-start justify-between gap-4 rounded-[24px] border px-5 py-4',
                noticeIsError
                  ? 'border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                  : 'border-[var(--color-success-border)] bg-[var(--color-success-soft)] text-[var(--color-success)]',
              )}
            >
              <div className="flex items-center gap-3">
                {noticeIsError ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.1} />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.1} />
                )}
                <p className="type-body-sm-strong">
                  {noticeMessage}
                </p>
              </div>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[var(--color-surface)]/70"
                type="button"
                onClick={actions.dismissNotice}
              >
                <X className="h-4 w-4" strokeWidth={2.1} />
              </button>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
