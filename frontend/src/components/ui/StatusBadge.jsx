import { cn } from '../../lib/cn'

const tones = {
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success-border)]',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
  info: 'bg-[var(--color-info-soft)] text-[var(--color-primary)] border-[var(--color-info-border)]',
  neutral: 'bg-[var(--color-panel-muted)] text-[var(--color-muted)] border-[var(--color-border-strong)]',
}

export function StatusBadge({ children, tone = 'neutral', className, withDot = false }) {
  return (
    <span
      className={cn(
        'type-badge inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
        tones[tone],
        className,
      )}
    >
      {withDot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}
