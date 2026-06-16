import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TripCard from '@/components/TripCard'
import type { Trip } from '@/lib/types'
import Link from 'next/link'
import PageContainer from '@/components/PageContainer'

export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: followingRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = followingRows?.map(r => r.following_id) ?? []

  let trips: Trip[] = []
  if (followingIds.length > 0) {
    const { data } = await supabase
      .from('trips')
      .select('*, profiles(*), trip_photos(storage_path, sequence_order)')
      .in('owner_id', followingIds)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(30)
    trips = data ?? []
  }

  const { data: upvotes } = await supabase
    .from('upvotes')
    .select('trip_id')
    .eq('user_id', user.id)
  const upvotedIds = new Set(upvotes?.map(u => u.trip_id) ?? [])

  const sortedTrips = trips.map(t => ({
    ...t,
    trip_photos: t.trip_photos?.sort((a: { sequence_order: number }, b: { sequence_order: number }) => a.sequence_order - b.sequence_order),
  }))

  return (
    <PageContainer>
    <div>
      <h1 className="mb-6 text-2xl font-bold">Your Feed</h1>

      {followingIds.length === 0 ? (
        <div className="py-24 text-center text-zinc-500">
          <p className="text-lg">You're not following anyone yet.</p>
          <Link href="/" className="mt-3 inline-block text-orange-400 hover:underline">Explore trips and find people to follow</Link>
        </div>
      ) : sortedTrips.length === 0 ? (
        <div className="py-24 text-center text-zinc-500">
          <p>No recent trips from people you follow.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTrips.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              currentUserId={user.id}
              userUpvoted={upvotedIds.has(trip.id)}
            />
          ))}
        </div>
      )}
    </div>
    </PageContainer>
  )
}
