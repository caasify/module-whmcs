import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

const buttonBase =
  'type-button inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 disabled:cursor-not-allowed disabled:opacity-50'

const variants = {
  primary: 'theme-button-primary',
  secondary: 'theme-button-secondary',
  subtle: 'theme-button-subtle border-transparent',
}

export function Button({
  children,
  className,
  href,
  to,
  variant = 'primary',
  type = 'button',
  ...props
}) {
  const classes = cn(buttonBase, variants[variant], className)

  if (href) {
    return (
      <a className={classes} href={href} {...props}>
        {children}
      </a>
    )
  }

  if (to) {
    return (
      <Link className={classes} to={to} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  )
}
