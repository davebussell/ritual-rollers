'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Trip } from '@/lib/types'

interface Props {
  trip: Trip
  currentUserId?: string
  userUpvoted?: boolean
}

export default function TripCard({ trip, currentUserId, userUpvoted: initialUpvoted = false }: Props) {
  const supabase = createClient()
  const [upvoted, setUpvoted] = useState(initialUpvoted)
  const [count, setCount] = useState(trip.upvotes_count)

  const coverUrl = trip.trip_photos?.[0]?.storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${trip.trip_photos[0].storage_path}`
    : null

  const toggleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!currentUserId) { window.location.href = '/auth/login'; return }

    if (upvoted) {
      await supabase.from('upvotes').delete().match({ user_id: currentUserId, trip_id: trip.id })
      setUpvoted(false)
      setCount(c => c - 1)
    } else {
      await supabase.from('upvotes').insert({ user_id: currentUserId, trip_id: trip.id })
      setUpvoted(true)
      setCount(c => c + 1)
    }
  }

  return (
    <Link href={`/trips/${trip.id}`} className="group block rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors">
      <div className="aspect-video bg-zinc-800 overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white truncate">{trip.title}</h3>
        {trip.profiles && (
          <p className="text-sm text-zinc-400 mt-0.5">by @{trip.profiles.username}</p>
        )}
        {trip.description && (
          <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{trip.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-zinc-600">
            {new Date(trip.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            onClick={toggleUpvote}
            className={`flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-md transition-colors ${
              upvoted ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-500 hover:text-orange-400'
            }`}
          >
            <svg className="w-4 h-4" fill={upvoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            {count}
          </button>
        </div>
      </div>
    </Link>
  )
}
