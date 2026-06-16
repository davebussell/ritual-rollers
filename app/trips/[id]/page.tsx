import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MapView from '@/components/MapView'
import CommunityUpload from '@/components/CommunityUpload'
import UpvoteButton from '@/components/UpvoteButton'
import Link from 'next/link'
import PageContainer from '@/components/PageContainer'

export const dynamic = 'force-dynamic'

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: trip } = await supabase
    .from('trips')
    .select('*, profiles(*), trip_photos(*, profiles(username, avatar_url))')
    .eq('id', id)
    .single()

  if (!trip) notFound()

  const photos = [...(trip.trip_photos ?? [])].sort(
    (a, b) => a.sequence_order - b.sequence_order
  )

  let userUpvoted = false
  if (user) {
    const { data } = await supabase
      .from('upvotes')
      .select('trip_id')
      .match({ user_id: user.id, trip_id: id })
      .single()
    userUpvoted = !!data
  }

  return (
    <PageContainer>
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{trip.title}</h1>
          {trip.profiles && (
            <Link href={`/profile/${trip.profiles.username}`} className="mt-1 inline-block text-zinc-400 hover:text-white transition-colors">
              by @{trip.profiles.username}
            </Link>
          )}
          {trip.description && <p className="mt-3 text-zinc-300 max-w-2xl">{trip.description}</p>}
        </div>
        <UpvoteButton
          tripId={trip.id}
          currentUserId={user?.id ?? null}
          initialCount={trip.upvotes_count}
          initialUpvoted={userUpvoted}
        />
      </div>

      {/* Map */}
      <div className="mb-8 h-[420px] rounded-xl overflow-hidden">
        <MapView photos={photos} />
      </div>

      {/* Photo grid */}
      <div className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">
          {photos.length} Photo{photos.length !== 1 ? 's' : ''}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map(photo => {
            const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${photo.storage_path}`
            return (
              <div key={photo.id} className="group rounded-lg overflow-hidden bg-zinc-900">
                <div className="aspect-square overflow-hidden">
                  <img src={url} alt={photo.caption ?? ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                {(photo.caption || photo.profiles?.username) && (
                  <div className="p-2">
                    {photo.caption && <p className="text-xs text-zinc-300 truncate">{photo.caption}</p>}
                    {photo.profiles?.username && (
                      <p className="text-xs text-zinc-600 mt-0.5">@{photo.profiles.username}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Community upload */}
      {user && trip.is_public && user.id !== trip.owner_id && (
        <CommunityUpload tripId={trip.id} userId={user.id} />
      )}
    </div>
    </PageContainer>
  )
}
