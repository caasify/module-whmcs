import { cn } from '../../lib/cn'
import { SurfaceCard } from './SurfaceCard'

const toneClasses = {
  success: {
    card: 'border-[var(--color-border)] bg-[var(--color-surface)]',
    icon: 'bg-[var(--color-surface-elevated)] text-[var(--color-success)] ring-[var(--color-border)]',
    value: 'text-[var(--color-ink)]',
    soft: 'bg-[var(--color-surface-elevated)] text-[var(--color-success)]',
  },
  info: {
    card: 'border-[var(--color-border)] bg-[var(--color-surface)]',
    icon: 'bg-[var(--color-surface-elevated)] text-[var(--color-primary)] ring-[var(--color-border)]',
    value: 'text-[var(--color-ink)]',
    soft: 'bg-[var(--color-surface-elevated)] text-[var(--color-primary)]',
  },
}

export function MetricCard({
  label,
  value,
  suffix,
  badge,
  tone = 'info',
  icon: Icon,
  className,
  caption,
}) {
  const styles = toneClasses[tone] ?? toneClasses.info

  return (
    <SurfaceCard
      className={cn(
        'group relative min-h-[176px] overflow-hidden border px-7 py-7 transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-surface-strong)]',
        styles.card,
        className,
      )}
      padded={false}
    >
      <div className="flex items-start justify-between gap-5">
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-[18px] ring-1',
            styles.icon,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </div>
        {badge ? (
          <span
            className={cn(
              'type-badge rounded-full px-4 py-2 shadow-[var(--shadow-panel)]',
              styles.soft,
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-8">
        <p className="type-label text-[var(--color-copy)]">{label}</p>
        <div className="mt-4 flex items-end gap-2">
          <p className={cn('type-metric-xl', styles.value)}>{value}</p>
          {suffix ? <p className="type-metric-sm pb-1 text-[var(--color-primary)]">{suffix}</p> : null}
        </div>
        {caption ? <p className="type-body-sm mt-3 text-[var(--color-copy)]">{caption}</p> : null}
      </div>
    </SurfaceCard>
  )
}
