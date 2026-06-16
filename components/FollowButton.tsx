'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  currentUserId: string | null
  targetUserId: string
  initialFollowing: boolean
}

export default function FollowButton({ currentUserId, targetUserId, initialFollowing }: Props) {
  const supabase = createClient()
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  if (currentUserId === targetUserId) return null

  const toggle = async () => {
    if (!currentUserId) { window.location.href = '/auth/login'; return }
    setLoading(true)
    if (following) {
      await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: targetUserId })
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetUserId })
      setFollowing(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        following
          ? 'border border-zinc-600 text-zinc-300 hover:border-red-500 hover:text-red-400'
          : 'bg-orange-500 text-white hover:bg-orange-400'
      }`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
