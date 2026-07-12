import { useCallback, useEffect, useState } from 'react'
import { caasifyServerApi, hasDirectAuthToken, isSilentDirectApiFailure } from '../../lib/services/server'
import {
  mapOrdersToServers,
  mapServerDetail,
  mapProfileToUser,
} from '../../lib/services/server'
import { convertHubAmount } from '../../lib/pricing'
import { createNotice } from '../dashboardNotices'
import {
  createInitialDashboardUser,
  initialDashboardWallet,
} from '../dashboardStateDefaults'

const POWER_ACTION_POLL_INTERVAL_MS = 3000
const POWER_ACTION_POLL_ATTEMPTS = 10

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getOrderIdFromServerId(serverId) {
  const rawId = String(serverId ?? '').replace(/^srv-/, '')
  const parsedId = Number(rawId)

  return Number.isFinite(parsedId) ? parsedId : null
}

function isMatchingRequestedOrder(order, orderId) {
  if (!order || typeof order !== 'object' || !Number.isFinite(orderId)) {
    return false
  }

  return Number(order.id) === orderId
}

function normalizeOrderPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  if (Array.isArray(payload)) {
    return payload.find((item) => item && typeof item === 'object') ?? null
  }

  if (payload.id !== undefined) {
    return payload
  }

  if (payload.data !== undefined) {
    const nestedDataPayload = normalizeOrderPayload(payload.data)

    if (nestedDataPayload) {
      return nestedDataPayload
    }
  }

  if (payload.order !== undefined) {
    const nestedOrderPayload = normalizeOrderPayload(payload.order)

    if (nestedOrderPayload) {
      return nestedOrderPayload
    }
  }

  if (payload.item !== undefined) {
    const nestedItemPayload = normalizeOrderPayload(payload.item)

    if (nestedItemPayload) {
      return nestedItemPayload
    }
  }

  return null
}

function isMatchingRequestedServer(server, serverId, orderId) {
  if (!server || typeof server !== 'object') {
    return false
  }

  if (server.id === serverId) {
    return true
  }

  if (!Number.isFinite(orderId)) {
    return false
  }

  return Number(server.orderId) === orderId
}

function normalizeServerActionCode(actionCode) {
  if (actionCode === 'rebuild') {
    return ['rebuild', 'reinstall']
  }

  if (actionCode === 'restart') {
    return ['restart', 'reboot']
  }

  return [actionCode]
}

function findSilentSettledFailure(results) {
  return results.find(
    (result) => result.status === 'rejected' && isSilentDirectApiFailure(result.reason),
  ) ?? null
}

export function useDashboardServers({
  currentClient,
  directAuthReady,
  pricingContext,
  setNotice,
}) {
  const [user, setUser] = useState(() => createInitialDashboardUser(currentClient))
  const [wallet, setWallet] = useState(initialDashboardWallet)
  const [servers, setServers] = useState([])
  const [serverDetails, setServerDetails] = useState({})
  const [serverActionStates, setServerActionStates] = useState({})
  const [serverOverview, setServerOverview] = useState({
    accountBalance: 0,
    activeOrders: 0,
    directTokenPresent: hasDirectAuthToken(),
    expenseDates: [],
    rawActiveOrdersTotal: 0,
    ready: false,
    totalSpend: 0,
  })
  const [loading, setLoading] = useState({
    overview: true,
  })

  const clearDirectServerState = useCallback(() => {
    setServers([])
    setServerDetails({})
    setServerActionStates({})
    setWallet((current) => ({
      ...current,
      balance: 0,
    }))
    setServerOverview({
      accountBalance: 0,
      activeOrders: 0,
      directTokenPresent: false,
      expenseDates: [],
      rawActiveOrdersTotal: 0,
      ready: true,
      totalSpend: 0,
    })
    setLoading({
      overview: false,
    })
  }, [])

  const refreshDirectServerOverview = useCallback(async () => {
    if (!directAuthReady) {
      setLoading({
        overview: true,
      })
      return
    }

    const directTokenPresent = hasDirectAuthToken()

    if (!directTokenPresent) {
      clearDirectServerState()
      return
    }

    setLoading({
      overview: true,
    })

    try {
      const results = await Promise.allSettled([
        caasifyServerApi.getProfile(),
        caasifyServerApi.getOrders(),
        caasifyServerApi.getActiveOrderReport(),
        caasifyServerApi.getTotalExpenseReport(),
        caasifyServerApi.getExpenseDates(),
      ])
      const silentFailure = findSilentSettledFailure(results)

      if (silentFailure) {
        clearDirectServerState()
        return
      }

      const [
        profileResult,
        ordersResult,
        activeOrdersResult,
        totalSpendResult,
        expenseDatesResult,
      ] = results

      if (profileResult.status !== 'fulfilled') {
        throw profileResult.reason
      }

      const profile = profileResult.value?.data ?? {}
      const liveServers = ordersResult.status === 'fulfilled'
        ? mapOrdersToServers(ordersResult.value?.data ?? [], pricingContext)
        : null
      const balance = convertHubAmount(
        Number(profile.available_balance ?? profile.balance ?? 0),
        pricingContext,
        2,
      )

      setUser((current) => mapProfileToUser(profile, current))
      setWallet((current) => ({
        ...current,
        balance,
      }))

      if (liveServers !== null) {
        setServers(liveServers)
      }

      setServerOverview((current) => {
        const activeOrders = activeOrdersResult.status === 'fulfilled'
          ? Number(activeOrdersResult.value?.total ?? liveServers?.length ?? current.rawActiveOrdersTotal)
          : (liveServers?.length ?? current.rawActiveOrdersTotal)
        const totalSpend = totalSpendResult.status === 'fulfilled'
          ? convertHubAmount(Number(totalSpendResult.value?.total ?? 0), pricingContext, 2)
          : current.totalSpend
        const expenseDates = expenseDatesResult.status === 'fulfilled'
          ? (expenseDatesResult.value?.data ?? [])
          : current.expenseDates

        return {
          ...current,
          accountBalance: balance,
          activeOrders,
          directTokenPresent: true,
          expenseDates,
          rawActiveOrdersTotal: activeOrders,
          ready: true,
          totalSpend,
        }
      })
      setLoading({
        overview: false,
      })
    } catch (error) {
      if (isSilentDirectApiFailure(error)) {
        clearDirectServerState()
        return
      }

      setServers([])
      setServerDetails({})
      setWallet((current) => ({
        ...current,
        balance: 0,
      }))
      setServerOverview((current) => ({
        ...current,
        accountBalance: 0,
        activeOrders: 0,
        directTokenPresent,
        ready: true,
        totalSpend: 0,
      }))
      setLoading({
        overview: false,
      })
    }
  }, [clearDirectServerState, directAuthReady, pricingContext])

  const setServerPowerAction = useCallback((serverId, powerAction) => {
    setServerActionStates((current) => {
      if (!powerAction) {
        if (!current[serverId]) {
          return current
        }

        const nextState = { ...current }
        delete nextState[serverId]
        return nextState
      }

      return {
        ...current,
        [serverId]: {
          ...(current[serverId] ?? {}),
          powerAction,
        },
      }
    })
  }, [])

  const loadServerDetail = useCallback(async (serverId) => {
    const orderId = getOrderIdFromServerId(serverId)

    if (!orderId) {
      return null
    }

    const [orderResult, viewsResult, actionsResult, statusResult, trafficResult] = await Promise.allSettled([
      caasifyServerApi.getOrder(orderId),
      caasifyServerApi.getOrderViews(orderId),
      caasifyServerApi.getOrderActions(orderId),
      caasifyServerApi.getOrderStatus(orderId),
      caasifyServerApi.getOrderTraffic(orderId),
    ])
    const fetchedOrderPayload =
      orderResult.status === 'fulfilled'
        ? normalizeOrderPayload(orderResult.value ?? null)
        : null
    const orderPayload = fetchedOrderPayload && isMatchingRequestedOrder(fetchedOrderPayload, orderId)
      ? fetchedOrderPayload
      : null

    if (!orderPayload) {
      return null
    }

    const detailPayload = {
      order: orderPayload,
      views: viewsResult.status === 'fulfilled' ? viewsResult.value?.data ?? [] : [],
      actions: actionsResult.status === 'fulfilled' ? actionsResult.value?.data ?? [] : [],
      status:
        statusResult.status === 'fulfilled'
          && statusResult.value
          && !statusResult.value.message
          ? statusResult.value
          : null,
      traffic:
        trafficResult.status === 'fulfilled'
          && trafficResult.value
          && !trafficResult.value.message
          ? trafficResult.value
          : null,
    }
    const detailServer = mapServerDetail(detailPayload, pricingContext)

    if (!detailServer) {
      return null
    }

    const pinnedServer = {
      ...detailServer,
      id: serverId,
      orderId,
      orderNumber: `#${orderId}`,
      rawOrder: orderPayload,
    }

    setServerDetails((current) => ({
      ...current,
      [serverId]: pinnedServer,
    }))
    setServers((current) => {
      if (!current.some((server) => isMatchingRequestedServer(server, serverId, orderId))) {
        return [pinnedServer, ...current]
      }

      return current.map((server) => (
        isMatchingRequestedServer(server, serverId, orderId)
          ? { ...server, ...pinnedServer }
          : server
      ))
    })

    return pinnedServer
  }, [pricingContext])

  const waitForServerPowerState = useCallback(async (serverId, expectedPowerState) => {
    let latestServer = null

    for (let attempt = 0; attempt < POWER_ACTION_POLL_ATTEMPTS; attempt += 1) {
      latestServer = await loadServerDetail(serverId)

      if (latestServer && Boolean(latestServer.powerState) === expectedPowerState) {
        return latestServer
      }

      if (attempt < POWER_ACTION_POLL_ATTEMPTS - 1) {
        await wait(POWER_ACTION_POLL_INTERVAL_MS)
      }
    }

    return latestServer
  }, [loadServerDetail])

  const findServerActionButton = useCallback((serverId, requestedActionCode) => {
    const server = serverDetails[serverId] ?? servers.find((item) => item.id === serverId) ?? null

    if (!server?.availableButtons?.length) {
      return null
    }

    const acceptedCodes = normalizeServerActionCode(requestedActionCode)

    return (
      server.availableButtons.find((button) => acceptedCodes.includes(button.actionCode))
      ?? null
    )
  }, [serverDetails, servers])

  const toggleServerPower = useCallback(async (serverId) => {
    const server = serverDetails[serverId] ?? servers.find((item) => item.id === serverId) ?? null
    const orderId = getOrderIdFromServerId(serverId)

    if (!server || !orderId) {
      return ''
    }

    const desiredAction = server.powerState ? 'stop' : 'start'
    const button = findServerActionButton(serverId, desiredAction)

    if (!button) {
      return ''
    }

    const nextPowerState = !server.powerState

    setServerPowerAction(serverId, desiredAction)

    try {
      await caasifyServerApi.runOrderAction(orderId, button.id)
      await waitForServerPowerState(serverId, nextPowerState)
      await refreshDirectServerOverview()
    } catch (error) {
      if (!isSilentDirectApiFailure(error)) {
        await loadServerDetail(serverId)
        await refreshDirectServerOverview()
      }

      return ''
    } finally {
      setServerPowerAction(serverId, null)
    }

    return server.managementName ?? server.name
  }, [
    findServerActionButton,
    loadServerDetail,
    refreshDirectServerOverview,
    serverDetails,
    servers,
    setServerPowerAction,
    waitForServerPowerState,
  ])

  const rebootServer = useCallback(async (serverId) => {
    const server = serverDetails[serverId] ?? servers.find((item) => item.id === serverId) ?? null
    const orderId = getOrderIdFromServerId(serverId)
    const button = findServerActionButton(serverId, 'restart')

    if (!server || !orderId || !button) {
      return ''
    }

    try {
      await caasifyServerApi.runOrderAction(orderId, button.id)
      await loadServerDetail(serverId)
      await refreshDirectServerOverview()
      setNotice(createNotice('success', 'notices.serverRestarted', {
        name: server.managementName ?? server.name,
      }))

      return server.managementName ?? server.name
    } catch (error) {
      if (!isSilentDirectApiFailure(error)) {
        await loadServerDetail(serverId)
      }

      return ''
    }
  }, [findServerActionButton, loadServerDetail, refreshDirectServerOverview, serverDetails, servers, setNotice])

  const rebuildServer = useCallback(async (serverId) => {
    const server = serverDetails[serverId] ?? servers.find((item) => item.id === serverId) ?? null
    const orderId = getOrderIdFromServerId(serverId)
    const button = findServerActionButton(serverId, 'rebuild')

    if (!server || !orderId || !button) {
      return ''
    }

    try {
      await caasifyServerApi.runOrderAction(orderId, button.id)
      await loadServerDetail(serverId)
      await refreshDirectServerOverview()
      setNotice(createNotice('success', 'notices.serverReinstalled', {
        name: server.managementName ?? server.name,
      }))

      return server.managementName ?? server.name
    } catch (error) {
      if (!isSilentDirectApiFailure(error)) {
        await loadServerDetail(serverId)
      }

      return ''
    }
  }, [findServerActionButton, loadServerDetail, refreshDirectServerOverview, serverDetails, servers, setNotice])

  const deleteServer = useCallback(async (serverId) => {
    const server = serverDetails[serverId] ?? servers.find((item) => item.id === serverId) ?? null
    const orderId = getOrderIdFromServerId(serverId)

    if (!server || !orderId) {
      return ''
    }

    try {
      await caasifyServerApi.cancelOrder(orderId)
      setServerDetails((current) => {
        const nextState = { ...current }

        delete nextState[serverId]
        return nextState
      })
      setServerActionStates((current) => {
        if (!current[serverId]) {
          return current
        }

        const nextState = { ...current }

        delete nextState[serverId]
        return nextState
      })
      setServers((current) => current.filter((item) => item.id !== serverId))
      await refreshDirectServerOverview()
      setNotice(createNotice('success', 'notices.serverDeleted', {
        name: server.managementName ?? server.name,
      }))

      return server.managementName ?? server.name
    } catch (error) {
      if (!isSilentDirectApiFailure(error)) {
        await refreshDirectServerOverview()
      }

      return ''
    }
  }, [refreshDirectServerOverview, serverDetails, servers, setNotice])

  useEffect(() => {
    if (!directAuthReady) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void refreshDirectServerOverview()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [directAuthReady, refreshDirectServerOverview])

  return {
    deleteServer,
    loadServerDetail,
    loading,
    rebuildServer,
    rebootServer,
    refreshDirectServerOverview,
    serverActionStates,
    serverDetails,
    serverOverview,
    servers,
    toggleServerPower,
    user,
    wallet,
  }
}
