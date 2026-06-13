import { useEffect, useState } from 'react'
import { dashboardWhmcsApi } from '../../lib/dashboardWhmcsApi'
import { hasDirectAuthToken, persistDirectAuthToken } from '../../lib/services/server'

export function useDashboardDirectAuth({
  isAuthenticatedClient,
  isPublicPricingView,
  showErrorNotice,
}) {
  const needsDirectAuthBootstrap =
    !isPublicPricingView
    && isAuthenticatedClient
    && !hasDirectAuthToken()
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

    void dashboardWhmcsApi.getDirectAuthToken()
      .then((response) => {
        if (cancelled) {
          return
        }

        persistDirectAuthToken(response?.directAuthToken ?? '')
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
