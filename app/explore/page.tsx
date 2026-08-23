import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRegion, REGION_COLORS, REGION_EMOJI, type Region } from '@/lib/regions'
import type { ScoredTrip } from '@/lib/feed-score'
import FeedTripCard from '@/components/FeedTripCard'
import PageContainer from '@/components/PageContainer'
import { Map, Sparkles, UserPlus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user: rawUser } } = await supabase.auth.getUser()
  const user = (rawUser as (typeof rawUser & { is_anonymous?: boolean }) | null)?.is_anonymous ? null : rawUser

  const { data: followingRows } = user ? await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id) : { data: null }
  const followingIds = followingRows?.map(r => r.following_id) ?? []

  // Signed in and following people → their crew's trips.
  // Otherwise → the community's best trips, presented as an example feed.
  const followingMode = followingIds.length > 0

  let query = supabase
    .from('trips')
    .select(`
      *,
      profiles!trips_owner_id_fkey(username, avatar_url),
      trip_photos!trip_photos_trip_id_fkey(storage_path, lat, lng, sequence_order),
      trip_collaborators(user_id, profiles(username))
    `)
    .eq('is_public', true)
    .order('upvotes_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30)

  if (followingMode) query = query.in('owner_id', followingIds)

  const { data } = await query

  type RawTrip = {
    id: string; owner_id: string; title: string; description: string | null
    is_public: boolean; upvotes_count: number; created_at: string
    country_code: string | null
    profiles: { username: string; avatar_url: string | null } | null
    trip_photos: Array<{ storage_path: string; lat: number | null; lng: number | null; sequence_order: number }>
    trip_collaborators: Array<{ user_id: string; profiles: { username: string } | null }>
  }
  const rawTrips = (data ?? []) as RawTrip[]

  const { data: upvotes } = user ? await supabase
    .from('upvotes')
    .select('trip_id')
    .eq('user_id', user.id) : { data: null }
  const upvotedIds = new Set(upvotes?.map(u => u.trip_id) ?? [])

  const now = Date.now()
  const scored: ScoredTrip[] = rawTrips.map(t => {
    const sorted = [...(t.trip_photos ?? [])].sort((a, b) => a.sequence_order - b.sequence_order)
    const anchor = sorted.find(p => p.lat != null && p.lng != null)
    const region: Region | null = anchor?.lat && anchor?.lng ? getRegion(anchor.lat, anchor.lng) : null
    return {
      ...t,
      trip_photos: sorted,
      collaborators: t.trip_collaborators,
      region,
      isNovelRegion: false,
      feedScore: t.upvotes_count,
      hoursAgo: (now - new Date(t.created_at).getTime()) / (1000 * 60 * 60),
    }
  })

  const crews = Array.from(new Set(scored.map(t => t.profiles?.username).filter(Boolean))) as string[]
  const regions = Array.from(new Set(scored.map(t => t.region).filter(Boolean))) as Region[]

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Explore</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {followingMode
              ? `The latest from the ${followingIds.length} explorer${followingIds.length !== 1 ? 's' : ''} you follow`
              : 'Journeys from crews around the world — every one built from photos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {regions.length > 0 && (
            <div className="hidden flex-wrap gap-1.5 sm:flex">
              {regions.slice(0, 4).map(r => (
                <span key={r} className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: `${REGION_COLORS[r]}20`, color: REGION_COLORS[r], border: `1px solid ${REGION_COLORS[r]}30` }}>
                  {REGION_EMOJI[r]} {r}
                </span>
              ))}
            </div>
          )}
          <Link href="/map"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-all hover:border-zinc-500 hover:text-white">
            <Map className="h-3.5 w-3.5" /> World map
          </Link>
        </div>
      </div>

      {/* Example-feed banner for visitors not following anyone */}
      {!followingMode && (
        <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/5 px-4 py-3">
          <Sparkles className="h-4 w-4 shrink-0 text-orange-400" />
          <p className="flex-1 text-sm text-zinc-400">
            <span className="font-expedition text-[10px] uppercase tracking-[0.25em] text-orange-400">Example feed · </span>
            This is what your feed looks like once you follow a few explorers — open any trip to review the full mapped story.
          </p>
          {!user && (
            <Link href="/auth/signup"
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:brightness-110 active:scale-95">
              <UserPlus className="h-3.5 w-3.5" /> Join the crew
            </Link>
          )}
        </div>
      )}

      {scored.length === 0 ? (
        <div className="py-24 text-center text-zinc-500">
          <p>{followingMode ? 'No trips from your crew yet.' : 'No trips yet.'}</p>
          <Link href="/trips/new" className="mt-2 inline-block text-sm text-orange-400 hover:underline">
            Upload the first one →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {scored.map((trip, i) => (
              <FeedTripCard
                key={trip.id}
                trip={trip}
                index={i}
                featured={i === 0}
                currentUserId={user?.id ?? ''}
                userUpvoted={upvotedIds.has(trip.id)}
              />
            ))}
          </div>
          {!followingMode && crews.length > 0 && (
            <p className="mt-10 text-center text-xs text-zinc-600">
              Featuring journeys by {crews.slice(0, 5).map(c => `@${c}`).join(' · ')}
            </p>
          )}
        </>
      )}
    </PageContainer>
  )
}
