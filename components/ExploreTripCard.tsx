'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { REGION_COLORS } from '@/lib/regions'
import type { TripWithAnchor } from '@/lib/types'

interface Props {
  trip: TripWithAnchor
  currentUserId: string | null
  isActive: boolean
  userUpvoted: boolean
  onUpvoteChange: (tripId: string, state: boolean) => void
}

export default function ExploreTripCard({ trip, currentUserId, isActive, userUpvoted, onUpvoteChange }: Props) {
  const [upvoted, setUpvoted] = useState(userUpvoted)
  const [count, setCount] = useState(trip.upvotes_count)

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
      setUpvoted(false)
      setCount(c => c - 1)
      onUpvoteChange(trip.id, false)
    } else {
      await supabase.from('upvotes').insert({ user_id: currentUserId, trip_id: trip.id })
      setUpvoted(true)
      setCount(c => c + 1)
      onUpvoteChange(trip.id, true)
    }
  }

  return (
    <Link
      href={`/trips/${trip.id}`}
      className={`flex gap-3 px-3 py-3 transition-colors ${
        isActive ? 'bg-zinc-800/60' : 'hover:bg-zinc-900/60'
      }`}
    >
      {/* Cover thumbnail */}
      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
        {coverUrl ? (
          <img src={coverUrl} alt={trip.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
        )}
        {/* Active pulse border */}
        {isActive && (
          <div className="absolute inset-0 rounded-lg ring-2 ring-orange-500 ring-offset-1 ring-offset-zinc-900" />
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h3 className="truncate text-sm font-semibold text-white leading-tight">{trip.title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            @{trip.profiles?.username} · {trip.allPhotos.length} stop{trip.allPhotos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {trip.region && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${regionColor}20`, color: regionColor }}
            >
              {trip.region}
            </span>
          )}
        </div>
      </div>

      {/* Upvote */}
      <button
        onClick={toggleUpvote}
        className={`flex shrink-0 flex-col items-center justify-center rounded-lg px-2 py-1 text-xs transition-colors ${
          upvoted ? 'text-orange-400' : 'text-zinc-600 hover:text-orange-400'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill={upvoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        <span>{count}</span>
      </button>
    </Link>
  )
}
