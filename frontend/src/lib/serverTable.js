export function isAvailableServerAddress(address) {
  return Boolean(address) && address !== 'n/a'
}

export function getServerDisplayName(server) {
  return server.managementName ?? server.name
}

export function compareIpAddress(left, right) {
  const leftAddress = isAvailableServerAddress(left) ? left : null
  const rightAddress = isAvailableServerAddress(right) ? right : null

  if (!leftAddress && !rightAddress) {
    return 0
  }

  if (!leftAddress) {
    return 1
  }

  if (!rightAddress) {
    return -1
  }

  const leftParts = leftAddress
    .split('.')
    .map((part) => Number(part))
    .filter((part) => !Number.isNaN(part))
  const rightParts = rightAddress
    .split('.')
    .map((part) => Number(part))
    .filter((part) => !Number.isNaN(part))
  const maxLength = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] ?? -1
    const rightValue = rightParts[index] ?? -1

    if (leftValue !== rightValue) {
      return leftValue - rightValue
    }
  }

  return leftAddress.localeCompare(rightAddress)
}

export function getServerLocationLabel(server, t) {
  const city = t(`locations.city.${server.location.cityCode}`, undefined, server.location.city)
  const country = t(
    `locations.country.${server.location.countryCode}`,
    undefined,
    server.location.country,
  )

  return [city, country].filter(Boolean).join(', ')
}
