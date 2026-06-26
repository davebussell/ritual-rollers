import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRegion, type Region } from '@/lib/regions'
import TripCard from '@/components/TripCard'
import FollowButton from '@/components/FollowButton'
import ProfileBadges from '@/components/ProfileBadges'
import ProfileGallery from '@/components/ProfileGallery'
import { MapPin, Camera, Trophy, Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single()
  if (!profile) notFound()

  const [{ data: tripsRaw }, { count: followersCount }, { count: followingCount }, { data: followRow }] = await Promise.all([
    supabase.from('trips')
      .select('*, trip_photos(id, storage_path, lat, lng, sequence_order, caption), trip_collaborators(user_id, profiles(username))')
      .eq('owner_id', profile.id).eq('is_public', true).order('created_at', { ascending: false }),
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

  const explorerRegions = Array.from(new Set(trips.flatMap(t => {
    const anchor = (t.trip_photos ?? []).find((p: { lat: number | null; lng: number | null }) => p.lat != null)
    if (!anchor?.lat || !anchor?.lng) return []
    const r = getRegion(anchor.lat, anchor.lng)
    return r ? [r] : []
  }))) as Region[]

  const totalUpvotes = trips.reduce((s, t) => s + (t.upvotes_count ?? 0), 0)

  const bestTrip = [...trips].sort((a, b) => b.upvotes_count - a.upvotes_count)[0]
  const coverPhoto = bestTrip?.trip_photos?.[0]
  const coverUrl = coverPhoto?.storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${coverPhoto.storage_path}`
    : null

  const avatarUrl = profile.avatar_url
    ? profile.avatar_url.startsWith('https://') ? profile.avatar_url
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
    : null

  const allPhotos = trips.flatMap(t =>
    (t.trip_photos ?? []).map((p: { id: string; storage_path: string; caption?: string | null }) => ({
      id: p.id,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${p.storage_path}`,
      caption: p.caption ?? null,
      tripId: t.id,
      tripTitle: t.title,
    }))
  )

  const countries = Array.from(new Set(trips.map(t => t.country_code).filter(Boolean))) as string[]

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Cover */}
      <div className="relative h-56 w-full overflow-hidden sm:h-72">
        {coverUrl
          ? <img src={coverUrl} alt="cover" className="h-full w-full object-cover opacity-50" />
          : <div className="h-full w-full bg-gradient-to-br from-orange-900/30 via-zinc-900 to-zinc-950" />}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        {isOwnProfile && (
          <Link href="/profile/edit"
            className="absolute right-4 top-20 flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-950/80 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur hover:border-zinc-500 hover:text-white transition-all">
            <Settings className="h-3 w-3" /> Edit profile
          </Link>
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-8">
        {/* Avatar row */}
        <div className="-mt-12 mb-6 flex items-end justify-between gap-4">
          <div className="relative shrink-0">
            {avatarUrl
              ? <img src={avatarUrl} alt={profile.username} className="h-24 w-24 rounded-2xl object-cover ring-4 ring-zinc-950 shadow-xl" />
              : <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-4xl font-black text-white ring-4 ring-zinc-950 shadow-xl">
                  {profile.username[0].toUpperCase()}
                </div>}
            {explorerRegions.length > 0 && (
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow ring-2 ring-zinc-950">✦</div>
            )}
          </div>
          <div className="pb-1">
            {!isOwnProfile && (
              <FollowButton currentUserId={currentUser?.id ?? null} targetUserId={profile.id} initialFollowing={isFollowing} />
            )}
          </div>
        </div>

        {/* Name + bio */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-white">@{profile.username}</h1>
            {explorerRegions.length >= 3 && (
              <span className="rounded-full bg-orange-500/15 border border-orange-500/30 px-2.5 py-0.5 text-[11px] font-bold text-orange-400">✦ World Traveller</span>
            )}
          </div>
          {profile.bio && <p className="mt-2 text-sm text-zinc-400 max-w-xl leading-relaxed">{profile.bio}</p>}

          {/* Stats */}
          <div className="mt-4 flex flex-wrap gap-6">
            {[
              { value: trips.length, label: 'Trips' },
              { value: allPhotos.length, label: 'Photos' },
              { value: totalUpvotes, label: 'Upvotes' },
              { value: followersCount ?? 0, label: 'Followers', href: `/profile/${username}/followers` },
              { value: followingCount ?? 0, label: 'Following', href: `/profile/${username}/following` },
              ...(countries.length > 0 ? [{ value: countries.length, label: 'Countries' }] : []),
            ].map(stat => stat.href ? (
              <Link key={stat.label} href={stat.href} className="text-center hover:opacity-70 transition-opacity">
                <p className="text-xl font-black text-white">{stat.value}</p>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide">{stat.label}</p>
              </Link>
            ) : (
              <div key={stat.label} className="text-center">
                <p className="text-xl font-black text-white">{stat.value}</p>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Country flags */}
        {countries.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-1.5">
            {countries.map(code => {
              try {
                const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase())
                const flag = code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
                return <span key={code} title={name ?? code} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-base">{flag}</span>
              } catch { return null }
            })}
          </div>
        )}

        {/* Trips */}
        <div className="mb-4">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2">
            <MapPin className="h-3 w-3" /> Adventures · {trips.length}
          </p>
          {trips.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-800 py-20 text-center">
              <Camera className="h-8 w-8 text-zinc-700" />
              <p className="text-zinc-500">No public trips yet.</p>
              {isOwnProfile && (
                <Link href="/trips/new" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 transition-all">
                  Create your first trip
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map(trip => (
                <TripCard key={trip.id} trip={trip} currentUserId={currentUser?.id} userUpvoted={upvotedIds.has(trip.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Gallery */}
        {allPhotos.length > 0 && (
          <div className="mt-12 mb-4">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2">
              <Camera className="h-3 w-3" /> Gallery · {allPhotos.length}
            </p>
            <ProfileGallery photos={allPhotos} />
          </div>
        )}

        {/* Badges */}
        <div className="mt-12 mb-16 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2">
            <Trophy className="h-3 w-3" /> Badges & Achievements
          </p>
          <ProfileBadges explorerRegions={explorerRegions} isOwnProfile={isOwnProfile} />
        </div>
      </div>
    </div>
  )
}
