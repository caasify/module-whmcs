import { cn } from '../../lib/cn'

export function SegmentedTabs({ ariaLabel, items, value, onChange, className, variant = 'segmented' }) {
  if (variant === 'underline') {
    return (
      <div className={cn('overflow-x-auto', className)}>
        <div
          aria-label={ariaLabel}
          className="flex min-w-max items-end gap-8 border-b border-[var(--color-border)]"
          role="tablist"
        >
          {items.map((item) => {
            const active = item.value === value

            return (
              <button
                key={item.value}
                aria-selected={active}
                className={cn(
                  'type-tab relative shrink-0 px-1 pb-5 pt-1 transition-colors focus-visible:outline-none',
                  active
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]',
                )}
                role="tab"
                tabIndex={active ? 0 : -1}
                type="button"
                onClick={() => onChange(item.value)}
              >
                {item.label}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-[-1px] h-1 rounded-full bg-[var(--color-primary)]"
                  />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-full flex-wrap rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-1.5',
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value

        return (
          <button
            key={item.value}
            aria-selected={active}
            className={cn(
              'type-label flex-1 rounded-[18px] px-4 py-3 transition',
              active
                ? 'theme-fill-primary shadow-[var(--shadow-primary-strong)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]',
            )}
            role="tab"
            tabIndex={active ? 0 : -1}
            type="button"
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
