export function getDeployPlanUnitLabel(t, unit) {
  const normalizedUnit = String(unit ?? '').trim().toLowerCase()

  if (normalizedUnit === 'cpu' || normalizedUnit === 'core' || normalizedUnit === 'vcore') {
    return t(
      'deploy.plan.unitCpu',
      undefined,
      t('publicPricing.unit.core', undefined, 'CORE'),
    )
  }

  if (normalizedUnit === 'mb') {
    return t('publicPricing.unit.mb', undefined, 'MB')
  }

  if (normalizedUnit === 'tb') {
    return t('publicPricing.unit.tb', undefined, 'TB')
  }

  return t('publicPricing.unit.gb', undefined, 'GB')
}

export function getDeployPlanMetricDisplay(rawValue, localizeDigits, fallbackUnit = 'gb') {
  const metricValue = String(rawValue ?? '').trim()
  const numericValue = metricValue.replace(/[^0-9.]/g, '')
  const detectedUnit = metricValue.match(/([a-zA-Z]+)$/)?.[1]?.toLowerCase() ?? fallbackUnit

  if (!numericValue) {
    return {
      unit: '',
      value: metricValue || 'n/a',
    }
  }

  return {
    unit: detectedUnit,
    value: localizeDigits(numericValue),
  }
}
