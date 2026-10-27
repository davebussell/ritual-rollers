// Every wheels spot OpenStreetMap knows about in Canada, the US and Mexico: skateparks, pump
// tracks, BMX tracks and bike parks. Refreshed by .github/workflows/skateparks.yml into
// data/parks.json. Server-side: it's a few hundred kilobytes, so pages send only what's nearby.
// Data © OpenStreetMap contributors (ODbL).

import raw from '@/data/parks.json'
import { haversineKm } from '@/lib/geo'
import type { Surface } from '@/lib/sports'

export type ParkKind = 'skate' | 'pump' | 'bmx' | 'bike'

export interface OsmPark {
  id: string            // n123 / w123 / r123
  name: string | null
  lat: number
  lng: number
  cc: 'CA' | 'US' | 'MX'
  kind: ParkKind
  sports?: string[]
  lit?: boolean
  indoor?: boolean
  fee?: boolean
  surface?: string
  hours?: string
  web?: string
  city?: string
  region?: string
}

export interface NearPark extends OsmPark { distanceKm: number }

const data = raw as unknown as { fetched: string; count: number; parks: OsmPark[] }
export const PARKS: OsmPark[] = data.parks
export const PARKS_FETCHED = data.fetched

export const PARK_KIND_META: Record<ParkKind, { label: string; plural: string; color: string }> = {
  skate: { label: 'Skatepark', plural: 'Skateparks', color: '#2D68B0' },
  pump: { label: 'Pump track', plural: 'Pump tracks', color: '#B98500' },
  bmx: { label: 'BMX track', plural: 'BMX tracks', color: '#C2571A' },
  bike: { label: 'Bike park', plural: 'Bike parks', color: '#3E7D3A' },
}

export function parkName(p: Pick<OsmPark, 'name' | 'kind'>): string {
  return p.name ?? PARK_KIND_META[p.kind].label
}

const DIRT = new Set(['dirt', 'ground', 'earth', 'gravel', 'fine_gravel', 'compacted', 'grass', 'mud', 'sand', 'unpaved', 'clay'])
const HARD = new Set(['concrete', 'asphalt', 'paved', 'concrete:plates', 'paving_stones', 'metal', 'tartan', 'acrylic'])

export function surfaceOfPark(p: Pick<OsmPark, 'surface' | 'kind'>): Surface {
  const s = (p.surface ?? '').toLowerCase()
  if (s === 'wood') return 'wood'
  if (DIRT.has(s)) return 'dirt'
  if (HARD.has(s)) return 'hard'
  return p.kind === 'bmx' || p.kind === 'bike' ? 'dirt' : 'hard'
}

export function parkById(id: string): OsmPark | undefined {
  return PARKS.find(p => p.id === id)
}

export function parksNear(lat: number, lng: number, radiusKm: number, limit = 60): NearPark[] {
  // cheap box first, then the real distance
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  const out: NearPark[] = []
  for (const p of PARKS) {
    if (Math.abs(p.lat - lat) > dLat || Math.abs(p.lng - lng) > dLng) continue
    const distanceKm = haversineKm(lat, lng, p.lat, p.lng)
    if (distanceKm <= radiusKm) out.push({ ...p, distanceKm })
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit)
}

export function osmUrl(id: string): string {
  const type = id[0] === 'n' ? 'node' : id[0] === 'w' ? 'way' : 'relation'
  return `https://www.openstreetmap.org/${type}/${id.slice(1)}`
}

export function parkCounts(): Record<ParkKind, number> & { total: number } {
  const c = { skate: 0, pump: 0, bmx: 0, bike: 0, total: PARKS.length }
  for (const p of PARKS) c[p.kind] += 1
  return c
}
