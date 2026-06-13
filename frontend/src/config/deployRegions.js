export const deployLocationRegionGroups = [
  {
    id: 'asia',
    label: 'Asia',
    labelKey: 'locations.region.asia',
    locations: [
      { id: 'au-australia', country: 'Australia', countryCode: 'australia', city: 'Sydney', cityCode: 'sydney', emoji: '🇦🇺' },
      { id: 'in-india', country: 'India', countryCode: 'india', city: 'Mumbai', cityCode: 'mumbai', emoji: '🇮🇳' },
      { id: 'id-indonesia', country: 'Indonesia', countryCode: 'indonesia', city: 'Jakarta', cityCode: 'jakarta', emoji: '🇮🇩' },
      { id: 'jp-japan', country: 'Japan', countryCode: 'japan', city: 'Tokyo', cityCode: 'tokyo', emoji: '🇯🇵' },
      { id: 'sg-singapore', country: 'Singapore', countryCode: 'singapore', city: 'Singapore', cityCode: 'singapore', emoji: '🇸🇬' },
      { id: 'tr-turkey', country: 'Turkey', countryCode: 'turkey', city: 'Istanbul', cityCode: 'istanbul', emoji: '🇹🇷' },
      { id: 'ae-uae', country: 'United Arab Emirates', countryCode: 'uae', city: 'Dubai', cityCode: 'dubai', emoji: '🇦🇪' },
      { id: 'kr-south-korea', country: 'South Korea', countryCode: 'southKorea', city: 'Seoul', cityCode: 'seoul', emoji: '🇰🇷' },
    ],
  },
  {
    id: 'america',
    label: 'America',
    labelKey: 'locations.region.america',
    locations: [
      { id: 'us-usa', country: 'USA', countryCode: 'usa', city: 'New Jersey', cityCode: 'newJersey', emoji: '🇺🇸' },
      { id: 'br-brazil', country: 'Brazil', countryCode: 'brazil', city: 'Sao Paulo', cityCode: 'saoPaulo', emoji: '🇧🇷' },
      { id: 'ca-canada', country: 'Canada', countryCode: 'canada', city: 'Toronto', cityCode: 'toronto', emoji: '🇨🇦' },
      { id: 'mx-mexico', country: 'Mexico', countryCode: 'mexico', city: 'Mexico City', cityCode: 'mexicoCity', emoji: '🇲🇽' },
    ],
  },
  {
    id: 'europe',
    label: 'Europe',
    labelKey: 'locations.region.europe',
    locations: [
      { id: 'fr-france', country: 'France', countryCode: 'france', city: 'Paris', cityCode: 'paris', emoji: '🇫🇷' },
      { id: 'de-germany', country: 'Germany', countryCode: 'germany', city: 'Frankfurt', cityCode: 'frankfurt', emoji: '🇩🇪' },
      { id: 'nl-netherlands', country: 'Netherlands', countryCode: 'netherlands', city: 'Amsterdam', cityCode: 'amsterdam', emoji: '🇳🇱' },
      { id: 'es-spain', country: 'Spain', countryCode: 'spain', city: 'Madrid', cityCode: 'madrid', emoji: '🇪🇸' },
      { id: 'se-sweden', country: 'Sweden', countryCode: 'sweden', city: 'Stockholm', cityCode: 'stockholm', emoji: '🇸🇪' },
      { id: 'uk-united-kingdom', country: 'United Kingdom', countryCode: 'unitedKingdom', city: 'London', cityCode: 'london', emoji: '🇬🇧' },
      { id: 'fi-finland', country: 'Finland', countryCode: 'finland', city: 'Helsinki', cityCode: 'helsinki', emoji: '🇫🇮' },
    ],
  },
  {
    id: 'other',
    label: 'Other',
    labelKey: 'locations.region.other',
    locations: [
      { id: 'za-south-africa', country: 'South Africa', countryCode: 'southAfrica', city: 'Cape Town', cityCode: 'capeTown', emoji: '🇿🇦' },
    ],
  },
]

const deployLocationRegionMeta = deployLocationRegionGroups.map((group) => ({
  id: group.id,
  label: group.label,
  labelKey: group.labelKey,
}))

const deployLocationRegionByCountry = new Map()

for (const group of deployLocationRegionGroups) {
  for (const location of group.locations) {
    deployLocationRegionByCountry.set(location.countryCode, group.id)
    deployLocationRegionByCountry.set(String(location.country ?? '').trim().toLowerCase(), group.id)
  }
}

export function buildDeployLocationSections(locations, getCountryLabel = (location) => location.country) {
  const sections = deployLocationRegionMeta.map((group) => ({
    ...group,
    locations: [],
  }))
  const sectionById = new Map(sections.map((section) => [section.id, section]))
  const fallbackSection = sectionById.get('other') ?? sections[sections.length - 1]

  for (const location of locations) {
    const regionId = deployLocationRegionByCountry.get(location.countryCode)
      ?? deployLocationRegionByCountry.get(String(location.country ?? '').trim().toLowerCase())
      ?? fallbackSection?.id
    const section = sectionById.get(regionId) ?? fallbackSection

    if (section) {
      section.locations.push(location)
    }
  }

  return sections
    .map((section) => ({
      ...section,
      locations: [...section.locations].sort((left, right) =>
        getCountryLabel(left).localeCompare(getCountryLabel(right)),
      ),
    }))
    .filter((section) => section.locations.length > 0)
}
