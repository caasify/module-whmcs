import { SurfaceCard } from './SurfaceCard'

export function SummaryCard({
  title,
  subtitle,
  children,
  actions,
  className,
  interactive = false,
  muted = false,
}) {
  return (
    <SurfaceCard
      className={className}
      interactive={interactive}
      muted={muted}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="type-card-title text-[var(--color-ink)]">
            {title}
          </h3>
          {subtitle ? (
            <p className="type-label-sm mt-2 text-[var(--color-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </SurfaceCard>
  )
}
