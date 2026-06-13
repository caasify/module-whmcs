import { useEffect } from 'react'
import { redirectToWhmcsUrl } from '../../lib/whmcsClientArea'
import { Button } from './Button'
import { PageHero } from './PageHero'
import { SurfaceCard } from './SurfaceCard'

export function WhmcsRedirectPanel({
  actionLabel,
  actionUrl,
  autoRedirect = true,
  description,
  eyebrow,
  title,
}) {
  useEffect(() => {
    if (!autoRedirect) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      redirectToWhmcsUrl(actionUrl)
    }, 50)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [actionUrl, autoRedirect])

  return (
    <div className="page-grid mx-auto w-full max-w-[960px]">
      <SurfaceCard className="page-grid">
        <PageHero
          eyebrow={eyebrow}
          description={description}
          title={title}
        />
        <div className="flex justify-start">
          <Button className="px-8 py-4" onClick={() => redirectToWhmcsUrl(actionUrl)}>
            {actionLabel}
          </Button>
        </div>
      </SurfaceCard>
    </div>
  )
}
