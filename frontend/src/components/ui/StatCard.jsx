import { cn } from '../../lib/cn'
import { SurfaceCard } from './SurfaceCard'

export function StatCard({ icon: Icon, label, value, caption, className }) {
  return (
    <SurfaceCard className={cn('h-full min-h-[176px]', className)}>
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-panel-muted)] text-[var(--color-muted)]">
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </div>
      <p className="type-label text-[var(--color-muted)]">
        {label}
      </p>
      <p className="type-metric-xl mt-4 text-[var(--color-ink)]">
        {value}
      </p>
      {caption ? <p className="type-body-sm mt-3 text-[var(--color-copy)]">{caption}</p> : null}
    </SurfaceCard>
  )
}
