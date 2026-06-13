import { SurfaceCard } from './SurfaceCard'

export function TrafficChart({ title, points, inbound, outbound, t = (value) => value }) {
  const width = 420
  const height = 260
  const max = Math.max(...points, 3)
  const path = points
    .map((point, index) => {
      const x = (width / (points.length - 1)) * index
      const y = height - (point / max) * (height - 24) - 12
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  return (
    <SurfaceCard className="h-full" muted>
      <div className="mb-6 flex items-start justify-between gap-3">
        <h3 className="type-card-title text-[var(--color-ink)]">{title}</h3>
        <span className="type-badge rounded-xl bg-[var(--color-surface-elevated)] px-3 py-1 text-[var(--color-primary)]">
          {t('trafficChart.liveGb')}
        </span>
      </div>
      <svg className="h-[260px] w-full" viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2, 3, 4].map((line) => (
          <line
            key={line}
            x1="0"
            x2={width}
            y1={height - line * 55}
            y2={height - line * 55}
            stroke="var(--color-border)"
            strokeDasharray="6 6"
          />
        ))}
        <path d={path} fill="none" stroke="var(--color-primary)" strokeLinecap="round" strokeWidth="4" />
      </svg>
      <div className="mt-6 flex flex-wrap justify-center gap-6">
        <div className="rounded-full border border-[var(--color-success-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-center">
          <p className="type-body-lg-strong text-[var(--color-success)]">{inbound} GB</p>
          <p className="type-label-sm text-[var(--color-success)]">{t('trafficChart.freeIngress')}</p>
        </div>
        <div className="rounded-full border border-[var(--color-info-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-center">
          <p className="type-body-lg-strong text-[var(--color-primary)]">{outbound} GB</p>
          <p className="type-label-sm text-[var(--color-primary)]">{t('trafficChart.meteredUsage')}</p>
        </div>
      </div>
    </SurfaceCard>
  )
}
