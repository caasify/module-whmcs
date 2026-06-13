import { Plus, WalletCards } from '@/components/icons'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

export function WalletBalanceAction({
  balance,
  className,
  compact = false,
  formatCurrency,
  onClick,
  t,
  to = '/billing/add-funds',
}) {
  return (
    <Link
      aria-label={t('common.actions.addFunds')}
      className={cn(
        'inline-flex items-center gap-3 rounded-[18px] border border-[var(--color-border-strong)] bg-[var(--color-panel-soft)] text-start transition hover:border-[var(--color-primary)]',
        compact ? 'h-[50px] px-3' : 'w-full justify-between px-4 py-3.5',
        className,
      )}
      to={to}
      onClick={onClick}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]',
            compact ? 'h-10 w-10' : 'h-12 w-12 shrink-0',
          )}
        >
          <WalletCards className="h-5 w-5" strokeWidth={2} />
        </span>
        <span className={compact ? 'hidden min-w-[76px] sm:block' : 'min-w-0'}>
          <span className="type-label-sm block text-[var(--color-muted)]">{t('common.balance')}</span>
          <span className="type-body-strong text-[var(--color-ink)]">
            {formatCurrency(balance)}
          </span>
        </span>
      </span>
      <span
        className={cn(
          'flex items-center justify-center rounded-full text-[var(--color-primary)]',
          compact ? 'h-8 w-8' : 'h-10 w-10 shrink-0 border border-[var(--color-border)] bg-[var(--color-surface)]',
        )}
      >
        <Plus className={compact ? 'h-6 w-6' : 'h-5 w-5'} strokeWidth={compact ? 2.4 : 2.3} />
      </span>
    </Link>
  )
}
