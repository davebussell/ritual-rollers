'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, UserCheck } from 'lucide-react'

interface FollowButtonProps {
  currentUserId: string | null
  targetUserId: string
  initialFollowing: boolean
}

export default function FollowButton({ currentUserId, targetUserId, initialFollowing }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  if (!currentUserId || currentUserId === targetUserId) return null

  async function toggle() {
    if (!currentUserId) return
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
    <button onClick={toggle} disabled={loading}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 ${
        following
          ? 'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-red-500/50 hover:text-red-400'
          : 'bg-orange-500 text-white hover:bg-orange-400'
      }`}>
      {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
