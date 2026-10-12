import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ScoutSearch from '@/components/ScoutSearch'
import SpotReport, { type StoryCard } from '@/components/SpotReport'
import { featuredBySlug } from '@/lib/featured-spots'
import { fromSlug, geocodePlace, haversineKm, type GeoPoint } from '@/lib/local-sports'
import { fetchSpotForecast } from '@/lib/forecast'
import { allVerdicts, type Status } from '@/lib/sports'
import { isSampleTrip } from '@/lib/sample'

export const dynamic = 'force-dynamic'

const STORY_RADIUS_KM = 400
const STATUS_RANK: Record<Status, number> = { firing: 2, rideable: 1, quiet: 0 }

async function resolvePlace(slug: string): Promise<GeoPoint | null> {
  const featured = featuredBySlug(slug)
  if (featured) {
    return { lat: featured.lat, lng: featured.lng, label: `${featured.name}, ${featured.region}`, countryCode: featured.countryCode }
  }
  return geocodePlace(fromSlug(slug))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const point = await resolvePlace(slug)
  if (!point) return { title: 'Spot not found — Ritual Rollers' }
  const forecast = await fetchSpotForecast(point.lat, point.lng)
  let description = `Live conditions, what's rideable, best windows this week and what to pack for ${point.label}.`
  if (forecast) {
    const top = [...allVerdicts(forecast.current)]
      .sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || b.score - a.score)
      .filter(v => v.status !== 'quiet')
      .slice(0, 2)
    const bits = top.map(v => `${v.sport.label} ${v.status.toUpperCase()} · ${v.line}`)
    const sea = forecast.current.sstC != null ? ` Sea ${forecast.current.sstC.toFixed(1)} °C.` : ''
    if (bits.length) {
      const full = `${bits.join(' / ')}.${sea} Full 7-day spot report on Ritual Rollers.`
      description = full.length <= 160 ? full : full.slice(0, 157).replace(/\s+\S*$/, '') + '…'
    }
  }
  const title = `${point.label} — Spot Report · Ritual Rollers`
  return {
    title,
    description,
    alternates: { canonical: `/scout/${slug}` },
    openGraph: { title, description, url: `https://ritualrollers.com/scout/${slug}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

async function fetchStories(point: GeoPoint): Promise<StoryCard[]> {
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
  const cards = rows.map(row => {
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
  return cards
    .filter(c => c.distanceKm != null && c.distanceKm <= STORY_RADIUS_KM)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    .slice(0, 6)
}

export default async function SpotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const point = await resolvePlace(slug)

  if (!point) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="font-expedition text-[10px] uppercase tracking-[0.3em] text-orange-500">Spot report</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-white">Can&apos;t place &ldquo;{fromSlug(slug)}&rdquo;</h1>
        <p className="mt-3 text-zinc-400">Try the town name with its country, a US zip, or a Canadian postal code.</p>
        <div className="mt-6 flex justify-center"><ScoutSearch size="hero" initial={fromSlug(slug)} autoFocus /></div>
      </div>
    )
  }

  const [forecast, stories] = await Promise.all([
    fetchSpotForecast(point.lat, point.lng),
    fetchStories(point),
  ])

  return <SpotReport slug={slug} point={point} forecast={forecast} stories={stories} />
}
