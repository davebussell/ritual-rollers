import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CrewSearch from '@/components/CrewSearch'
import RollCallForm from '@/components/RollCallForm'
import FollowButton from '@/components/FollowButton'
import { geocodePlace, haversineKm, toSlug, type GeoPoint } from '@/lib/local-sports'
import { spotBySlug, isNorthAmerica } from '@/lib/spots-index'
import { SPORT_BY_ID, countryFlag } from '@/lib/sports'
import { isSamplePath } from '@/lib/sample'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Find your crew — Ritual Rollers',
  description: 'Riders who\'ve logged rides where you\'re headed, and roll calls for who\'s going when. Never roll a new spot alone.',
  alternates: { canonical: '/crew' },
}

const RADIUS_KM = 400

interface Rider {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  rides: number
  nearest: { title: string; id: string; km: number }
  sports: string[]
  sample: boolean
}

export default async function CrewPage({ searchParams }: { searchParams: Promise<{ q?: string; sport?: string; spot?: string }> }) {
  const { q, sport, spot: spotSlug } = await searchParams
  const sportId = sport && SPORT_BY_ID[sport] ? sport : null

  // Resolve the place: an indexed spot, or any North American place name
  let point: GeoPoint | null = null
  let placeSlug = ''
  if (spotSlug) {
    const s = spotBySlug(spotSlug)
    if (s) { point = { lat: s.lat, lng: s.lng, label: `${s.name}, ${s.region}`, countryCode: s.country }; placeSlug = s.slug }
  } else if (q?.trim()) {
    const g = await geocodePlace(q)
    if (g && isNorthAmerica(g.countryCode)) { point = g; placeSlug = toSlug(q) }
  }

  const supabase = await createClient()
  const { data: { user: rawUser } } = await supabase.auth.getUser()
  const user = (rawUser as (typeof rawUser & { is_anonymous?: boolean }) | null)?.is_anonymous ? null : rawUser

  let riders: Rider[] = []
  let calls: { id: string; owner: string | null; sport: string; starts_on: string; ends_on: string; level: string | null; note: string | null; members: number; place_name: string }[] = []
  let callsAvailable = true

  if (point) {
    const { data } = await supabase
      .from('trips')
      .select('id,title,owner_id,activity_tags,profiles!trips_owner_id_fkey(username,avatar_url,bio),trip_photos!trip_photos_trip_id_fkey(storage_path,lat,lng,sequence_order)')
      .eq('is_public', true)
      .limit(200)
    type Row = {
      id: string; title: string; owner_id: string; activity_tags: string[] | null
      profiles: { username: string; avatar_url: string | null; bio: string | null } | null
      trip_photos: { storage_path: string; lat: number | null; lng: number | null; sequence_order: number | null }[] | null
    }
    const byOwner = new Map<string, Rider>()
    for (const row of ((data ?? []) as unknown) as Row[]) {
      const anchor = [...(row.trip_photos ?? [])].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0)).find(p => p.lat != null && p.lng != null)
      if (!anchor || !row.profiles) continue
      const km = haversineKm(point.lat, point.lng, anchor.lat as number, anchor.lng as number)
      if (km > RADIUS_KM) continue
      if (sportId && !(row.activity_tags ?? []).includes(sportId)) continue
      const sample = (row.trip_photos ?? []).some(p => isSamplePath(p.storage_path))
      const r = byOwner.get(row.owner_id)
      if (r) {
        r.rides += 1
        if (km < r.nearest.km) r.nearest = { title: row.title, id: row.id, km }
        for (const t of row.activity_tags ?? []) if (!r.sports.includes(t)) r.sports.push(t)
      } else {
        byOwner.set(row.owner_id, {
          id: row.owner_id, username: row.profiles.username, avatar_url: row.profiles.avatar_url, bio: row.profiles.bio,
          rides: 1, nearest: { title: row.title, id: row.id, km }, sports: [...(row.activity_tags ?? [])], sample,
        })
      }
    }
    riders = [...byOwner.values()].filter(r => r.id !== user?.id).sort((a, b) => b.rides - a.rides || a.nearest.km - b.nearest.km).slice(0, 24)

    // Roll calls nearby — the table arrives with the phase 2/3 migration; degrade gracefully until then
    const today = new Date().toISOString().slice(0, 10)
    const { data: rows, error } = await supabase
      .from('crew_calls')
      .select('id,sport,starts_on,ends_on,level,note,lat,lng,place_name,profiles!crew_calls_owner_id_fkey(username),crew_call_members(user_id)')
      .gte('ends_on', today)
      .order('starts_on', { ascending: true })
      .limit(100)
    if (error) callsAvailable = false
    else {
      type Call = { id: string; sport: string; starts_on: string; ends_on: string; level: string | null; note: string | null; lat: number; lng: number; place_name: string; profiles: { username: string } | null; crew_call_members: { user_id: string }[] | null }
      calls = (((rows ?? []) as unknown) as Call[])
        .filter(c => haversineKm(point!.lat, point!.lng, c.lat, c.lng) <= RADIUS_KM && (!sportId || c.sport === sportId))
        .map(c => ({ id: c.id, owner: c.profiles?.username ?? null, sport: c.sport, starts_on: c.starts_on, ends_on: c.ends_on, level: c.level, note: c.note, members: c.crew_call_members?.length ?? 0, place_name: c.place_name }))
    }
  }

  let followingIds = new Set<string>()
  if (user && riders.length) {
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    followingIds = new Set((data ?? []).map(f => f.following_id))
  }

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
      <div className="text-center">
        <p className="tag inline-block px-3 py-1 text-[11px] tracking-[0.18em]">Find your crew</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-5xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-6xl">
          Never roll a new spot <span className="text-forest">alone</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-body text-lg text-zinc-500">
          Riders who&apos;ve logged rides where you&apos;re headed, and roll calls for who&apos;s going when.
        </p>
        <div className="mt-8 flex justify-center"><CrewSearch initialQuery={q ?? ''} initialSport={sportId} /></div>
      </div>

      {q && !point && (
        <p className="mt-8 text-center font-body text-sm text-zinc-500">Can&apos;t place &ldquo;{q}&rdquo; in North America — try the town with its state or province.</p>
      )}

      {point && (
        <>
          <div className="rule-plaid mt-12" aria-hidden />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Riders */}
            <section>
              <h2 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">
                Riders within {RADIUS_KM} km of {countryFlag(point.countryCode)} {point.label}{sportId ? ` · ${SPORT_BY_ID[sportId].label}` : ''}
              </h2>
              {riders.length === 0 ? (
                <div className="mt-4 rounded-md border border-dashed border-zinc-700 p-6">
                  <p className="font-display text-2xl font-bold uppercase text-white">No one&apos;s logged this ground yet</p>
                  <p className="mt-1 font-body text-sm text-zinc-500">Be the first — <Link href="/trips/new" className="text-teal-700 hover:underline">log a ride</Link> and the next rider through finds you.</p>
                </div>
              ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {riders.map(r => (
                    <li key={r.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/profile/${r.username}`} className="flex items-center gap-3">
                          {r.avatar_url
                            ? <img src={r.avatar_url.startsWith('https://') ? r.avatar_url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${r.avatar_url}`} alt="" className="h-10 w-10 rounded-md object-cover" />
                            : <div className="grid h-10 w-10 place-items-center rounded-md bg-forest font-display text-lg font-bold text-white">{r.username[0]?.toUpperCase()}</div>}
                          <div>
                            <p className="font-display text-xl font-bold uppercase tracking-[0.02em] text-white">@{r.username}</p>
                            <p className="font-body text-xs text-zinc-500">{r.rides} ride{r.rides === 1 ? '' : 's'} nearby · {Math.round(r.nearest.km)} km</p>
                          </div>
                        </Link>
                        {r.sample
                          ? <span className="tag px-2 py-0.5 text-[10px] tracking-[0.14em]">Sample</span>
                          : <FollowButton currentUserId={user?.id ?? null} targetUserId={r.id} initialFollowing={followingIds.has(r.id)} />}
                      </div>
                      <p className="mt-3 font-body text-sm text-zinc-400">
                        Latest nearby: <Link href={`/trips/${r.nearest.id}`} className="text-white hover:text-orange-500">{r.nearest.title}</Link>
                      </p>
                      {r.sports.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.sports.slice(0, 5).map(id => <span key={id} className="tag px-1.5 py-0.5 text-[10px] tracking-wider">{SPORT_BY_ID[id]?.emoji ?? '·'} {SPORT_BY_ID[id]?.label ?? id}</span>)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Roll calls */}
            <aside className="tx-stitch relative h-fit rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Roll calls</h2>
              <p className="mt-1 font-body text-sm text-zinc-500">&ldquo;{point.label.split(',')[0]}, dates, sport — who&apos;s in?&rdquo;</p>
              {!callsAvailable ? (
                <p className="mt-4 font-body text-sm text-zinc-500">Roll calls open soon — the crew tables aren&apos;t live yet.</p>
              ) : calls.length === 0 ? (
                <p className="mt-4 font-body text-sm text-zinc-500">No roll calls here yet. Post the first.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {calls.map(c => (
                    <li key={c.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                      <p className="font-display text-lg font-bold uppercase tracking-[0.02em] text-white">{SPORT_BY_ID[c.sport]?.emoji} {fmt(c.starts_on)} – {fmt(c.ends_on)}</p>
                      <p className="font-body text-xs text-zinc-500">{c.place_name} · {SPORT_BY_ID[c.sport]?.label ?? c.sport}{c.level && c.level !== 'all' ? ` · ${c.level}` : ''} · @{c.owner ?? 'rider'} · {c.members} in</p>
                      {c.note && <p className="mt-1 font-body text-sm text-zinc-400">{c.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-5 border-t border-zinc-800 pt-4">
                <p className="mb-2 font-expedition text-[11px] uppercase tracking-[0.18em] text-zinc-500">Post a roll call</p>
                <RollCallForm placeSlug={placeSlug} placeName={point.label} lat={point.lat} lng={point.lng} defaultSport={sportId} signedIn={!!user} />
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
