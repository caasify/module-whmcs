import { forwardRef } from 'react'
import { cn } from '@/lib/cn'

export function createAnimatedIcon(AnimatedComponent, displayName) {
  const Icon = forwardRef(function AnimatedIcon(
    { className, size = 24, strokeWidth = 2, style, ...props },
    ref,
  ) {
    return (
      <AnimatedComponent
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center align-middle [&>svg]:h-full [&>svg]:w-full [&>svg]:[stroke-width:var(--animated-icon-stroke-width)]',
          className,
        )}
        size={size}
        style={{
          '--animated-icon-stroke-width': strokeWidth,
          ...style,
        }}
        {...props}
      />
    )
  })

  Icon.displayName = displayName

  return Icon
}
