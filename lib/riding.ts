// Who's riding where: plan counts for an area (real ones, topped up with samples while an area is quiet), filtered to
// the picked wheel by the kind of place.

import { plansInArea, boxAround, type PlacePlans } from '@/lib/plans'
import { samplePlacePlans, withSamples } from '@/lib/sample'
import { spotBySlug } from '@/lib/spots-index'
import { parkById } from '@/lib/parks'
import { haversineKm } from '@/lib/geo'
import { fits, parkFits, type Wheel } from '@/lib/wheels'

export function placeFits(p: Pick<PlacePlans, 'spot_slug' | 'park_id'>, wheel: Wheel | null): boolean {
  if (!wheel) return true
  if (p.spot_slug) { const s = spotBySlug(p.spot_slug); return s ? fits(s.disciplines, wheel) : true }
  if (p.park_id) { const k = parkById(p.park_id); return k ? parkFits(k.kind, wheel) : true }
  return true
}

export interface Riding { places: (PlacePlans & { distanceKm: number })[]; on: boolean }

export async function ridingNear(lat: number, lng: number, km: number, wheel: Wheel | null, meId: string | null, limit = 12): Promise<Riding> {
  const real = await plansInArea(boxAround(lat, lng, km), meId)
  const near = (p: PlacePlans) => ({ ...p, distanceKm: haversineKm(lat, lng, p.lat, p.lng) })
  const ok = (p: PlacePlans & { distanceKm: number }) => p.distanceKm <= km && placeFits(p, wheel)
  const mine = (real ?? []).map(near).filter(ok)
  const samples = samplePlacePlans().map(near).filter(ok).sort((a, b) => a.distanceKm - b.distanceKm)
  return { places: withSamples(mine, samples, 3, limit), on: real !== null }
}

// Everywhere: the busiest places across Canada, the US and Mexico
export async function ridingEverywhere(wheel: Wheel | null, meId: string | null, limit = 24): Promise<Riding> {
  const real = await plansInArea({ minLat: 14, maxLat: 72, minLng: -168, maxLng: -52 }, meId)
  const mine = (real ?? []).filter(p => placeFits(p, wheel)).map(p => ({ ...p, distanceKm: 0 }))
  const samples = samplePlacePlans().filter(p => placeFits(p, wheel)).map(p => ({ ...p, distanceKm: 0 }))
  return { places: withSamples(mine, samples, 6, limit), on: real !== null }
}
