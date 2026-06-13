import { cn } from '../../lib/cn'

export function SurfaceCard({
  as: Component = 'div',
  children,
  className,
  interactive = false,
  muted = false,
  padded = true,
  style,
  ...props
}) {
  return (
    <Component
      className={cn(
        'rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-surface)]',
        muted && 'bg-[var(--color-panel-soft)]',
        padded && 'p-6 md:p-8',
        interactive &&
          'transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/15',
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </Component>
  )
}
