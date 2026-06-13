import { Check } from '@/components/icons'
import { useDashboardApp } from '../../context/useDashboardApp'
import { cn } from '../../lib/cn'

export function StepProgress({ currentStep, steps }) {
  const { formatNumber } = useDashboardApp()

  return (
    <div className="flex items-center justify-between gap-4">
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isComplete = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <div key={stepNumber} className="flex flex-1 items-center gap-4">
            <div className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  'type-button flex h-11 w-11 items-center justify-center rounded-full border transition',
                  isCurrent &&
                    'theme-fill-primary shadow-[var(--shadow-primary-strong)]',
                  isComplete && 'border-[var(--color-primary)] bg-[var(--color-panel-soft)] text-[var(--color-primary)]',
                  !isCurrent &&
                    !isComplete &&
                    'border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-muted)]',
                )}
              >
                {isComplete ? <Check className="h-4 w-4" strokeWidth={2.2} /> : formatNumber(stepNumber)}
              </div>
              <span className="type-label-sm text-center text-[var(--color-muted)]">
                {step}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div className="hidden h-px flex-1 bg-[var(--color-border)] lg:block" />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
