'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  tripId: string
  currentUserId: string | null
  initialCount: number
  initialUpvoted: boolean
}

export default function UpvoteButton({ tripId, currentUserId, initialCount, initialUpvoted }: Props) {
  const supabase = createClient()
  const [upvoted, setUpvoted] = useState(initialUpvoted)
  const [count, setCount] = useState(initialCount)

  const toggle = async () => {
    if (!currentUserId) { window.location.href = '/auth/login'; return }
    if (upvoted) {
      await supabase.from('upvotes').delete().match({ user_id: currentUserId, trip_id: tripId })
      setUpvoted(false)
      setCount(c => c - 1)
    } else {
      await supabase.from('upvotes').insert({ user_id: currentUserId, trip_id: tripId })
      setUpvoted(true)
      setCount(c => c + 1)
    }
  }

  return (
    <button
      onClick={toggle}
      className={`flex flex-col items-center gap-1 rounded-xl border px-4 py-3 transition-colors ${
        upvoted
          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
          : 'border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-400'
      }`}
    >
      <svg className="w-5 h-5" fill={upvoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
      <span className="text-lg font-bold">{count}</span>
    </button>
  )
}
