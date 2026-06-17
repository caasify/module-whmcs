import { useEffect, useState } from 'react'
import { dashboardWhmcsApi } from '../../lib/dashboardWhmcsApi'
import { loadDirectAuthTokenOnce } from '../../lib/services/server'

export function useDashboardDirectAuth({
  isAuthenticatedClient,
  isPublicPricingView,
  showErrorNotice,
}) {
  const needsDirectAuthBootstrap =
    !isPublicPricingView
    && isAuthenticatedClient
  const [loading, setLoading] = useState(
    () => needsDirectAuthBootstrap,
  )
  const [ready, setReady] = useState(
    () => !needsDirectAuthBootstrap,
  )

  useEffect(() => {
    if (!needsDirectAuthBootstrap) {
      return
    }

    let cancelled = false

    void loadDirectAuthTokenOnce(() => dashboardWhmcsApi.getDirectAuthToken(), {
      forceRefresh: true,
    })
      .catch(() => {
        if (cancelled) {
          return
        }

        showErrorNotice('We could not connect your account right now.')
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setReady(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [needsDirectAuthBootstrap, showErrorNotice])

  return {
    loading: needsDirectAuthBootstrap ? loading : false,
    ready: needsDirectAuthBootstrap ? ready : true,
  }
}
