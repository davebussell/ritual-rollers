import { createClient } from '@/lib/supabase/server'
import HomeScout, { type StripItem, type Teaser } from '@/components/HomeScout'
import { FEATURED_SPOTS } from '@/lib/featured-spots'
import { fetchCurrentSnapshot } from '@/lib/forecast'
import { allVerdicts, type Status } from '@/lib/sports'
import { isSampleTrip } from '@/lib/sample'

export const dynamic = 'force-dynamic'

const STORAGE = (path: string) =>
  path.startsWith('https://') ? path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${path}`

const STATUS_RANK: Record<Status, number> = { firing: 2, rideable: 1, quiet: 0 }

export default async function HomePage() {
  const supabase = await createClient()

  const [snapshots, { data: rawTrips }] = await Promise.all([
    Promise.all(FEATURED_SPOTS.map(s => fetchCurrentSnapshot(s.lat, s.lng))),
    supabase
      .from('trips')
      .select('id, title, upvotes_count, profiles!trips_owner_id_fkey(username), trip_photos!trip_photos_trip_id_fkey(storage_path, sequence_order)')
      .eq('is_public', true)
      .order('upvotes_count', { ascending: false })
      .limit(8),
  ])

  // Live strip: the single best read at each iconic spot
  const strip: StripItem[] = FEATURED_SPOTS.map((spot, i) => {
    const snap = snapshots[i]
    if (!snap) return { spot, top: null, tempC: null, sstC: null, windKph: null, waveM: null, periodS: null, coastal: false }
    const top = [...allVerdicts(snap)].sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || b.score - a.score)[0]
    return {
      spot, top: top && top.status !== 'quiet' ? top : null,
      tempC: snap.tempC, sstC: snap.sstC, windKph: snap.windKph, waveM: snap.waveM, periodS: snap.periodS, coastal: snap.coastal,
    }
  })

  type Raw = {
    id: string; title: string; upvotes_count: number
    profiles: { username: string } | null
    trip_photos: Array<{ storage_path: string; sequence_order: number }>
  }
  const teasers: Teaser[] = ((rawTrips ?? []) as unknown as Raw[])
    .filter(t => t.trip_photos.length > 0)
    .slice(0, 3)
    .map(t => ({
      id: t.id,
      title: t.title,
      username: t.profiles?.username ?? 'explorer',
      upvotes: t.upvotes_count,
      sample: isSampleTrip(t),
      cover: STORAGE([...t.trip_photos].sort((a, b) => a.sequence_order - b.sequence_order)[0].storage_path),
    }))

  return <HomeScout strip={strip} teasers={teasers} />
}
