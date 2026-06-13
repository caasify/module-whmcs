import { RefreshCw } from '@/components/icons'
import { cn } from '../../lib/cn'

export function LoadingState({
  title,
  copy,
  className,
  size = 'default',
}) {
  const compact = size === 'compact'

  return (
    <div
      className={cn(
        'grid justify-items-center gap-4 rounded-[24px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] text-center shadow-[var(--shadow-panel)]',
        compact ? 'px-5 py-8' : 'min-h-[220px] px-6 py-10',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <RefreshCw className="h-5 w-5 animate-spin" strokeWidth={2.1} />
      </span>
      <div className="grid max-w-[460px] gap-2">
        <p className="type-card-title text-[var(--color-ink)]">{title}</p>
        <p className="type-body text-[var(--color-copy)]">{copy}</p>
      </div>
    </div>
  )
}
