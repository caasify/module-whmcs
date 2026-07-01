import { useCallback, useEffect, useState } from 'react'
import { filterLocationsByCloudVpsConfig } from '../../lib/cloudVpsConfig'
import { caasifyServerApi, hasDirectAuthToken, isSilentDirectApiFailure } from '../../lib/services/server'
import {
  applyPlanDefaultsToDraft,
  buildCreateOrderPayload,
  createInitialDeployDraft,
  getNetworkCharge,
  mapProductsToDeployPlans,
  mapCountriesToDeployLocations,
  resolveDeployPlanOffer,
} from '../../lib/services/server'
import { createNotice } from '../dashboardNotices'
import { isMoneyActionsBlocked } from '../../lib/pricing'

function parseCreatedServerId(payload) {
  const possibleIds = [
    payload?.data?.id,
    payload?.data?.order_id,
    payload?.order_id,
    payload?.id,
  ]
  const createdId = possibleIds.find((value) => Number.isFinite(Number(value)))

  return createdId ? `srv-${createdId}` : null
}

export function useDashboardDeploy({
  cloudVpsConfig,
  directAuthReady,
  featureFlags,
  loadServerDetail,
  pricingContext,
  refreshDirectServerOverview,
  walletBalanceReady,
  walletBalance,
  setNotice,
}) {
  const [deployLocations, setDeployLocations] = useState([])
  const [deployCategories, setDeployCategories] = useState([])
  const [deployPlans, setDeployPlans] = useState([])
  const [deployDraft, setDeployDraft] = useState(() => createInitialDeployDraft([]))
  const [deployErrorMessage, setDeployErrorMessage] = useState('')
  const [loading, setLoading] = useState({
    locations: true,
    plans: false,
  })

  const selectedDeployPlanGroup =
    deployPlans.find((plan) => plan.id === deployDraft.planId)
    ?? deployPlans[0]
    ?? null
  const selectedDeployPlan = resolveDeployPlanOffer(
    selectedDeployPlanGroup,
    deployDraft.planCityCode,
  )
  const selectedDeployLocation =
    selectedDeployPlan?.location
    ?? deployLocations.find((location) => location.id === deployDraft.locationId)
    ?? deployLocations.find((location) => location.termId === deployDraft.locationTermId)
    ?? deployLocations[0]
    ?? null
  const selectedDeployBilling =
    selectedDeployPlan?.billingOptions.find((option) => option.id === deployDraft.billingDurationId)
    ?? selectedDeployPlan?.billingOptions[0]
    ?? null
  const selectedDeploySystem =
    selectedDeployPlan?.operatingSystems.find((system) => system.id === deployDraft.operatingSystemId)
    ?? selectedDeployPlan?.operatingSystems[0]
    ?? null
  const ipv4Charge = selectedDeployPlan?.ipv4Config?.yesOption
    ? getNetworkCharge(
        selectedDeployBilling,
        selectedDeployPlan.ipv4Config.yesOption.price,
        selectedDeployPlan.billingOptions,
      )
    : 0
  const ipv6Charge = selectedDeployPlan?.ipv6Config?.yesOption
    ? getNetworkCharge(
        selectedDeployBilling,
        selectedDeployPlan.ipv6Config.yesOption.price,
        selectedDeployPlan.billingOptions,
      )
    : 0

  const loadDeployLocations = useCallback(async () => {
    if (!directAuthReady) {
      setLoading((current) => ({
        ...current,
        locations: true,
      }))
      return
    }

    const directTokenPresent = hasDirectAuthToken()

    if (!directTokenPresent) {
      setDeployLocations([])
      setDeployCategories([])
      setDeployDraft(createInitialDeployDraft([]))
      setLoading((current) => ({
        ...current,
        locations: false,
      }))
      return
    }

    setLoading((current) => ({
      ...current,
      locations: true,
    }))

    try {
      const countriesPayload = await caasifyServerApi.getCountries()
      const nextLocations = filterLocationsByCloudVpsConfig(
        mapCountriesToDeployLocations(countriesPayload),
        cloudVpsConfig,
      )

      setDeployLocations(nextLocations)
      setDeployCategories([])
      setDeployDraft((current) => {
        if (nextLocations.some((location) => location.id === current.locationId)) {
          const currentLocation = nextLocations.find((location) => location.id === current.locationId)

          return {
            ...current,
            locationTermId: currentLocation?.termId ?? current.locationTermId,
          }
        }

        return createInitialDeployDraft(nextLocations)
      })
      setLoading((current) => ({
        ...current,
        locations: false,
      }))
    } catch (error) {
      if (isSilentDirectApiFailure(error)) {
        setDeployLocations([])
        setDeployCategories([])
        setDeployDraft(createInitialDeployDraft([]))
        setLoading((current) => ({
          ...current,
          locations: false,
        }))
        return
      }

      setDeployLocations([])
      setDeployCategories([])
      setDeployDraft(createInitialDeployDraft([]))
      setLoading((current) => ({
        ...current,
        locations: false,
      }))
    }
  }, [cloudVpsConfig, directAuthReady])

  const loadDeployPlansForLocation = useCallback(async (locationTermId) => {
    if (!directAuthReady) {
      setLoading((current) => ({
        ...current,
        plans: true,
      }))
      return
    }

    const directTokenPresent = hasDirectAuthToken()

    if (!directTokenPresent || !locationTermId) {
      setDeployPlans([])
      setLoading((current) => ({
        ...current,
        plans: false,
      }))
      return
    }

    setLoading((current) => ({
      ...current,
      plans: true,
    }))

    try {
      const productsPayload = await caasifyServerApi.getProductsByCountry(locationTermId)
      const nextPlans = mapProductsToDeployPlans(
        productsPayload,
        pricingContext,
        cloudVpsConfig,
        featureFlags,
      )

      setDeployPlans(nextPlans)
      setDeployDraft((current) => {
        const preferredPlan = nextPlans.find((plan) => plan.id === current.planId) ?? nextPlans[0] ?? null

        if (!preferredPlan) {
          return {
            ...current,
            billingDurationId: 'hourly',
            operatingSystemId: '',
            planId: '',
            planCityCode: '',
            productId: null,
          }
        }

        return applyPlanDefaultsToDraft(
          current,
          preferredPlan,
          current.planCityCode,
          { preserveSelections: true },
        )
      })
      setLoading((current) => ({
        ...current,
        plans: false,
      }))
    } catch (error) {
      if (isSilentDirectApiFailure(error)) {
        setDeployPlans([])
        setLoading((current) => ({
          ...current,
          plans: false,
        }))
        return
      }

      setDeployPlans([])
      setLoading((current) => ({
        ...current,
        plans: false,
      }))
    }
  }, [cloudVpsConfig, directAuthReady, featureFlags, pricingContext])

  const updateDeployDraft = useCallback((partial) => {
    setDeployDraft((current) => {
      const nextDraft = { ...current, ...partial }

      if (Object.hasOwn(partial, 'serverName')) {
        nextDraft.serverNameAuto = String(partial.serverName ?? '').trim().length === 0
      }

      if (partial.locationId) {
        const selectedLocation = deployLocations.find((location) => location.id === partial.locationId)

        nextDraft.locationTermId = selectedLocation?.termId ?? current.locationTermId
      }

      if (partial.planId || partial.planCityCode) {
        const targetPlanId = partial.planId ?? nextDraft.planId
        const selectedPlan = deployPlans.find((plan) => plan.id === targetPlanId) ?? null
        const preserveSelections = !partial.planId || partial.planId === current.planId

        return applyPlanDefaultsToDraft(
          nextDraft,
          selectedPlan,
          partial.planCityCode ?? nextDraft.planCityCode,
          { preserveSelections },
        )
      }

      return nextDraft
    })
  }, [deployLocations, deployPlans])

  const startDeploy = useCallback(() => {
    setDeployErrorMessage('')
    setDeployDraft(createInitialDeployDraft(deployLocations))
  }, [deployLocations])

  const dismissDeployError = useCallback(() => {
    setDeployErrorMessage('')
  }, [])

  const confirmDeployment = useCallback(async () => {
    if (
      walletBalanceReady
      && (!Number.isFinite(Number(walletBalance)) || Number(walletBalance) <= 0)
    ) {
      setDeployErrorMessage('deploy.configure.balanceInsufficient')
      return null
    }

    if (isMoneyActionsBlocked(pricingContext)) {
      setDeployErrorMessage('billing.pricingUnavailable')
      return null
    }

    if (!selectedDeployPlan) {
      return null
    }

    const payload = buildCreateOrderPayload(selectedDeployPlan, deployDraft)

    try {
      const response = await caasifyServerApi.createOrder(payload)
      const responseMessage = typeof response?.message === 'string' ? response.message.trim() : ''
      const createdServerId = parseCreatedServerId(response)

      if (responseMessage) {
        setDeployErrorMessage(responseMessage)
        return null
      }

      if (!createdServerId) {
        setDeployErrorMessage('deploy.configure.deployFailedFallback')
        return null
      }

      await refreshDirectServerOverview()
      await loadServerDetail(createdServerId)
      setNotice(createNotice('success', 'notices.deploymentSuccess', {
        name: deployDraft.serverName || selectedDeployPlan.title,
      }))

      return createdServerId
    } catch (error) {
      if (!isSilentDirectApiFailure(error)) {
        await refreshDirectServerOverview()
      }

      return null
    }
  }, [deployDraft, loadServerDetail, pricingContext, refreshDirectServerOverview, selectedDeployPlan, setNotice, walletBalance, walletBalanceReady])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDeployLocations()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadDeployLocations])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDeployPlansForLocation(deployDraft.locationTermId)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [deployDraft.locationTermId, loadDeployPlansForLocation])

  return {
    confirmDeployment,
    deployCategories,
    deployDraft,
    deployErrorMessage,
    deployLocations,
    deployPlans,
    loading,
    deployPreview: {
      checkoutTotal:
        (selectedDeployBilling?.total ?? 0)
        + (deployDraft.ipv4Enabled ? ipv4Charge : 0)
        + (deployDraft.ipv6Enabled ? ipv6Charge : 0),
      ipv4Charge,
      ipv6Charge,
    },
    selectedDeployBilling,
    selectedDeployLocation,
    selectedDeployPlan,
    selectedDeploySystem,
    startDeploy,
    dismissDeployError,
    updateDeployDraft,
  }
}
