import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRegion, REGION_COLORS, type Region } from '@/lib/regions'
import TripCard from '@/components/TripCard'
import FollowButton from '@/components/FollowButton'
import PageContainer from '@/components/PageContainer'
import ProfileBadges from '@/components/ProfileBadges'
import { MapPin, Camera, Trophy } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const [{ data: tripsRaw }, { count: followersCount }, { count: followingCount }, { data: followRow }] = await Promise.all([
    supabase
      .from('trips')
      .select('*, trip_photos(id, storage_path, lat, lng, sequence_order)')
      .eq('owner_id', profile.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false }),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    currentUser
      ? supabase.from('follows').select('follower_id').match({ follower_id: currentUser.id, following_id: profile.id }).single()
      : Promise.resolve({ data: null }),
  ])

  const isFollowing = !!followRow
  const isOwnProfile = currentUser?.id === profile.id

  let upvotedIds = new Set<string>()
  if (currentUser) {
    const { data: upvotes } = await supabase.from('upvotes').select('trip_id').eq('user_id', currentUser.id)
    upvotedIds = new Set(upvotes?.map(u => u.trip_id) ?? [])
  }

  const trips = (tripsRaw ?? []).map(t => ({
    ...t,
    trip_photos: t.trip_photos?.sort((a: { sequence_order: number }, b: { sequence_order: number }) => a.sequence_order - b.sequence_order),
  }))

  // Compute which regions this user has Explorer Badges in (server-side, from trips)
  const explorerRegions = Array.from(new Set(
    trips.flatMap(t => {
      const photos = (t.trip_photos ?? []) as Array<{ lat: number | null; lng: number | null }>
      const anchor = photos.find(p => p.lat != null && p.lng != null)
      if (!anchor?.lat || !anchor?.lng) return []
      const region = getRegion(anchor.lat, anchor.lng)
      return region ? [region] : []
    })
  )) as Region[]

  const totalUpvotes = trips.reduce((s, t) => s + (t.upvotes_count ?? 0), 0)

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-3xl font-bold text-white shadow-lg shadow-orange-900/30">
              {profile.username[0].toUpperCase()}
            </div>
            {explorerRegions.length > 0 && (
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-md ring-2 ring-zinc-950"
                title={`${explorerRegions.length} Explorer Badge${explorerRegions.length !== 1 ? 's' : ''}`}>
                ✦
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-white">@{profile.username}</h1>
              {explorerRegions.length >= 3 && (
                <span className="rounded-full bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[11px] font-bold text-orange-400">
                  ✦ World Traveller
                </span>
              )}
              <FollowButton
                currentUserId={currentUser?.id ?? null}
                targetUserId={profile.id}
                initialFollowing={isFollowing}
              />
            </div>
            {profile.bio && <p className="mt-1.5 text-sm text-zinc-400">{profile.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-500">
              <span><strong className="text-white">{followersCount ?? 0}</strong> followers</span>
              <span><strong className="text-white">{followingCount ?? 0}</strong> following</span>
              <span className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" />
                <strong className="text-white">{trips.length}</strong> trips
              </span>
              {totalUpvotes > 0 && (
                <span className="flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" />
                  <strong className="text-white">{totalUpvotes}</strong> upvotes
                </span>
              )}
              {explorerRegions.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <strong className="text-white">{explorerRegions.length}</strong> regions explored
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Badges section */}
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <ProfileBadges explorerRegions={explorerRegions} isOwnProfile={isOwnProfile} />
      </div>

      {/* Trips grid */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">Trips</h2>
        {trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-800 py-20 text-center">
            <Camera className="h-8 w-8 text-zinc-700" />
            <p className="text-zinc-500">No public trips yet.</p>
            {isOwnProfile && (
              <Link href="/trips/new"
                className="mt-1 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 transition-all active:scale-95">
                Create your first trip
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                currentUserId={currentUser?.id}
                userUpvoted={upvotedIds.has(trip.id)}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
