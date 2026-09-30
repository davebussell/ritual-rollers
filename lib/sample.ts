// Sample (seeded) content detection.
// scripts/seed.mjs uploads photos to `seed/<tripId>/<n>.jpg`; scripts/seed.ts stores
// picsum.photos/seed/... URLs. Real uploads live under `<userId>/<tripId>/...`.

export function isSamplePath(path: string | null | undefined): boolean {
  if (!path) return false
  return path.startsWith('seed/') || path.includes('picsum.photos/seed/')
}

export function isSampleTrip(trip: { trip_photos?: Array<{ storage_path: string }> | null }): boolean {
  return (trip.trip_photos ?? []).some(p => isSamplePath(p.storage_path))
}

export const SAMPLE_NOTICE =
  'Listings marked Sample show how the feed works. They are not real people or real trips.'
