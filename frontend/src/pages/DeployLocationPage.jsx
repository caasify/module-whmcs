import { ArrowRight, CheckCircle2 } from '@/components/icons'
import { Link } from 'react-router-dom'
import { buildDeployLocationSections } from '../config/deployRegions'
import { DeployStepLayout } from '../components/deploy/DeployStepLayout'
import { LoadingState } from '../components/ui/LoadingState'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { useDashboardApp } from '../context/useDashboardApp'
import { cn } from '../lib/cn'

function LocationCard({ active, location, onSelect }) {
  const { t } = useDashboardApp()

  return (
    <SurfaceCard
      as="button"
      className={cn(
        'rounded-[22px] px-5 py-4 text-start',
        active
          ? 'border-[var(--color-primary)] shadow-[inset_0_0_0_1px_var(--color-primary)]'
          : 'hover:border-[var(--color-primary)]',
      )}
      interactive
      padded={false}
      type="button"
      onClick={onSelect}
    >
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="type-symbol-lg flex h-9 w-11 items-center justify-center rounded-lg bg-[var(--color-primary-soft)]">
            {location.emoji}
          </span>
          <span className={cn('type-list-title block text-[var(--color-ink)]', active && 'text-[var(--color-primary)]')}>
            {t(`locations.country.${location.countryCode}`, undefined, location.country)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <span className="type-badge inline-flex rounded-md bg-[var(--color-success-soft)] px-3 py-2 text-[var(--color-success)]">
            {t('deploy.online')}
          </span>
          {active ? <CheckCircle2 className="h-5 w-5 text-[var(--color-primary)]" strokeWidth={2.2} /> : null}
        </div>
      </div>
    </SurfaceCard>
  )
}

export function DeployLocationPage() {
  const { deployDraft, deployLocations, formatNumber, loading, actions, t } = useDashboardApp()
  const locationSections = buildDeployLocationSections(
    deployLocations,
    (location) => t(`locations.country.${location.countryCode}`, undefined, location.country),
  )
  const hasLocations = locationSections.length > 0

  return (
    <DeployStepLayout
      backLabelKey="common.actions.backToDashboard"
      backTo="/dashboard"
      currentStep={1}
      sectionDescriptionKey="deploy.steps.location.description"
      sectionTitleKey="deploy.steps.location.title"
    >
      <div className="grid gap-10 pb-8">
        {loading.deployLocations ? (
          <LoadingState
            copy={t(
              'deploy.locations.loading.copy',
              undefined,
              'We are preparing the latest available countries and regions.',
            )}
            title={t('deploy.locations.loading.title', undefined, 'Loading VPS locations...')}
          />
        ) : hasLocations ? locationSections.map((section) => (
          <section key={section.id} className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="type-section-title text-[var(--color-ink)]">
                {t(section.labelKey, undefined, section.label)}
              </h3>
              <span className="type-label-sm rounded-full border border-[var(--color-border)] px-3 py-1 text-[var(--color-copy)]">
                {formatNumber(section.locations.length)}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {section.locations.map((location) => {
                const active = deployDraft.locationId === location.id

                return (
                  <LocationCard
                    key={location.id}
                    active={active}
                    location={location}
                    onSelect={() =>
                      actions.updateDeployDraft({
                        locationId: location.id,
                      })
                    }
                  />
                )
              })}
            </div>
          </section>
        )) : (
          <SurfaceCard className="rounded-[24px] px-6 py-6">
            <p className="type-card-title text-[var(--color-ink)]">
              {t('deploy.locationUnavailableTitle', undefined, 'No VPS locations are currently available')}
            </p>
            <p className="type-body mt-3 text-[var(--color-copy)]">
              {t('deploy.locationUnavailableCopy', undefined, 'Please contact support or try again later.')}
            </p>
          </SurfaceCard>
        )}
      </div>

      {!loading.deployLocations && hasLocations ? (
        <div className="flex justify-end">
          <Link className="theme-button-primary type-button inline-flex h-[56px] items-center gap-2 rounded-[14px] border px-8 transition" to="/deploy/plan">
            {t('common.actions.continueToPlan')}
            <ArrowRight className="rtl-flip h-4 w-4" strokeWidth={2.2} />
          </Link>
        </div>
      ) : null}
    </DeployStepLayout>
  )
}
