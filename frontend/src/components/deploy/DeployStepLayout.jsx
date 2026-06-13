import { ChevronLeft } from '@/components/icons'
import { Link } from 'react-router-dom'
import { useDashboardApp } from '../../context/useDashboardApp'
import { cn } from '../../lib/cn'

function getProgressWidth(currentStep) {
  if (currentStep === 1) {
    return '0px'
  }

  if (currentStep === 2) {
    return 'calc(50% - 4rem)'
  }

  return 'calc(100% - 4rem)'
}

function ProgressNode({ currentStep, formatNumber, stepNumber }) {
  if (currentStep === 1 && stepNumber === 1) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-nav-active)] shadow-[var(--shadow-primary-soft)] ring-4 ring-[var(--color-surface)]">
        <div className="h-9 w-9 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-primary-soft)]" />
      </div>
    )
  }

  if (stepNumber === currentStep) {
    return (
      <div className="theme-fill-primary type-body-strong flex h-12 w-12 items-center justify-center rounded-full shadow-[var(--shadow-primary-strong)] ring-4 ring-[var(--color-nav-active)]">
        {formatNumber(stepNumber)}
      </div>
    )
  }

  return (
    <div className="type-body-sm-strong flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-copy)] shadow-[var(--shadow-panel)]">
      {formatNumber(stepNumber)}
    </div>
  )
}

export function DeployStepLayout({
  backLabel,
  backLabelKey,
  backTo,
  backUppercase = false,
  children,
  className,
  currentStep,
  maxWidthClassName,
  sectionDescription,
  sectionDescriptionKey,
  sectionTitle,
  sectionTitleKey,
}) {
  const { formatNumber, isRtl, t } = useDashboardApp()

  return (
    <div
      className={cn(
        'mx-auto grid w-full gap-8 pb-16',
        maxWidthClassName ?? 'max-w-[1180px]',
        className,
      )}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <span className="h-8 w-1.5 rounded-full bg-[var(--color-primary)]" />
            <h1 className="type-page-title text-[var(--color-ink)]">{t('deploy.title')}</h1>
          </div>
          <p
            className={cn(
              'type-page-subtitle mt-3 text-[var(--color-copy)]',
              isRtl ? 'pr-[1.7rem]' : 'pl-[1.7rem]',
            )}
          >
            {t('deploy.subtitle')}
          </p>
        </div>

        <div className="type-button inline-flex w-fit items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-nav-active)] px-6 py-3">
          <span className="type-label-sm text-[var(--color-copy)]">{t('common.step')}</span>
          <span className="type-section-title text-[var(--color-primary)]">{formatNumber(currentStep)}</span>
          <span className="text-[var(--color-copy)]">/ {formatNumber(3)}</span>
        </div>
      </div>

      <div className="relative mx-auto hidden w-full max-w-[760px] px-8 md:block">
        <div className="absolute inset-x-8 top-1/2 h-[2px] -translate-y-1/2 bg-[var(--color-info-border)]" />
        <div
          className={cn(
            'absolute top-1/2 h-[2px] -translate-y-1/2 bg-[var(--color-primary-soft)] transition-all duration-200',
            isRtl ? 'right-8' : 'left-8',
          )}
          style={{ width: getProgressWidth(currentStep) }}
        />
        <div className="relative flex items-center justify-between">
          {[1, 2, 3].map((stepNumber) => (
            <ProgressNode
              key={stepNumber}
              currentStep={currentStep}
              formatNumber={formatNumber}
              stepNumber={stepNumber}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          {currentStep === 1 ? (
            <span className="mt-1 h-8 w-8 rounded-full bg-[var(--color-nav-active)]" />
          ) : (
            <span className="theme-fill-primary type-body-sm-strong mt-1 flex h-8 w-8 items-center justify-center rounded-full shadow-[var(--shadow-primary-soft)]">
              {formatNumber(currentStep)}
            </span>
          )}
          <div>
            <h2 className="type-section-title text-[var(--color-ink)]">
              {sectionTitleKey ? t(sectionTitleKey, undefined, sectionTitle) : sectionTitle}
            </h2>
            <p className="type-page-subtitle mt-2 text-[var(--color-copy)]">
              {sectionDescriptionKey
                ? t(sectionDescriptionKey, undefined, sectionDescription)
                : sectionDescription}
            </p>
          </div>
        </div>

        <Link
          className={cn(
            'type-body-strong inline-flex items-center gap-1.5 text-[var(--color-primary)] transition hover:opacity-80',
            backUppercase && 'type-label',
          )}
          to={backTo}
        >
          <ChevronLeft className={`h-4 w-4 ${isRtl ? 'rtl-flip' : ''}`} strokeWidth={2.2} />
          {backLabelKey ? t(backLabelKey, undefined, backLabel) : backLabel}
        </Link>
      </div>

      {children}
    </div>
  )
}
