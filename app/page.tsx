import { createClient } from '@/lib/supabase/server'
import ExploreView from '@/components/ExploreView'
import { getRegion } from '@/lib/regions'
import type { TripWithAnchor } from '@/lib/types'

export const dynamic = 'force-dynamic'

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
      .map((p: { lat: number; lng: number; storage_path: string }) => ({ lat: p.lat, lng: p.lng, storage_path: p.storage_path }))

    return {
      ...t,
      trip_photos: photos.slice(0, 1), // only first photo needed for cover
      anchorLat: anchor?.lat ?? null,
      anchorLng: anchor?.lng ?? null,
      region: anchor ? getRegion(anchor.lat, anchor.lng) : null,
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
