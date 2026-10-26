import { createClient } from '@/lib/supabase/server'
import HomeScout, { type StripItem, type Teaser } from '@/components/HomeScout'
import { featuredSpots } from '@/lib/featured-spots'
import { fetchSkateForecasts } from '@/lib/forecast'
import { traitsOf, SPOTS } from '@/lib/spots-index'
import { nowRead } from '@/lib/report'
import { parkCounts } from '@/lib/parks'
import { isSampleTrip } from '@/lib/sample'
import { getActivity } from '@/lib/activities'

export const dynamic = 'force-dynamic'

const STORAGE = (path: string) =>
  path.startsWith('https://') ? path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${path}`

export default async function HomePage() {
  const supabase = await createClient()
  const featured = featuredSpots(8)

  const [forecasts, { data: rawTrips }] = await Promise.all([
    fetchSkateForecasts(featured.map(s => ({ lat: s.lat, lng: s.lng }))),
    supabase
      .from('trips')
      .select('id, title, upvotes_count, activity_tags, profiles!trips_owner_id_fkey(username), trip_photos!trip_photos_trip_id_fkey(storage_path, sequence_order)')
      .eq('is_public', true)
      .order('upvotes_count', { ascending: false })
      .limit(24),
  ])

  const strip: StripItem[] = featured.map((spot, i) => {
    const now = nowRead(forecasts[i], traitsOf(spot))
    return {
      slug: spot.slug, name: spot.name, city: spot.city, country: spot.country, kind: spot.kind, indoor: spot.indoor,
      ground: now?.ground ?? null, status: now?.read.status ?? null, line: now?.line ?? null, dryAt: now?.dryAt ?? null,
      groundKey: now?.read.ground ?? null, dirt: spot.surface === 'dirt' && !spot.indoor,
    }
  })

  type Raw = {
    id: string; title: string; upvotes_count: number; activity_tags: string[] | null
    profiles: { username: string } | null
    trip_photos: Array<{ storage_path: string; sequence_order: number }>
  }
  const teasers: Teaser[] = ((rawTrips ?? []) as unknown as Raw[])
    .filter(t => t.trip_photos.length > 0)
    // Sample trips from the outdoor-sports days stay out unless they carry a wheels tag
    .filter(t => !isSampleTrip(t) || (t.activity_tags ?? []).some(tag => getActivity(tag)))
    .slice(0, 3)
    .map(t => ({
      id: t.id,
      title: t.title,
      username: t.profiles?.username ?? 'roller',
      upvotes: t.upvotes_count,
      sample: isSampleTrip(t),
      cover: STORAGE([...t.trip_photos].sort((a, b) => a.sequence_order - b.sequence_order)[0].storage_path),
    }))

  return <HomeScout strip={strip} teasers={teasers} featuredCount={SPOTS.length} mapped={parkCounts()} />
}
