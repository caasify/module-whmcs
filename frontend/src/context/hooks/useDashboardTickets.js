import { useCallback, useEffect, useState } from 'react'
import { fetchTicketList, isWhmcsHandoffError } from '../../lib/services/whmcs'

export function useDashboardTickets({
  nativeRoutes,
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
      const nextTickets = await fetchTicketList(nativeRoutes.ticketListUrl)
      setTickets(Array.isArray(nextTickets) ? nextTickets : [])
      setReadState({
        nativeFallbackRequired: false,
      })
    } catch (error) {
      if (isWhmcsHandoffError(error)) {
        setTickets([])
        setReadState({
          nativeFallbackRequired: true,
        })
        return
      }

      setTickets([])
      setReadState({
        nativeFallbackRequired: false,
      })
      showErrorNotice(error?.message || 'Unable to load tickets right now.')
    } finally {
      setLoadingFlag('tickets', false)
    }
  }, [nativeRoutes.ticketListUrl, setLoadingFlag, showErrorNotice, whmcsAccess.canUseCustomTicketsAndInvoices])

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
