import { useCallback, useEffect, useState } from 'react'
import { dashboardWhmcsApi } from '../../lib/dashboardWhmcsApi'

export function useDashboardTickets({
  showErrorNotice,
  whmcsAccess,
}) {
  const [tickets, setTickets] = useState([])
  const [readState, setReadState] = useState({
    nativeFallbackRequired: false,
  })
  const [loading, setLoading] = useState({
    tickets: true,
  })

  const setLoadingFlag = useCallback((key, value) => {
    setLoading((current) => ({
      ...current,
      [key]: value,
    }))
  }, [])

  const refreshWhmcsTickets = useCallback(async () => {
    if (!whmcsAccess.canUseCustomTicketsAndInvoices) {
      setTickets([])
      setReadState({
        nativeFallbackRequired: false,
      })
      setLoadingFlag('tickets', false)
      return
    }

    setLoadingFlag('tickets', true)

    try {
      const payload = await dashboardWhmcsApi.getTickets()
      setTickets(Array.isArray(payload?.tickets) ? payload.tickets : [])
      setReadState({
        nativeFallbackRequired: false,
      })
    } catch (error) {
      setTickets([])
      setReadState({
        nativeFallbackRequired: false,
      })
      showErrorNotice(error?.message || 'Unable to load tickets right now.')
    } finally {
      setLoadingFlag('tickets', false)
    }
  }, [setLoadingFlag, showErrorNotice, whmcsAccess.canUseCustomTicketsAndInvoices])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshWhmcsTickets()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [refreshWhmcsTickets])

  return {
    loading,
    readState,
    refreshWhmcsTickets,
    tickets,
  }
}
