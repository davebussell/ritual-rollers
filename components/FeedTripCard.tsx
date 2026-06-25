'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronUp, Camera, Clock, Zap, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { REGION_COLORS, REGION_EMOJI } from '@/lib/regions'
import { formatTimeAgo } from '@/lib/feed-score'
import { fetchWikiSummary, locationLabel } from '@/lib/wikipedia'
import WikiDestinationCard from '@/components/WikiDestinationCard'
import type { ScoredTrip } from '@/lib/feed-score'

interface Props {
  trip: ScoredTrip
  index: number
  featured?: boolean
  currentUserId: string
  userUpvoted: boolean
}

export default function FeedTripCard({ trip, index, featured, currentUserId, userUpvoted: initialUpvoted }: Props) {
  const [upvoted, setUpvoted] = useState(initialUpvoted)
  const [count, setCount] = useState(trip.upvotes_count)
  const [wikiThumb, setWikiThumb] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (trip.trip_photos?.length) return
    const label = locationLabel((trip as any).country_code)
    if (!label) return
    fetchWikiSummary(label).then(w => { if (w?.thumbnail) setWikiThumb(w.thumbnail) })
  }, [(trip as any).country_code, trip.trip_photos?.length])

  const toggleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (upvoted) {
      await supabase.from('upvotes').delete().match({ user_id: currentUserId, trip_id: trip.id })
      setUpvoted(false); setCount(c => c - 1)
    } else {
      await supabase.from('upvotes').insert({ user_id: currentUserId, trip_id: trip.id })
      setUpvoted(true); setCount(c => c + 1)
    }
  }

  const sp = trip.trip_photos?.[0]?.storage_path
  const cover = sp
    ? sp.startsWith('https://') ? sp
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${sp}`
    : null

  const color = trip.region ? REGION_COLORS[trip.region] : '#f97316'
  const photoCount = trip.trip_photos?.length ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}>
      <Link href={`/trips/${trip.id}`}
        className={`group block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 transition-all hover:shadow-xl hover:shadow-black/40 ${
          featured ? 'md:col-span-2' : ''
        }`}>

        {/* Cover image */}
        <div className={`relative overflow-hidden bg-zinc-800 ${featured ? 'aspect-[2/1]' : 'aspect-video'}`}>
          {cover
            ? <img src={cover} alt={trip.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : wikiThumb
              ? <div className="relative h-full w-full">
                  <img src={wikiThumb} alt={trip.title} className="h-full w-full object-cover opacity-40 transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 flex items-end justify-start p-2">
                    <span className="rounded text-[9px] text-zinc-400 bg-zinc-900/70 px-1.5 py-0.5">Destination preview via Wikipedia</span>
                  </div>
                </div>
              : <div className="flex h-full w-full items-center justify-center text-zinc-700"><Camera className="h-10 w-10" /></div>}

          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent" />

          {/* Novelty badge */}
          {trip.isNovelRegion && (
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-zinc-950/80 border border-yellow-500/40 px-2 py-0.5 text-[10px] font-bold text-yellow-400 backdrop-blur">
              <Zap className="h-2.5 w-2.5" /> First to explore
            </div>
          )}

          {/* Photo count */}
          {photoCount > 1 && (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-zinc-950/70 px-2 py-0.5 text-[10px] text-zinc-300 backdrop-blur">
              <Camera className="h-2.5 w-2.5" /> {photoCount}
            </div>
          )}

          {/* Region pill */}
          {trip.region && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur"
              style={{ background: `${color}25`, color, border: `1px solid ${color}40` }}>
              {REGION_EMOJI[trip.region]} {trip.region}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4">
          <h3 className={`font-bold text-white leading-snug group-hover:text-orange-50 transition-colors line-clamp-2 ${featured ? 'text-lg' : 'text-sm'}`}>
            {trip.title}
          </h3>

          {/* Author + collaborators */}
          <div className="mt-1.5 flex items-center gap-1 flex-wrap">
            <Link href={`/profile/${trip.profiles?.username}`}
              className="text-xs text-zinc-400 hover:text-orange-300 transition-colors"
              onClick={e => e.stopPropagation()}>
              @{trip.profiles?.username}
            </Link>
            {trip.collaborators && trip.collaborators.length > 0 && (
              <>
                <span className="text-zinc-700 text-xs">·</span>
                {trip.collaborators.map(c => (
                  <Link key={c.user_id} href={`/profile/${c.profiles?.username}`}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    onClick={e => e.stopPropagation()}>
                    @{c.profiles?.username}
                  </Link>
                ))}
              </>
            )}
          </div>

          {featured && trip.description && (
            <p className="mt-2 text-sm text-zinc-500 line-clamp-2">{trip.description}</p>
          )}

          {featured && (trip as any).country_code && (
            <div className="mt-3">
              <WikiDestinationCard countryCode={(trip as any).country_code} compact />
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] text-zinc-600">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(trip.hoursAgo)}
            </span>

            <div className="flex items-center gap-2">
              {count >= 10 && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-500">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  Top
                </span>
              )}
              <button onClick={toggleUpvote}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all active:scale-90 ${
                  upvoted ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10'
                }`}>
                <ChevronUp className={`h-3.5 w-3.5 ${upvoted ? 'fill-orange-400' : ''}`} />
                {count}
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
