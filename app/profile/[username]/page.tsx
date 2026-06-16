import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TripCard from '@/components/TripCard'
import FollowButton from '@/components/FollowButton'
import PageContainer from '@/components/PageContainer'

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

  const [{ data: trips }, { count: followersCount }, { count: followingCount }, { data: followRow }] = await Promise.all([
    supabase
      .from('trips')
      .select('*, trip_photos(storage_path, sequence_order)')
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
  let upvotedIds = new Set<string>()
  if (currentUser) {
    const { data: upvotes } = await supabase.from('upvotes').select('trip_id').eq('user_id', currentUser.id)
    upvotedIds = new Set(upvotes?.map(u => u.trip_id) ?? [])
  }

  const sortedTrips = (trips ?? []).map(t => ({
    ...t,
    trip_photos: t.trip_photos?.sort((a: { sequence_order: number }, b: { sequence_order: number }) => a.sequence_order - b.sequence_order),
  }))

  return (
    <PageContainer>
    <div>
      <div className="mb-8 flex items-start gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-2xl font-bold text-white">
          {profile.username[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">@{profile.username}</h1>
            <FollowButton
              currentUserId={currentUser?.id ?? null}
              targetUserId={profile.id}
              initialFollowing={isFollowing}
            />
          </div>
          {profile.bio && <p className="mt-1 text-zinc-400">{profile.bio}</p>}
          <div className="mt-2 flex gap-4 text-sm text-zinc-500">
            <span><strong className="text-white">{followersCount ?? 0}</strong> followers</span>
            <span><strong className="text-white">{followingCount ?? 0}</strong> following</span>
            <span><strong className="text-white">{sortedTrips.length}</strong> trips</span>
          </div>
        </div>
      </div>

      {sortedTrips.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">No public trips yet.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTrips.map(trip => (
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
