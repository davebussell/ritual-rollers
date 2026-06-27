import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRegion, REGIONS, REGION_COLORS, REGION_EMOJI, type Region } from '@/lib/regions'
import { scoreTrips } from '@/lib/feed-score'
import FeedTripCard from '@/components/FeedTripCard'
import PageContainer from '@/components/PageContainer'
import { Users, Compass, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user: rawUser } } = await supabase.auth.getUser()
  // Treat anonymous sessions as logged-out
  const user = (rawUser as (typeof rawUser & { is_anonymous?: boolean }) | null)?.is_anonymous ? null : rawUser

  const { data: followingRows } = user ? await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id) : { data: null }

  const followingIds = followingRows?.map(r => r.following_id) ?? []

  let rawTrips: Array<{
    id: string; owner_id: string; title: string; description: string | null
    is_public: boolean; upvotes_count: number; created_at: string
    country_code: string | null
    profiles: { username: string; avatar_url: string | null } | null
    trip_photos: Array<{ storage_path: string; lat: number | null; lng: number | null; sequence_order: number }>
    trip_collaborators: Array<{ user_id: string; profiles: { username: string } | null }>
  }> = []

  if (followingIds.length > 0) {
    const { data } = await supabase
      .from('trips')
      .select(`
        *,
        profiles(username, avatar_url),
        trip_photos!trip_photos_trip_id_fkey(storage_path, lat, lng, sequence_order),
        trip_collaborators(user_id, profiles(username))
      `)
      .in('owner_id', followingIds)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50)
    rawTrips = (data ?? []) as typeof rawTrips
  }

  const { data: upvotes } = user ? await supabase
    .from('upvotes')
    .select('trip_id')
    .eq('user_id', user.id) : { data: null }
  const upvotedIds = new Set(upvotes?.map(u => u.trip_id) ?? [])

  // Compute region for each trip from anchor photo GPS
  const withRegion = rawTrips.map(t => {
    const sorted = [...(t.trip_photos ?? [])].sort((a, b) => a.sequence_order - b.sequence_order)
    const anchor = sorted.find(p => p.lat != null && p.lng != null)
    const region: Region | null = anchor?.lat && anchor?.lng ? getRegion(anchor.lat, anchor.lng) : null
    return {
      ...t,
      collaborators: t.trip_collaborators,
      region,
      isNovelRegion: false,
      feedScore: 0,
      hoursAgo: 0,
    }
  })

  // Count trips per region to measure novelty
  const regionCounts = REGIONS.reduce((acc, r) => {
    acc[r] = withRegion.filter(t => t.region === r).length
    return acc
  }, {} as Record<string, number>)

  // Mark novel regions (< 5 trips in feed from this region)
  const tripsWithNovelty = withRegion.map(t => ({
    ...t,
    isNovelRegion: t.region ? (regionCounts[t.region] ?? 0) < 5 : false,
  }))

  const scored = scoreTrips(tripsWithNovelty, regionCounts)

  // Region diversity stats for header
  const regions = Array.from(new Set(scored.map(t => t.region).filter(Boolean))) as Region[]

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Friends Feed</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {scored.length > 0
              ? `${scored.length} trips · ranked by novelty & engagement`
              : followingIds.length === 0
                ? 'Follow explorers to see their journeys here'
                : 'No recent trips from people you follow'}
          </p>
        </div>
        {regions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {regions.map(r => (
              <span key={r} className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: `${REGION_COLORS[r]}20`, color: REGION_COLORS[r], border: `1px solid ${REGION_COLORS[r]}30` }}>
                {REGION_EMOJI[r]} {r}
              </span>
            ))}
          </div>
        )}
      </div>

      {followingIds.length === 0 ? (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-zinc-800 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-600">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">You're not following anyone yet</p>
            <p className="mt-1 text-sm text-zinc-500">Find explorers to follow and their trips will appear here.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/"
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 transition-all active:scale-95">
              <Compass className="h-4 w-4" /> Explore the map
            </Link>
            <Link href="/guide"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white transition-all">
              <BookOpen className="h-4 w-4" /> Read the guide
            </Link>
          </div>
        </div>
      ) : scored.length === 0 ? (
        <div className="py-24 text-center text-zinc-500">
          <p>No recent trips from people you follow.</p>
          <Link href="/" className="mt-2 inline-block text-orange-400 hover:underline text-sm">Explore the map →</Link>
        </div>
      ) : (
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
      )}
    </PageContainer>
  )
}
