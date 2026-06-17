import { createClient } from '@/lib/supabase/server'
import ExploreView from '@/components/ExploreView'
import { getRegion } from '@/lib/regions'
import { NA_COUNTRIES } from '@/lib/country-names'
import type { TripWithAnchor } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Rough country detection from GPS — good enough for seed data badge display
function getCountryCode(lat: number, lng: number): string | null {
  if (lat >= 24 && lat <= 49.5 && lng >= -125 && lng <= -66) return 'US'
  if (lat > 49.5 && lat <= 83 && lng >= -141 && lng <= -52) return 'CA'
  // Also catch Alaska
  if (lat >= 54 && lat <= 71 && lng >= -168 && lng <= -141) return 'US'
  if (lat >= 14 && lat <= 33 && lng >= -118 && lng <= -86) return 'MX'
  if (lat >= 14 && lat <= 21 && lng >= -92 && lng <= -83) return 'GT'
  if (lat >= 8 && lat <= 18 && lng >= -92 && lng <= -83) return 'HN'
  if (lat >= 8 && lat <= 15 && lng >= -88 && lng <= -82) return 'CR'
  if (lat >= 8 && lat <= 11 && lng >= -83 && lng <= -77) return 'PA'
  return null
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawTrips } = await supabase
    .from('trips')
    .select('*, profiles(*), trip_photos(lat, lng, storage_path, sequence_order)')
    .eq('is_public', true)
    .order('upvotes_count', { ascending: false })
    .order('created_at', { ascending: false })

  let upvotedIds: string[] = []
  if (user) {
    const { data } = await supabase.from('upvotes').select('trip_id').eq('user_id', user.id)
    upvotedIds = data?.map(u => u.trip_id) ?? []
  }

  const trips: TripWithAnchor[] = (rawTrips ?? []).map(t => {
    const photos = [...(t.trip_photos ?? [])].sort(
      (a: { sequence_order: number }, b: { sequence_order: number }) => a.sequence_order - b.sequence_order
    )
    const anchor = photos.find((p: { lat: number | null; lng: number | null }) => p.lat !== null && p.lng !== null)
    const allPhotos = photos
      .filter((p: { lat: number | null; lng: number | null }) => p.lat !== null && p.lng !== null)
      .map((p: { lat: number; lng: number; storage_path: string }) => ({
        lat: p.lat, lng: p.lng, storage_path: p.storage_path,
      }))

    const region = anchor ? getRegion(anchor.lat, anchor.lng) : null
    const countryCode = anchor ? (t.country_code ?? getCountryCode(anchor.lat, anchor.lng)) : null

    return {
      ...t,
      trip_photos: photos.slice(0, 1),
      anchorLat: anchor?.lat ?? null,
      anchorLng: anchor?.lng ?? null,
      region,
      countryCode,
      allPhotos,
    }
  })

  return (
    <ExploreView
      trips={trips}
      currentUserId={user?.id ?? null}
      upvotedIds={upvotedIds}
    />
  )
}
