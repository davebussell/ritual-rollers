// The handful of spots on the home strip: a spread of famous concrete, a DIY, an indoor park and
// the dirt side, across all three countries. Picked from the index by name so the list survives
// a data refresh; anything missing is filled from high-confidence spots in other regions.

import { SPOTS, travelRegionOf, type IndexedSpot } from '@/lib/spots-index'

const WANTED = [
  'Burnside', 'Venice Beach', 'FDR', 'Lynch Family', 'Le Taz', 'Kona', 'Coler', 'Mexico City',
  'Vancouver', 'Lowry', 'Pump Track',
]

export function featuredSpots(n = 8): IndexedSpot[] {
  const out: IndexedSpot[] = []
  const used = new Set<string>()
  for (const w of WANTED) {
    if (out.length >= n) break
    const hit = SPOTS.find(s => !used.has(s.slug) && (s.name.includes(w) || s.city.includes(w)) && s.confidence === 'high')
      ?? SPOTS.find(s => !used.has(s.slug) && (s.name.includes(w) || s.city.includes(w)))
    if (hit) { out.push(hit); used.add(hit.slug) }
  }
  const regions = new Set(out.map(travelRegionOf))
  for (const s of SPOTS) {
    if (out.length >= n) break
    if (used.has(s.slug) || s.confidence !== 'high' || regions.has(travelRegionOf(s))) continue
    out.push(s); used.add(s.slug); regions.add(travelRegionOf(s))
  }
  return out.slice(0, n)
}
