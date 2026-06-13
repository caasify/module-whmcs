import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileText,
  Headset,
  LayoutGrid,
  Plus,
  Server,
  Ticket,
  Wallet,
  X,
} from '@/components/icons'
import { useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { dashboardNavItems } from '../../config/navigation'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { WalletBalanceAction } from './WalletBalanceAction'

const icons = {
  Cpu,
  FileText,
  Headset,
  LayoutGrid,
  Server,
  Ticket,
  Wallet,
}

function SidebarItemLabel({ Icon, item, t, iconRef, showTag = false, desktopCollapsed = false }) {
  return (
    <>
      <Icon ref={iconRef} className="h-5 w-5 shrink-0" strokeWidth={1.9} />
      <span className={cn('flex-1', desktopCollapsed && 'lg:hidden')}>
        {t(item.labelKey, undefined, item.label)}
      </span>
      {showTag ? (
        <span
          className={cn(
            'type-label-sm rounded-full bg-[var(--color-panel-soft)] px-2 py-1 text-[var(--color-primary)]',
            desktopCollapsed && 'lg:hidden',
          )}
        >
          {t(item.tagKey, undefined, item.tag)}
        </span>
      ) : null}
    </>
  )
}

function SidebarDisabledItem({ Icon, item, sharedClass, t, desktopCollapsed }) {
  const iconRef = useRef(null)
  const itemLabel = t(item.labelKey, undefined, item.label)

  function handleEnter() {
    iconRef.current?.startAnimation?.()
  }

  function handleLeave() {
    iconRef.current?.stopAnimation?.()
  }

  return (
    <div
      className={cn(
        sharedClass,
        'cursor-not-allowed border border-transparent text-[var(--color-muted)] opacity-70',
      )}
      aria-label={itemLabel}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      title={itemLabel}
    >
      <SidebarItemLabel
        Icon={Icon}
        desktopCollapsed={desktopCollapsed}
        iconRef={iconRef}
        item={item}
        showTag
        t={t}
      />
    </div>
  )
}

function SidebarNavItem({
  Icon,
  isActive,
  isRtl,
  item,
  nativeUrl = '',
  onClose,
  sharedClass,
  t,
  desktopCollapsed,
}) {
  const iconRef = useRef(null)
  const itemLabel = t(item.labelKey, undefined, item.label)

  function handleEnter() {
    iconRef.current?.startAnimation?.()
  }

  function handleLeave() {
    iconRef.current?.stopAnimation?.()
  }

  const classes = cn(
    sharedClass,
    isActive
      ? isRtl
        ? 'bg-[var(--color-nav-active)] text-[var(--color-ink)] shadow-[inset_-4px_0_0_0_var(--color-primary)]'
        : 'bg-[var(--color-nav-active)] text-[var(--color-ink)] shadow-[inset_4px_0_0_0_var(--color-primary)]'
      : 'text-[var(--color-copy)] hover:bg-[var(--color-panel-soft)] hover:text-[var(--color-ink)]',
  )

  if (nativeUrl) {
    return (
      <a
        className={classes}
        href={nativeUrl}
        aria-label={itemLabel}
        onBlur={handleLeave}
        onClick={onClose}
        onFocus={handleEnter}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        title={itemLabel}
      >
        <SidebarItemLabel
          Icon={Icon}
          desktopCollapsed={desktopCollapsed}
          iconRef={iconRef}
          item={item}
          t={t}
        />
      </a>
    )
  }

  return (
    <NavLink
      className={() => classes}
      to={item.to}
      aria-label={itemLabel}
      onBlur={handleLeave}
      onClick={onClose}
      onFocus={handleEnter}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      title={itemLabel}
    >
      <SidebarItemLabel
        Icon={Icon}
        desktopCollapsed={desktopCollapsed}
        iconRef={iconRef}
        item={item}
        t={t}
      />
    </NavLink>
  )
}

export function Sidebar({
  companyLogoUrl,
  companyName,
  desktopCollapsed,
  formatCurrency,
  isRtl,
  mobileOpen,
  nativeRoutes,
  onClose,
  onStartDeploy,
  onToggleDesktopCollapsed,
  t,
  wallet,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [failedLogoUrl, setFailedLogoUrl] = useState('')
  const CollapseIcon = desktopCollapsed ? ChevronRight : ChevronLeft
  const collapseActionLabel = t(
    desktopCollapsed ? 'header.expandSidebar' : 'header.collapseSidebar',
  )
  const createServiceLabel = t('common.actions.createService')
  const resolvedCompanyLogoUrl = typeof companyLogoUrl === 'string' ? companyLogoUrl.trim() : ''
  const showCompanyLogo = Boolean(resolvedCompanyLogoUrl) && failedLogoUrl !== resolvedCompanyLogoUrl

  function handleCreateService() {
    onStartDeploy()
    navigate('/deploy/location')
    onClose()
  }

  function isItemActive(item) {
    const { pathname } = location

    if (item.to === '/dashboard') {
      return pathname === '/dashboard'
    }

    if (item.to === '/servers') {
      return pathname === '/servers' || pathname.startsWith('/servers/')
    }

    if (item.to === '/billing') {
      return pathname === '/billing' || pathname.startsWith('/billing/invoices/')
    }

    if (item.to === '/billing/add-funds') {
      return pathname === '/billing/add-funds'
    }

    if (item.to === '/support/tickets') {
      return (
        pathname === '/support/tickets' ||
        /^\/support\/tickets\/[^/]+$/.test(pathname)
      )
    }

    return pathname === item.to
  }

  return (
    <>
      <button
        aria-label={t('header.closeSidebarOverlay')}
        className={cn(
          'fixed inset-0 z-30 bg-[var(--color-overlay)] transition duration-200 lg:hidden',
          mobileOpen ? 'visible opacity-100' : 'invisible opacity-0',
        )}
        type="button"
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 z-40 flex w-[19.875rem] flex-col bg-[var(--color-sidebar)] px-5 pb-8 pt-7 shadow-[var(--shadow-sidebar)] transition-[width,padding,transform] duration-300 lg:w-[var(--sidebar-width)] lg:translate-x-0 lg:shadow-none',
          isRtl
            ? 'right-0 border-l border-[var(--color-border)]'
            : 'left-0 border-r border-[var(--color-border)]',
          desktopCollapsed && 'lg:px-3',
          mobileOpen
            ? 'translate-x-0'
            : isRtl
              ? 'translate-x-full'
              : '-translate-x-full',
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className={cn('flex items-center gap-3', desktopCollapsed && 'lg:gap-0')}>
            <div
              className={cn(
                'flex h-14 items-center',
                desktopCollapsed ? 'lg:w-14 lg:justify-center' : 'w-[14rem]',
              )}
            >
              {showCompanyLogo ? (
                <img
                  alt={companyName || 'Company logo'}
                  className={cn(
                    'h-14 w-auto object-contain object-left',
                    desktopCollapsed ? 'lg:max-w-14' : 'max-w-full',
                  )}
                  src={resolvedCompanyLogoUrl}
                  onError={() => setFailedLogoUrl(resolvedCompanyLogoUrl)}
                />
              ) : (
                <span className="theme-button-primary flex h-14 w-14 items-center justify-center rounded-2xl border shadow-[var(--button-primary-shadow)]">
                  <span className="type-brand-mark">☁</span>
                </span>
              )}
            </div>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-[var(--color-muted)] transition hover:bg-[var(--color-panel-soft)] lg:hidden"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" strokeWidth={2.2} />
          </button>
          <button
            className="hidden h-10 w-10 items-center justify-center rounded-2xl text-[var(--color-ink)] transition hover:bg-[var(--color-panel-soft)] lg:inline-flex"
            type="button"
            aria-label={collapseActionLabel}
            title={collapseActionLabel}
            onClick={onToggleDesktopCollapsed}
          >
            <CollapseIcon className={`h-5 w-5 ${isRtl ? 'rtl-flip' : ''}`} strokeWidth={2.2} />
          </button>
        </div>

        <Button
          aria-label={createServiceLabel}
          className={cn(
            'mb-8 w-full justify-center py-4',
            desktopCollapsed && 'lg:mb-6 lg:w-12 lg:self-center lg:px-0',
          )}
          title={desktopCollapsed ? createServiceLabel : undefined}
          onClick={handleCreateService}
        >
          <Plus className="h-5 w-5" strokeWidth={2.4} />
          <span className={cn(desktopCollapsed && 'lg:hidden')}>{createServiceLabel}</span>
        </Button>

        <nav
          className={cn(
            'flex flex-1 flex-col gap-8 overflow-y-auto',
            isRtl ? 'pl-2' : 'pr-2',
            desktopCollapsed && (isRtl ? 'lg:pl-0' : 'lg:pr-0'),
            desktopCollapsed && 'lg:gap-6',
          )}
        >
          {dashboardNavItems.map((group) => (
            <div key={group.groupCode}>
              <p
                className={cn(
                  'type-nav-section mb-4 px-3 text-[var(--color-muted)]',
                  desktopCollapsed && 'lg:hidden',
                )}
              >
                {t(group.groupLabelKey, undefined, group.groupLabel)}
              </p>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const Icon = icons[item.icon]
                  const nativeUrl =
                    typeof item.nativeRouteKey === 'string' &&
                    item.nativeRouteKey &&
                    nativeRoutes?.[item.nativeRouteKey]
                      ? nativeRoutes[item.nativeRouteKey]
                      : ''
                  const sharedClass = cn(
                    'type-nav-item flex w-full items-center gap-3 rounded-[18px] px-4 py-3.5 transition',
                    desktopCollapsed && 'lg:justify-center lg:px-3',
                  )

                  if (item.disabled) {
                    return (
                      <SidebarDisabledItem
                        key={item.label}
                        Icon={Icon}
                        desktopCollapsed={desktopCollapsed}
                        item={item}
                        sharedClass={sharedClass}
                        t={t}
                      />
                    )
                  }

                  return (
                    <SidebarNavItem
                      key={item.label}
                      Icon={Icon}
                      desktopCollapsed={desktopCollapsed}
                      isActive={isItemActive(item)}
                      isRtl={isRtl}
                      item={item}
                      nativeUrl={nativeUrl}
                      onClose={onClose}
                      sharedClass={sharedClass}
                      t={t}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-6 border-t border-[var(--color-border)] pt-6 lg:hidden">
          <WalletBalanceAction
            balance={wallet.balance}
            className="w-full"
            formatCurrency={formatCurrency}
            onClick={onClose}
            t={t}
          />
        </div>
      </aside>
    </>
  )
}
