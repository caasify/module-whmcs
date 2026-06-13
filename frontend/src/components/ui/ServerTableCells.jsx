import { CheckCircle2, Copy, Server } from '@/components/icons'
import { useDashboardApp } from '../../context/useDashboardApp'
import { isAvailableServerAddress } from '../../lib/serverTable'

export function ServerInstanceCell({ name }) {
  return (
    <div className="flex items-center gap-6">
      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[20px] border border-[var(--color-info-border)] bg-[var(--color-info-soft)] text-[var(--color-primary)]">
        <Server className="h-10 w-10" strokeWidth={1.8} />
      </span>
      <div>
        <p className="type-body-strong text-[var(--color-ink)]">{name}</p>
      </div>
    </div>
  )
}

export function ServerLocationCell({ city, country }) {
  const { isRtl } = useDashboardApp()
  const locationLabel = [city, country].filter(Boolean).join(isRtl ? '، ' : ', ')

  return (
    <div>
      <p className="type-body-strong text-[var(--color-ink)]">{locationLabel}</p>
    </div>
  )
}

export function ServerAddressCell({ addresses, copiedValue = '', onCopy, align = 'end' }) {
  const availableAddresses = addresses.filter(isAvailableServerAddress)

  if (availableAddresses.length === 0) {
    return <p className="type-body text-[var(--color-copy)]">n/a</p>
  }

  return (
    <div className={`flex flex-col gap-4 ${align === 'start' ? 'items-start text-start' : 'items-end text-end'}`}>
      {availableAddresses.map((address) => (
        <button
          key={address}
          className={`type-body-strong dir-ltr flex items-center gap-4 text-[var(--color-ink)] transition hover:text-[var(--color-primary)] ${
            align === 'start' ? 'justify-start' : 'justify-end'
          }`}
          type="button"
          onClick={onCopy ? (event) => onCopy(event, address) : undefined}
        >
          <span>{address}</span>
          {copiedValue === address ? (
            <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" strokeWidth={2} />
          ) : (
            <Copy className="h-5 w-5" strokeWidth={2} />
          )}
        </button>
      ))}
    </div>
  )
}
