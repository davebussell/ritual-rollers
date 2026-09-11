'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, Navigation, Camera, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PageContainer from '@/components/PageContainer'
import RideMap from '@/components/RideMap'
import {
  CATEGORY_META,
  geocodeZip,
  fetchConditions,
  fetchLocalSpots,
  rideVerdicts,
  haversineKm,
  type SportCategory,
  type GeoPoint,
  type LocalSpot,
  type Conditions,
} from '@/lib/local-sports'

const RADIUS_KM = 50
const STORY_RADIUS_KM = 400
const CATEGORY_ORDER: SportCategory[] = ['wind', 'water', 'mountain', 'river']

interface StoryRow {
  id: string
  title: string
  upvotes_count: number
  country_code: string | null
  created_at: string
  profiles: { username: string | null; avatar_url: string | null } | null
  trip_photos: { storage_path: string; lat: number | null; lng: number | null; sequence_order: number | null }[] | null
}

interface StoryTrip {
  id: string
  title: string
  upvotes: number
  username: string | null
  cover: string | null
  distanceKm: number | null
  farAfield: boolean
}

function coverUrl(path: string | undefined): string | null {
  if (!path) return null
  if (path.startsWith('https://')) return path
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${path}`
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-zinc-900 ${className}`} />
}

export default function RideFinder({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [point, setPoint] = useState<GeoPoint | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const [conditions, setConditions] = useState<Conditions | null>(null)
  const [condLoading, setCondLoading] = useState(false)
  const [condFailed, setCondFailed] = useState(false)

  const [spots, setSpots] = useState<LocalSpot[]>([])
  const [spotsLoading, setSpotsLoading] = useState(false)
  const [spotsFailed, setSpotsFailed] = useState(false)

  const [stories, setStories] = useState<StoryTrip[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)

  const [activeCategory, setActiveCategory] = useState<SportCategory | 'all'>('all')
  const searchSeq = useRef(0)

  const fetchStories = useCallback(async (p: GeoPoint): Promise<StoryTrip[]> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('trips')
      .select('id,title,upvotes_count,country_code,created_at,profiles!trips_owner_id_fkey(username,avatar_url),trip_photos!trip_photos_trip_id_fkey(storage_path,lat,lng,sequence_order)')
      .eq('is_public', true)
      .order('upvotes_count', { ascending: false })
      .limit(40)
    if (error || !data) return []

    const rows = data as unknown as StoryRow[]
    const enriched = rows.map(row => {
      const photos = [...(row.trip_photos ?? [])].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
      const anchor = photos.find(ph => ph.lat != null && ph.lng != null)
      const distanceKm = anchor ? haversineKm(p.lat, p.lng, anchor.lat as number, anchor.lng as number) : null
      return {
        id: row.id,
        title: row.title,
        upvotes: row.upvotes_count,
        username: row.profiles?.username ?? null,
        cover: coverUrl(photos[0]?.storage_path),
        distanceKm,
        farAfield: false,
      }
    })

    const nearby = enriched
      .filter(t => t.distanceKm != null && t.distanceKm <= STORY_RADIUS_KM)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    if (nearby.length > 0) return nearby
    return enriched.slice(0, 3).map(t => ({ ...t, farAfield: true }))
  }, [])

  const search = useCallback(async (raw: string) => {
    const q = raw.trim()
    if (!q) return
    const seq = ++searchSeq.current
    setGeoError(null)
    setLocating(true)

    let p: GeoPoint | null = null
    try {
      p = await geocodeZip(q)
    } catch {
      p = null
    }
    if (seq !== searchSeq.current) return
    setLocating(false)

    if (!p) {
      setGeoError("Can't find that one — try a US zip or Canadian postal code")
      return
    }

    setPoint(p)
    setActiveCategory('all')
    router.replace('/ride?q=' + encodeURIComponent(q))

    setCondLoading(true); setCondFailed(false)
    setSpotsLoading(true); setSpotsFailed(false)
    setStoriesLoading(true)

    fetchConditions(p.lat, p.lng)
      .then(c => { if (seq === searchSeq.current) { setConditions(c); setCondFailed(!c) } })
      .catch(() => { if (seq === searchSeq.current) { setConditions(null); setCondFailed(true) } })
      .finally(() => { if (seq === searchSeq.current) setCondLoading(false) })

    fetchLocalSpots(p.lat, p.lng, RADIUS_KM)
      .then(s => { if (seq === searchSeq.current) setSpots(s) })
      .catch(() => { if (seq === searchSeq.current) { setSpots([]); setSpotsFailed(true) } })
      .finally(() => { if (seq === searchSeq.current) setSpotsLoading(false) })

    fetchStories(p)
      .then(s => { if (seq === searchSeq.current) setStories(s) })
      .catch(() => { if (seq === searchSeq.current) setStories([]) })
      .finally(() => { if (seq === searchSeq.current) setStoriesLoading(false) })
  }, [router, fetchStories])

  useEffect(() => {
    if (initialQuery) search(initialQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const verdicts = conditions ? rideVerdicts(conditions) : []
  const searched = point !== null
  const visibleCategories = activeCategory === 'all'
    ? CATEGORY_ORDER.filter(cat => spots.some(s => s.category === cat))
    : [activeCategory]

  return (
    <PageContainer>
      {/* 1. Header + search */}
      <div className="mb-8">
        <p className="font-expedition text-[10px] tracking-widest text-orange-500 uppercase">Find your ride</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">What&apos;s rideable near you?</h1>
        <form
          className="mt-5 flex gap-2"
          onSubmit={e => { e.preventDefault(); search(query) }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ZIP or postal code — 92109, M5V…"
            className="font-expedition w-full max-w-xs rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-orange-500 transition-colors"
          />
          <button
            type="submit"
            disabled={locating}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-60">
            <Compass className={`h-4 w-4 ${locating ? 'animate-spin' : ''}`} />
            Scout it
          </button>
        </form>
        {geoError && <p className="mt-3 text-sm text-red-400">{geoError}</p>}
        {point && <p className="mt-3 text-sm text-zinc-400">📍 {point.label}</p>}
      </div>

      {/* 6. Idle state */}
      {!searched && !locating && (
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-zinc-400 leading-relaxed">
            Punch in your zip. We&apos;ll scout the wind, water, mountains and rivers within {RADIUS_KM} km —
            live conditions, real spots, and the crews who&apos;ve already ridden them.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 text-left">
            {CATEGORY_ORDER.map(cat => {
              const meta = CATEGORY_META[cat]
              return (
                <div key={cat} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="text-2xl">{meta.emoji}</div>
                  <div className="mt-2 font-display font-bold text-white" style={{ color: meta.color }}>{meta.label}</div>
                  <ul className="mt-2 space-y-0.5">
                    {meta.sports.map(s => (
                      <li key={s} className="text-xs text-zinc-500">{s}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {locating && !searched && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {searched && (
        <div className="space-y-10">
          {/* 2. Live conditions */}
          <section>
            {condLoading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : conditions ? (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-expedition text-[10px] tracking-widest text-zinc-500 uppercase">Wind</span>
                      <Navigation
                        className="h-4 w-4 text-cyan-400"
                        style={{ transform: `rotate(${conditions.windDirDeg}deg)` }}
                      />
                    </div>
                    <div className="mt-2 font-display text-2xl font-bold text-white">{Math.round(conditions.windKph)} km/h</div>
                    <div className="text-xs text-zinc-500">gusts {Math.round(conditions.windGustKph)} km/h</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <span className="font-expedition text-[10px] tracking-widest text-zinc-500 uppercase">Waves</span>
                    <div className="mt-2 font-display text-2xl font-bold text-white">
                      {conditions.waveHeightM != null ? `${conditions.waveHeightM.toFixed(1)}m` : '—'}
                    </div>
                    <div className="text-xs text-zinc-500">{conditions.waveHeightM != null ? 'swell height' : 'inland'}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <span className="font-expedition text-[10px] tracking-widest text-zinc-500 uppercase">Snow base</span>
                    <div className="mt-2 font-display text-2xl font-bold text-white">
                      {conditions.snowDepthCm != null ? `${Math.round(conditions.snowDepthCm)}cm` : '—'}
                    </div>
                    <div className="text-xs text-zinc-500">{conditions.snowDepthCm != null ? 'on the ground' : 'no snow data'}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <span className="font-expedition text-[10px] tracking-widest text-zinc-500 uppercase">Air</span>
                    <div className="mt-2 font-display text-2xl font-bold text-white">{Math.round(conditions.tempC)}°C</div>
                    <div className="text-xs text-zinc-500">{conditions.precipMm} mm precip</div>
                  </div>
                </div>
                <p className="mt-2 font-expedition text-[9px] tracking-widest text-zinc-600 uppercase">Live · Open-Meteo</p>
              </>
            ) : condFailed ? (
              <p className="text-sm text-zinc-500">Conditions feed is quiet right now — the spots below still stand.</p>
            ) : null}
          </section>

          {/* 3. Verdicts */}
          {verdicts.length > 0 && (
            <section className="flex flex-wrap gap-2">
              {verdicts.map(v => {
                const meta = CATEGORY_META[v.category]
                const active = activeCategory === v.category
                return (
                  <button
                    key={v.category}
                    onClick={() => setActiveCategory(active ? 'all' : v.category)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all active:scale-95 ${
                      active ? 'border-orange-500 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'
                    }`}>
                    <span>{meta.emoji}</span>
                    <span className="text-sm font-semibold text-white">{meta.label}</span>
                    {v.status === 'firing' && (
                      <span className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[9px] font-bold text-white tracking-widest">FIRING</span>
                    )}
                    {v.status === 'rideable' && (
                      <span className="rounded-full border border-emerald-500/50 px-2 py-0.5 text-[9px] font-bold text-emerald-400 tracking-widest">RIDEABLE</span>
                    )}
                    {v.status === 'quiet' && (
                      <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[9px] font-bold text-zinc-500 tracking-widest">QUIET</span>
                    )}
                    <span className="text-xs text-zinc-500">{v.line}</span>
                  </button>
                )
              })}
            </section>
          )}

          {/* 4. Spots + map */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              {spotsLoading ? (
                <>
                  <Skeleton className="h-40" />
                  <Skeleton className="h-40" />
                </>
              ) : spots.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                  <p className="text-sm text-zinc-400">
                    {spotsFailed
                      ? 'The spot scout timed out — give it another go in a minute.'
                      : <>OSM has no tagged spots in {RADIUS_KM} km — pioneers welcome.{' '}
                        <Link href="/trips/new" className="text-orange-400 hover:text-orange-300 font-semibold">Upload the first story.</Link></>}
                  </p>
                </div>
              ) : (
                visibleCategories.map(cat => {
                  const meta = CATEGORY_META[cat]
                  const catSpots = spots.filter(s => s.category === cat)
                  if (catSpots.length === 0) {
                    return (
                      <div key={cat} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                        <p className="text-sm text-zinc-500">{meta.emoji} No {meta.label.toLowerCase()} spots tagged within {RADIUS_KM} km.</p>
                      </div>
                    )
                  }
                  const shown = catSpots.slice(0, 6)
                  const overflow = catSpots.length - shown.length
                  return (
                    <div key={cat}>
                      <h3 className="flex items-center gap-2 font-display font-bold text-white">
                        <span>{meta.emoji}</span> {meta.label}
                        <span className="font-expedition text-[9px] tracking-widest text-zinc-600 uppercase">{catSpots.length} spot{catSpots.length !== 1 ? 's' : ''}</span>
                      </h3>
                      <ul className="mt-2 divide-y divide-zinc-800/60 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                        {shown.map(s => (
                          <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-white">{s.name}</div>
                              <div className="text-xs text-zinc-500">{s.sport}</div>
                            </div>
                            <span className="shrink-0 text-xs text-zinc-500">{s.distanceKm.toFixed(1)} km</span>
                          </li>
                        ))}
                      </ul>
                      {overflow > 0 && (
                        <p className="mt-1.5 text-xs text-zinc-600">+{overflow} more on the map</p>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            <div className="lg:sticky lg:top-20 h-[420px] overflow-hidden rounded-2xl border border-zinc-800">
              <RideMap center={{ lat: point.lat, lng: point.lng }} spots={spots} activeCategory={activeCategory} />
            </div>
          </section>

          {/* 5. Epic stories */}
          <section>
            <h2 className="font-display text-xl font-bold text-white">
              Epic stories near <span className="text-orange-400">{point.label.toUpperCase()}</span>
            </h2>
            {storiesLoading ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map(i => <Skeleton key={i} className="h-48" />)}
              </div>
            ) : stories.length === 0 ? (
              <Link
                href="/trips/new"
                className="mt-4 block rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center transition-colors hover:border-orange-500/50">
                <Camera className="mx-auto h-8 w-8 text-zinc-600" />
                <p className="mt-3 font-semibold text-white">No stories here yet — be the first to roll it</p>
                <p className="mt-1 text-xs text-zinc-500">Upload a trip and claim the spot</p>
              </Link>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {stories.map(t => (
                  <Link
                    key={t.id}
                    href={`/trips/${t.id}`}
                    className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition-all hover:border-zinc-600 hover:shadow-xl hover:shadow-black/40">
                    <div className="relative aspect-video overflow-hidden bg-zinc-800">
                      {t.cover
                        ? <img src={t.cover} alt={t.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        : <div className="flex h-full w-full items-center justify-center text-zinc-700"><Camera className="h-8 w-8" /></div>}
                      {t.farAfield && (
                        <span className="absolute left-2 top-2 rounded-full bg-zinc-950/80 px-2 py-0.5 font-expedition text-[9px] tracking-widest text-amber-400 uppercase backdrop-blur">
                          From the wider world
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="line-clamp-2 text-sm font-bold text-white group-hover:text-orange-50 transition-colors">{t.title}</h3>
                      <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500">
                        <span>@{t.username ?? 'roller'}</span>
                        <span className="flex items-center gap-1">
                          <ChevronUp className="h-3 w-3" /> {t.upvotes}
                        </span>
                      </div>
                      {!t.farAfield && t.distanceKm != null && (
                        <p className="mt-1 text-xs text-zinc-600">{Math.round(t.distanceKm)} km away</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </PageContainer>
  )
}
