import { createClient } from '@/lib/supabase/server'
import HomeShowcase, { type DemoTrip } from '@/components/HomeShowcase'

export const dynamic = 'force-dynamic'

const STORAGE = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${path}`

export default async function HomePage() {
  const supabase = await createClient()

  const { data: rawTrips } = await supabase
    .from('trips')
    .select('id, title, upvotes_count, profiles!trips_owner_id_fkey(username), trip_photos!trip_photos_trip_id_fkey(id, storage_path, lat, lng, taken_at, caption, sequence_order)')
    .eq('is_public', true)
    .order('upvotes_count', { ascending: false })
    .limit(12)

  type Raw = {
    id: string; title: string; upvotes_count: number
    profiles: { username: string } | null
    trip_photos: Array<{ id: string; storage_path: string; lat: number | null; lng: number | null; taken_at: string | null; caption: string | null; sequence_order: number }>
  }
  const trips = ((rawTrips ?? []) as unknown as Raw[])
    .map(t => ({ ...t, gpsCount: t.trip_photos.filter(p => p.lat != null && p.lng != null).length }))

  // Demo trip: most upvoted with at least 3 GPS photos, else at least 2
  const demo = trips.find(t => t.gpsCount >= 3) ?? trips.find(t => t.gpsCount >= 2) ?? null

  const demoTrip: DemoTrip | null = demo ? {
    id: demo.id,
    title: demo.title,
    username: demo.profiles?.username ?? 'explorer',
    upvotes: demo.upvotes_count,
    photos: [...demo.trip_photos]
      .sort((a, b) => a.sequence_order - b.sequence_order)
      .map(p => ({
        id: p.id,
        url: STORAGE(p.storage_path),
        lat: p.lat,
        lng: p.lng,
        taken_at: p.taken_at,
        caption: p.caption,
        sequence_order: p.sequence_order,
      })),
  } : null

  // Teasers: three other photo-backed trips for the "explore" strip
  const teasers = trips
    .filter(t => t.id !== demo?.id && t.trip_photos.length > 0)
    .slice(0, 3)
    .map(t => ({
      id: t.id,
      title: t.title,
      username: t.profiles?.username ?? 'explorer',
      upvotes: t.upvotes_count,
      cover: STORAGE([...t.trip_photos].sort((a, b) => a.sequence_order - b.sequence_order)[0].storage_path),
    }))

  return <HomeShowcase demoTrip={demoTrip} teasers={teasers} />
}
