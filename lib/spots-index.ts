// The North America spot index: established venues, listed per sport only where the
// sport is genuinely established there. Data lives in data/spots.json (researched and
// audited); this module is the shape of an entry plus the finder's matching logic.

import raw from '@/data/spots.json'
import { haversineKm } from '@/lib/local-sports'
import { SPORT_BY_ID } from '@/lib/sports'

export type Country = 'US' | 'CA' | 'MX'
export type Skill = 'beginner' | 'intermediate' | 'advanced' | 'all'
export type Month = 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec'

export const MONTHS: Month[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface IndexedSpot {
  name: string
  slug: string
  sports: string[]
  country: Country
  region: string
  nearestTown: string
  lat: number
  lng: number
  venueType: string
  bestMonths: Month[]
  skill: Skill
  why: string
  heads_up: string
  source: string
  confidence: 'high' | 'medium'
}

export const SPOTS: IndexedSpot[] = (raw as IndexedSpot[]).filter(s => s.sports.every(id => SPORT_BY_ID[id]))

export const COUNTRY_LABEL: Record<Country, string> = { US: 'United States', CA: 'Canada', MX: 'Mexico' }

// Broad travel regions a rider thinks in, grouped from states/provinces
export const TRAVEL_REGIONS: { id: string; label: string; regions: string[] }[] = [
  { id: 'pnw', label: 'Pacific Northwest', regions: ['Washington', 'Oregon', 'Idaho'] },
  { id: 'california', label: 'California', regions: ['California'] },
  { id: 'mountain-west', label: 'Mountain West', regions: ['Colorado', 'Utah', 'Wyoming', 'Montana', 'Nevada'] },
  { id: 'southwest', label: 'Southwest', regions: ['Arizona', 'New Mexico'] },
  { id: 'texas-gulf', label: 'Texas & Gulf', regions: ['Texas', 'Louisiana', 'Alabama', 'Mississippi'] },
  { id: 'southeast', label: 'Southeast', regions: ['Florida', 'Georgia', 'North Carolina', 'South Carolina', 'Tennessee', 'Kentucky', 'Virginia', 'West Virginia', 'Arkansas'] },
  { id: 'northeast', label: 'Northeast', regions: ['New York', 'New Jersey', 'Massachusetts', 'New Hampshire', 'Vermont', 'Maine', 'Connecticut', 'Rhode Island', 'Pennsylvania', 'Maryland', 'Delaware'] },
  { id: 'great-lakes', label: 'Great Lakes & Midwest', regions: ['Michigan', 'Wisconsin', 'Minnesota', 'Illinois', 'Indiana', 'Ohio', 'Missouri', 'Iowa', 'South Dakota', 'North Dakota', 'Nebraska', 'Kansas', 'Oklahoma'] },
  { id: 'alaska', label: 'Alaska', regions: ['Alaska'] },
  { id: 'hawaii', label: 'Hawaii', regions: ['Hawaii'] },
  { id: 'western-canada', label: 'Western Canada', regions: ['British Columbia', 'Alberta', 'Yukon'] },
  { id: 'central-eastern-canada', label: 'Central & Eastern Canada', regions: ['Ontario', 'Quebec', 'Manitoba', 'Saskatchewan', 'New Brunswick', 'Nova Scotia', 'Prince Edward Island', 'Newfoundland and Labrador', 'Northwest Territories', 'Nunavut'] },
  { id: 'mexico', label: 'Mexico', regions: [] }, // matched by country
]

export function travelRegionOf(spot: IndexedSpot): string | null {
  if (spot.country === 'MX') return 'mexico'
  const hit = TRAVEL_REGIONS.find(t => t.regions.includes(spot.region))
  return hit?.id ?? null
}

export function spotsForSport(sportId: string): IndexedSpot[] {
  return SPOTS.filter(s => s.sports.includes(sportId))
}

export function spotBySlug(slug: string): IndexedSpot | undefined {
  return SPOTS.find(s => s.slug === slug)
}

// ── The finder ───────────────────────────────────────────────────────
// A handful of answers in, a ranked shortlist out — with the reasons spelled out.

export interface FinderAnswers {
  sports: string[]                         // at least one
  month?: Month | null
  skill?: Exclude<Skill, 'all'> | null
  travelRegion?: string | null             // TRAVEL_REGIONS id, or null for anywhere
  near?: { lat: number; lng: number; label: string; radiusKm: number } | null
}

export interface FinderMatch {
  spot: IndexedSpot
  score: number
  reasons: string[]
  distanceKm: number | null
}

export function findSpots(a: FinderAnswers, limit = 12): FinderMatch[] {
  const wanted = a.sports.filter(id => SPORT_BY_ID[id])
  if (wanted.length === 0) return []

  const matches: FinderMatch[] = []
  for (const spot of SPOTS) {
    const hits = wanted.filter(id => spot.sports.includes(id))
    if (hits.length === 0) continue

    let score = 10 * hits.length
    const reasons: string[] = [hits.map(id => SPORT_BY_ID[id].label).join(' + ')]

    if (a.month) {
      if (spot.bestMonths.includes(a.month)) { score += 6; reasons.push(`in season in ${a.month}`) }
      else {
        const i = MONTHS.indexOf(a.month)
        const shoulder = [MONTHS[(i + 11) % 12], MONTHS[(i + 1) % 12]]
        if (spot.bestMonths.some(m => shoulder.includes(m))) { score += 2; reasons.push(`shoulder season in ${a.month}`) }
        else score -= 4
      }
    }

    if (a.skill) {
      if (spot.skill === 'all' || spot.skill === a.skill) { score += 3; reasons.push(spot.skill === 'all' ? 'suits every level' : `suits ${a.skill}s`) }
      else if (a.skill === 'beginner' && spot.skill === 'advanced') score -= 6
      else if (a.skill === 'advanced' && spot.skill === 'beginner') score -= 2
    }

    let distanceKm: number | null = null
    if (a.near) {
      distanceKm = haversineKm(a.near.lat, a.near.lng, spot.lat, spot.lng)
      if (distanceKm <= a.near.radiusKm) { score += 5; reasons.push(`${Math.round(distanceKm)} km from ${a.near.label}`) }
      else if (distanceKm <= a.near.radiusKm * 2) { score += 1; reasons.push(`${Math.round(distanceKm)} km — a longer haul`) }
      else score -= 5
    } else if (a.travelRegion) {
      if (travelRegionOf(spot) === a.travelRegion) { score += 4; reasons.push(TRAVEL_REGIONS.find(t => t.id === a.travelRegion)?.label ?? '') }
      else score -= 3
    }

    if (spot.confidence === 'high') score += 1

    matches.push({ spot, score, reasons: reasons.filter(Boolean), distanceKm })
  }

  return matches
    .sort((x, y) => y.score - x.score || (x.distanceKm ?? 0) - (y.distanceKm ?? 0) || x.spot.name.localeCompare(y.spot.name))
    .slice(0, limit)
}

// ── Filters for the browse view ──────────────────────────────────────

export interface SpotFilters {
  sport?: string | null
  country?: Country | null
  travelRegion?: string | null
  month?: Month | null
  skill?: Skill | null
}

export function filterSpots(f: SpotFilters): IndexedSpot[] {
  return SPOTS.filter(s =>
    (!f.sport || s.sports.includes(f.sport)) &&
    (!f.country || s.country === f.country) &&
    (!f.travelRegion || travelRegionOf(s) === f.travelRegion) &&
    (!f.month || s.bestMonths.includes(f.month)) &&
    (!f.skill || f.skill === 'all' || s.skill === 'all' || s.skill === f.skill)
  ).sort((a, b) => a.name.localeCompare(b.name))
}

export const NA_COUNTRIES = new Set<string>(['US', 'CA', 'MX'])
export function isNorthAmerica(countryCode: string | null | undefined): boolean {
  return !!countryCode && NA_COUNTRIES.has(countryCode.toUpperCase())
}
