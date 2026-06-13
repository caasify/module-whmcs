import { AlertTriangle, X } from '@/components/icons'
import { useEffect } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

const iconToneClasses = {
  info: 'border-[var(--color-info-border)] bg-[var(--color-info-soft)] text-[var(--color-primary)]',
  warning:
    'border-[var(--color-warning-panel-border)] bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  danger: 'border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] text-[var(--color-danger-copy)]',
}

const confirmToneClasses = {
  info: 'theme-button-primary',
  warning:
    'border-[var(--color-warning-panel-border)] bg-[var(--color-warning-soft)] text-[var(--color-warning)] hover:bg-[var(--color-surface)]',
  danger:
    'border-[var(--color-danger-strong)] bg-[var(--color-danger-strong)] text-white hover:bg-[var(--color-danger-strong-hover)]',
}

export function ConfirmationDialog({
  cancelLabel,
  confirmLabel,
  description,
  icon: Icon = AlertTriangle,
  onClose,
  onConfirm,
  open = false,
  title,
  tone = 'info',
}) {
  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-background)_55%,transparent)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] rounded-[32px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-menu)] sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border',
                iconToneClasses[tone] ?? iconToneClasses.info,
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={2} />
            </span>
            <div className="text-start">
              <h2 className="type-section-title text-[var(--color-ink)]">{title}</h2>
              <p className="type-body-lg mt-3 text-[var(--color-copy)]">{description}</p>
            </div>
          </div>

          <button
            aria-label={cancelLabel}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-copy)] transition hover:bg-[var(--color-panel-soft)] hover:text-[var(--color-ink)]"
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" strokeWidth={2.1} />
          </button>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button className="justify-center px-5 py-3.5" variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <button
            className={cn(
              'type-button inline-flex items-center justify-center rounded-2xl border px-5 py-3.5 transition',
              confirmToneClasses[tone] ?? confirmToneClasses.info,
            )}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
