'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronUp, MapPin, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { REGION_COLORS } from '@/lib/regions'
import { getActivity } from '@/lib/activities'
import { fetchWikiSummary, locationLabel } from '@/lib/wikipedia'
import type { TripWithAnchor } from '@/lib/types'

interface Props {
  trip: TripWithAnchor
  currentUserId: string | null
  isActive: boolean
  userUpvoted: boolean
  onUpvoteChange: (tripId: string, state: boolean) => void
  index?: number
}

export default function ExploreTripCard({
  trip, currentUserId, isActive, userUpvoted, onUpvoteChange, index = 0,
}: Props) {
  const [upvoted, setUpvoted] = useState(userUpvoted)
  const [count, setCount] = useState(trip.upvotes_count)
  const [wikiThumb, setWikiThumb] = useState<string | null>(null)

  useEffect(() => {
    if (trip.trip_photos?.length) return // only fetch wiki thumb when no user photos
    const label = locationLabel(trip.country_code)
    if (!label) return
    fetchWikiSummary(label).then(w => { if (w?.thumbnail) setWikiThumb(w.thumbnail) })
  }, [trip.country_code, trip.trip_photos?.length])

  const sp = trip.trip_photos?.[0]?.storage_path
  const coverUrl = sp
    ? sp.startsWith('https://') ? sp
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${sp}`
    : null

  const regionColor = trip.region ? REGION_COLORS[trip.region] : '#f97316'

  const toggleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!currentUserId) { window.location.href = '/auth/login'; return }
    const supabase = createClient()
    if (upvoted) {
      await supabase.from('upvotes').delete().match({ user_id: currentUserId, trip_id: trip.id })
      setUpvoted(false); setCount(c => c - 1); onUpvoteChange(trip.id, false)
    } else {
      await supabase.from('upvotes').insert({ user_id: currentUserId, trip_id: trip.id })
      setUpvoted(true); setCount(c => c + 1); onUpvoteChange(trip.id, true)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: 'easeOut' }}
    >
      <Link href={`/trips/${trip.id}`}
        className={`group flex gap-3 px-3 py-3 transition-colors ${
          isActive ? 'bg-zinc-800/70' : 'hover:bg-zinc-900/60'
        }`}>

        {/* Cover */}
        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
          {coverUrl ? (
            <img src={coverUrl} alt={trip.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : wikiThumb ? (
            <div className="relative h-full w-full">
              <img src={wikiThumb} alt={trip.title}
                className="h-full w-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 flex items-end justify-start p-1">
                <span className="rounded text-[8px] text-zinc-500 bg-zinc-900/60 px-1">via Wikipedia</span>
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-700">
              <Camera className="h-5 w-5" />
            </div>
          )}
          {isActive && (
            <div className="absolute inset-0 rounded-xl ring-2 ring-orange-500 ring-offset-1 ring-offset-zinc-900" />
          )}
          {/* Photo count badge */}
          {trip.allPhotos.length > 0 && (
            <div className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-md bg-black/60 px-1 py-0.5 text-[9px] text-white backdrop-blur-sm">
              <Camera className="h-2 w-2" />
              {trip.allPhotos.length}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <h3 className="truncate text-sm font-semibold leading-tight text-white group-hover:text-orange-100 transition-colors">
              {trip.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
              <span>@{trip.profiles?.username}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {trip.region && (
              <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${regionColor}18`, color: regionColor }}>
                <MapPin className="h-2.5 w-2.5" />
                {trip.region}
              </span>
            )}
            {(trip.activity_tags ?? []).slice(0, 2).map(tag => {
              const a = getActivity(tag)
              if (!a) return null
              return (
                <span key={tag} className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: `${a.color}18`, color: a.color }}>
                  {a.emoji} {a.label}
                </span>
              )
            })}
          </div>
        </div>

        {/* Upvote */}
        <motion.button
          onClick={toggleUpvote}
          whileTap={{ scale: 0.85 }}
          className={`flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
            upvoted
              ? 'bg-orange-500/15 text-orange-400'
              : 'text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300'
          }`}>
          <ChevronUp className={`h-3.5 w-3.5 transition-transform ${upvoted ? '-translate-y-0.5' : ''}`} strokeWidth={2.5} />
          <span>{count}</span>
        </motion.button>
      </Link>
    </motion.div>
  )
}
