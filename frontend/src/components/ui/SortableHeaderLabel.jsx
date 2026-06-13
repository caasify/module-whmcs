import { ChevronDown, ChevronsUpDown } from '@/components/icons'
import { cn } from '../../lib/cn'

export function SortableHeaderLabel({
  active = false,
  className,
  direction = 'asc',
  label,
  onClick,
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 transition hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:text-[var(--color-ink)]',
        className,
      )}
      type="button"
      onClick={onClick}
    >
      <span>{label}</span>
      {active ? (
        <ChevronDown
          className={cn(
            'h-4 w-4 text-[var(--color-primary)] transition-transform',
            direction === 'asc' && 'rotate-180',
          )}
          strokeWidth={2.2}
        />
      ) : (
        <ChevronsUpDown
          className="h-3.5 w-3.5 text-[var(--color-muted)]"
          strokeWidth={2.2}
        />
      )}
    </button>
  )
}
