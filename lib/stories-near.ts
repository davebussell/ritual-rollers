// Logged rides near a point — shared by the scout page and the indexed spot page.
// Server-only (uses the server Supabase client).

import { createClient } from '@/lib/supabase/server'
import { haversineKm, type GeoPoint } from '@/lib/local-sports'
import { isSampleTrip } from '@/lib/sample'
import type { StoryCard } from '@/components/SpotReport'

const STORY_RADIUS_KM = 400

export async function fetchStoriesNear(point: GeoPoint, limit = 6): Promise<StoryCard[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('trips')
    .select('id,title,upvotes_count,profiles!trips_owner_id_fkey(username),trip_photos!trip_photos_trip_id_fkey(storage_path,lat,lng,sequence_order)')
    .eq('is_public', true)
    .order('upvotes_count', { ascending: false })
    .limit(60)

  type Row = {
    id: string; title: string; upvotes_count: number
    profiles: { username: string | null } | null
    trip_photos: { storage_path: string; lat: number | null; lng: number | null; sequence_order: number | null }[] | null
  }
  const rows = ((data ?? []) as unknown) as Row[]
  return rows
    .map(row => {
      const photos = [...(row.trip_photos ?? [])].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
      const anchor = photos.find(p => p.lat != null && p.lng != null)
      const cover = photos[0]?.storage_path
      return {
        id: row.id,
        title: row.title,
        upvotes: row.upvotes_count,
        username: row.profiles?.username ?? null,
        cover: cover ? (cover.startsWith('https://') ? cover : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${cover}`) : null,
        distanceKm: anchor ? haversineKm(point.lat, point.lng, anchor.lat as number, anchor.lng as number) : null,
        sample: isSampleTrip({ trip_photos: photos }),
      }
    })
    .filter(c => c.distanceKm != null && c.distanceKm <= STORY_RADIUS_KM)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    .slice(0, limit)
}
