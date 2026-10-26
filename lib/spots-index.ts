// The featured spot index: well-known skateparks, plazas, DIYs, street spots, pump tracks, bike
// parks and BMX tracks across Canada, the US and Mexico, each researched with a source.
// Data lives in data/spots.json (built by scripts/build-spots.mjs); this module is the shape of an
// entry plus the browse filters and the finder's matching logic.

import raw from '@/data/spots.json'
import { haversineKm } from '@/lib/geo'
import { KIND_META, KIND_GROUPS, styleFit, type Kind, type Style } from '@/lib/sports'
import type { Surface, SpotTraits } from '@/lib/skate'

export type Country = 'US' | 'CA' | 'MX'
export type Skill = 'beginner' | 'intermediate' | 'advanced' | 'all'
export type Cost = 'free' | 'paid' | 'unknown'

export interface IndexedSpot {
  name: string
  slug: string
  country: Country
  region: string
  city: string
  lat: number
  lng: number
  kind: Kind
  features: string[]
  surface: Surface
  disciplines: string[]   // who rides it: skateboard, roller, inline, scooter, bmx, mtb
  indoor: boolean
  lit: boolean | null
  cost: Cost
  skill: Skill
  why: string
  heads_up: string
  source: string
  confidence: 'high' | 'medium'
  osm?: string            // the matching OpenStreetMap feature, when there is one
}

export const SPOTS: IndexedSpot[] = (raw as unknown as IndexedSpot[]).filter(s => KIND_META[s.kind])

export const COUNTRY_LABEL: Record<Country, string> = { US: 'United States', CA: 'Canada', MX: 'Mexico' }

export function traitsOf(spot: Pick<IndexedSpot, 'indoor' | 'lit' | 'surface'>): SpotTraits {
  return { indoor: spot.indoor, lit: spot.lit, surface: spot.indoor ? 'hard' : spot.surface }
}

// Broad regions a rider thinks in, grouped from states/provinces
export const TRAVEL_REGIONS: { id: string; label: string; regions: string[] }[] = [
  { id: 'pnw', label: 'Pacific Northwest', regions: ['Washington', 'Oregon', 'Idaho'] },
  { id: 'california', label: 'California', regions: ['California'] },
  { id: 'mountain-west', label: 'Mountain West', regions: ['Colorado', 'Utah', 'Wyoming', 'Montana', 'Nevada'] },
  { id: 'southwest', label: 'Southwest', regions: ['Arizona', 'New Mexico'] },
  { id: 'texas-gulf', label: 'Texas & Gulf', regions: ['Texas', 'Louisiana', 'Alabama', 'Mississippi', 'Oklahoma'] },
  { id: 'southeast', label: 'Southeast', regions: ['Florida', 'Georgia', 'North Carolina', 'South Carolina', 'Tennessee', 'Kentucky', 'Virginia', 'West Virginia', 'Arkansas'] },
  { id: 'northeast', label: 'Northeast & Mid-Atlantic', regions: ['New York', 'New Jersey', 'Massachusetts', 'New Hampshire', 'Vermont', 'Maine', 'Connecticut', 'Rhode Island', 'Pennsylvania', 'Maryland', 'Delaware', 'District of Columbia'] },
  { id: 'great-lakes', label: 'Great Lakes & Midwest', regions: ['Michigan', 'Wisconsin', 'Minnesota', 'Illinois', 'Indiana', 'Ohio', 'Missouri', 'Iowa', 'South Dakota', 'North Dakota', 'Nebraska', 'Kansas'] },
  { id: 'alaska-hawaii', label: 'Alaska & Hawaii', regions: ['Alaska', 'Hawaii'] },
  { id: 'western-canada', label: 'Western Canada', regions: ['British Columbia', 'Alberta', 'Saskatchewan', 'Manitoba', 'Yukon', 'Northwest Territories', 'Nunavut'] },
  { id: 'eastern-canada', label: 'Ontario, Quebec & Atlantic', regions: ['Ontario', 'Quebec', 'New Brunswick', 'Nova Scotia', 'Prince Edward Island', 'Newfoundland and Labrador'] },
  { id: 'mexico', label: 'Mexico', regions: [] }, // matched by country
]

export function travelRegionOf(spot: Pick<IndexedSpot, 'country' | 'region'>): string | null {
  if (spot.country === 'MX') return 'mexico'
  const hit = TRAVEL_REGIONS.find(t => t.regions.includes(spot.region))
  return hit?.id ?? null
}

export function spotBySlug(slug: string): IndexedSpot | undefined {
  return SPOTS.find(s => s.slug === slug)
}

// OSM parks that are already a featured spot: the "every mapped spot" lists leave these out, since the
// featured list above them shows the same place. A park counts when a featured spot links to it, or sits on
// it (within ~60 m: many researched spots took their coordinates from OSM without the name matching).
const FEATURED_OSM = new Set(SPOTS.map(s => s.osm).filter((id): id is string => !!id))
export function isFeaturedPark(p: { id: string; lat: number; lng: number }): boolean {
  if (FEATURED_OSM.has(p.id)) return true
  return SPOTS.some(s => Math.abs(s.lat - p.lat) < 0.0006 && Math.abs(s.lng - p.lng) < 0.0008)
}

export function spotsNear(lat: number, lng: number, radiusKm: number, exclude?: string): (IndexedSpot & { distanceKm: number })[] {
  return SPOTS
    .filter(s => s.slug !== exclude)
    .map(s => ({ ...s, distanceKm: haversineKm(lat, lng, s.lat, s.lng) }))
    .filter(s => s.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

// ── Browse filters ───────────────────────────────────────────────────

export interface SpotFilters {
  group?: 'skate' | 'bike' | null
  kind?: Kind | null
  country?: Country | null
  travelRegion?: string | null
  style?: Style | null
  skill?: Skill | null
  ride?: string | null      // discipline id
  indoor?: boolean
}

export function filterSpots(f: SpotFilters): IndexedSpot[] {
  const groupKinds = f.group ? KIND_GROUPS.find(g => g.id === f.group)?.kinds ?? null : null
  return SPOTS.filter(s =>
    (!groupKinds || groupKinds.includes(s.kind)) &&
    (!f.kind || s.kind === f.kind) &&
    (!f.country || s.country === f.country) &&
    (!f.travelRegion || travelRegionOf(s) === f.travelRegion) &&
    (!f.style || styleFit(s.features, s.kind, f.style)) &&
    (!f.skill || f.skill === 'all' || s.skill === 'all' || s.skill === f.skill) &&
    (!f.ride || s.disciplines.includes(f.ride)) &&
    (!f.indoor || s.indoor)
  ).sort((a, b) => a.name.localeCompare(b.name))
}

// ── The finder ───────────────────────────────────────────────────────
// A few answers in, a ranked shortlist out, with the reasons spelled out.

export interface FinderAnswers {
  ride?: string | null                     // discipline id
  style?: Style | null
  skill?: Exclude<Skill, 'all'> | null
  travelRegion?: string | null
  near?: { lat: number; lng: number; label: string; radiusKm: number } | null
  indoor?: boolean
}

export interface FinderMatch {
  spot: IndexedSpot
  score: number
  reasons: string[]
  distanceKm: number | null
}

export function findSpots(a: FinderAnswers, limit = 12): FinderMatch[] {
  const matches: FinderMatch[] = []
  for (const spot of SPOTS) {
    if (a.ride && !spot.disciplines.includes(a.ride)) continue
    if (a.indoor && !spot.indoor) continue
    let score = 10
    const reasons: string[] = [`${KIND_META[spot.kind].label} · ${spot.city}`]

    if (a.style && a.style !== 'any') {
      if (styleFit(spot.features, spot.kind, a.style)) { score += 6; reasons.push(a.style === 'dirt' ? 'dirt and pump' : a.style === 'tranny' ? 'transition' : 'street') }
      else score -= 6
    }

    if (a.skill) {
      if (spot.skill === 'all' || spot.skill === a.skill) { score += 3; reasons.push(spot.skill === 'all' ? 'suits every level' : `suits ${a.skill}s`) }
      else if (a.skill === 'beginner' && spot.skill === 'advanced') score -= 6
      else if (a.skill === 'advanced' && spot.skill === 'beginner') score -= 2
    }

    let distanceKm: number | null = null
    if (a.near) {
      distanceKm = haversineKm(a.near.lat, a.near.lng, spot.lat, spot.lng)
      if (distanceKm <= a.near.radiusKm) { score += 8 - Math.min(6, distanceKm / (a.near.radiusKm / 6)); reasons.push(`${Math.round(distanceKm)} km from ${a.near.label}`) }
      else if (distanceKm <= a.near.radiusKm * 2) { score += 1; reasons.push(`${Math.round(distanceKm)} km — a longer haul`) }
      else score -= 8
    } else if (a.travelRegion) {
      if (travelRegionOf(spot) === a.travelRegion) { score += 5; reasons.push(TRAVEL_REGIONS.find(t => t.id === a.travelRegion)?.label ?? '') }
      else score -= 4
    }

    if (spot.indoor) reasons.push('indoor')
    if (spot.confidence === 'high') score += 1
    matches.push({ spot, score, reasons: reasons.filter(Boolean), distanceKm })
  }

  return matches
    .sort((x, y) => y.score - x.score || (x.distanceKm ?? 0) - (y.distanceKm ?? 0) || x.spot.name.localeCompare(y.spot.name))
    .slice(0, limit)
}

export const NA_COUNTRIES = new Set<string>(['US', 'CA', 'MX'])
export function isNorthAmerica(countryCode: string | null | undefined): boolean {
  return !!countryCode && NA_COUNTRIES.has(countryCode.toUpperCase())
}
