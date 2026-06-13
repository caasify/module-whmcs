import { cn } from '../../lib/cn'

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  children,
  pill,
  className,
  compact = false,
}) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="type-page-eyebrow mb-2 text-[var(--color-primary)]">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <div className="flex flex-wrap items-center gap-3">
              <h1
                className={cn(
                  'type-page-title text-[var(--color-ink)]',
                  compact && 'type-section-title',
                )}
              >
                {title}
              </h1>
              {pill}
            </div>
          ) : null}
          {description ? (
            <p className="type-body-lg mt-3 max-w-2xl text-[var(--color-copy)]">
              {description}
            </p>
          ) : null}
          {children}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  )
}
