import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import UpvoteButton from '@/components/UpvoteButton'
import CommunityUpload from '@/components/CommunityUpload'
import MapView from '@/components/MapView'
import WikiDestinationCard from '@/components/WikiDestinationCard'
import { getActivity } from '@/lib/activities'
import { getRegion, REGION_COLORS, REGION_EMOJI } from '@/lib/regions'
import { MapPin, Camera, Calendar, ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: trip } = await supabase
    .from('trips')
    .select(`*, profiles(*), trip_photos!trip_photos_trip_id_fkey(*, profiles(username, avatar_url)), trip_collaborators(user_id, profiles(username, avatar_url))`)
    .eq('id', id)
    .single()

  if (!trip) notFound()

  const photos = [...(trip.trip_photos ?? [])].sort((a, b) => a.sequence_order - b.sequence_order)
  const heroPhoto = photos[0]
  const heroUrl = heroPhoto?.storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${heroPhoto.storage_path}`
    : null

  let userUpvoted = false
  if (user) {
    const { data } = await supabase.from('upvotes').select('trip_id')
      .match({ user_id: user.id, trip_id: id }).single()
    userUpvoted = !!data
  }

  const anchor = photos.find(p => p.lat != null && p.lng != null)
  const region = anchor?.lat && anchor?.lng ? getRegion(anchor.lat, anchor.lng) : null
  const regionColor = region ? REGION_COLORS[region] : '#f97316'

  const date = new Date(trip.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const collaborators: Array<{ user_id: string; profiles: { username: string; avatar_url: string | null } | null }> = trip.trip_collaborators ?? []
  const activities = ((trip.activity_tags ?? []).map((tag: string) => getActivity(tag)).filter(Boolean)) as import('@/lib/activities').Activity[]

  const photoUrls = photos.map(p => ({
    ...p,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${p.storage_path}`,
  }))

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Back nav */}
      <div className="fixed top-16 left-4 z-40">
        <Link href="/" className="flex items-center gap-1.5 rounded-full bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-white backdrop-blur transition-colors">
          <ChevronLeft className="h-3 w-3" /> Back
        </Link>
      </div>

      {/* HERO */}
      <div className="relative h-[70vh] min-h-[480px] w-full overflow-hidden">
        {heroUrl ? (
          <img src={heroUrl} alt={trip.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-900 to-zinc-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 sm:px-12">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {region && (
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold backdrop-blur"
                style={{ background: `${regionColor}30`, color: regionColor, border: `1px solid ${regionColor}50` }}>
                <MapPin className="h-3 w-3" />
                {REGION_EMOJI[region]} {region}
              </span>
            )}
            {activities.map(a => a && (
              <span key={a.id} className="rounded-full px-3 py-1 text-xs font-bold backdrop-blur"
                style={{ background: `${a.color}25`, color: a.color, border: `1px solid ${a.color}40` }}>
                {a.emoji} {a.label}
              </span>
            ))}
          </div>

          <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
            {trip.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
            <Link href={`/profile/${trip.profiles?.username}`}
              className="flex items-center gap-2 hover:text-orange-400 transition-colors">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shrink-0">
                {trip.profiles?.username?.[0]?.toUpperCase()}
              </div>
              @{trip.profiles?.username}
            </Link>
            {collaborators.length > 0 && (
              <>
                <span className="text-zinc-600">with</span>
                {collaborators.map(c => (
                  <Link key={c.user_id} href={`/profile/${c.profiles?.username}`}
                    className="hover:text-orange-400 transition-colors">
                    @{c.profiles?.username}
                  </Link>
                ))}
              </>
            )}
            <span className="flex items-center gap-1 text-zinc-500">
              <Calendar className="h-3.5 w-3.5" />{date}
            </span>
            <span className="flex items-center gap-1 text-zinc-500">
              <Camera className="h-3.5 w-3.5" />{photos.length} photo{photos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Upvote floating */}
        <div className="absolute right-6 top-20">
          <UpvoteButton tripId={trip.id} currentUserId={user?.id ?? null}
            initialCount={trip.upvotes_count} initialUpvoted={userUpvoted} />
        </div>
      </div>

      {/* ARTICLE BODY */}
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-12">

        {/* Editorial intro */}
        {trip.description && (
          <div className="mb-12 border-l-2 pl-6" style={{ borderColor: regionColor }}>
            <p className="text-xl leading-relaxed text-zinc-300 font-light italic">{trip.description}</p>
          </div>
        )}

        {/* Wikipedia destination */}
        {trip.country_code && (
          <div className="mb-12">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-600">The Destination</p>
            <WikiDestinationCard countryCode={trip.country_code} />
          </div>
        )}

        {/* Photo spread */}
        {photos.length > 1 && (
          <div className="mb-12">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-zinc-600">The Shots</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {photoUrls.map((photo, i) => (
                <div key={photo.id}
                  className={`group relative overflow-hidden rounded-xl bg-zinc-900 ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                  <div className="aspect-square overflow-hidden">
                    <img src={photo.url} alt={photo.caption ?? ''}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="text-xs text-white">{photo.caption}</p>
                    </div>
                  )}
                  {photo.lat && (
                    <div className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1">
                      <MapPin className="h-2.5 w-2.5 text-orange-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        {anchor && (
          <div className="mb-12">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-zinc-600">Where It Happened</p>
            <div className="h-80 overflow-hidden rounded-2xl border border-zinc-800">
              <MapView photos={photos} />
            </div>
          </div>
        )}

        {/* The Crew */}
        {(collaborators.length > 0 || trip.profiles) && (
          <div className="mb-12">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-zinc-600">The Crew</p>
            <div className="flex flex-wrap gap-3">
              {[
                { user_id: trip.owner_id, profiles: trip.profiles, isOwner: true },
                ...collaborators.map(c => ({ ...c, isOwner: false })),
              ].map((member: { user_id: string; profiles: { username: string } | null; isOwner: boolean }) => (
                <Link key={member.user_id} href={`/profile/${member.profiles?.username}`}
                  className="group flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 hover:border-zinc-600 transition-all">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-sm font-bold text-white shrink-0">
                    {member.profiles?.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-orange-300 transition-colors">
                      @{member.profiles?.username}
                    </p>
                    {member.isOwner && (
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Author</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Community upload */}
        {user && trip.is_public && user.id !== trip.owner_id && (
          <div className="mb-12">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-zinc-600">Add Your Shots</p>
            <CommunityUpload tripId={trip.id} userId={user.id} />
          </div>
        )}

        {/* Footer CTA */}
        <div className="border-t border-zinc-800 pt-10 text-center">
          <p className="mb-4 text-sm text-zinc-500">Stoked on this adventure?</p>
          <UpvoteButton tripId={trip.id} currentUserId={user?.id ?? null}
            initialCount={trip.upvotes_count} initialUpvoted={userUpvoted} />
          {!user && (
            <p className="mt-4 text-xs text-zinc-600">
              <Link href="/auth/login" className="text-orange-400 hover:underline">Sign in</Link> to upvote and follow the crew
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
