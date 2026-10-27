'use client'

// Add, accept, cancel or remove a friend. Friends see each other's "I'll be here" plans by name; nothing else changes
// (there are still no private messages).

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { FriendState } from '@/lib/friends'

interface Props {
  state: FriendState
  meId: string | null
  otherId: string | null
  isRider: boolean
  name: string
  next: string
}

export default function FriendButton({ state, meId, otherId, isRider, name, next }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sure, setSure] = useState(false)

  if (state === 'self' || !otherId) return null
  if (state === 'closed') return <p className="text-[14px] text-muted">Friends open soon.</p>
  if (!meId) return <p className="text-[14px] text-muted"><Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="prose-link font-semibold">Sign in</Link> to add {name} as a friend.</p>
  if (!isRider) return <p className="text-[14px] text-muted"><Link href={`/me?next=${encodeURIComponent(next)}`} className="prose-link font-semibold">Finish your rider profile</Link> (16+) to add friends.</p>

  const run = async (op: 'add' | 'accept' | 'remove') => {
    setBusy(true); setError('')
    const supabase = createClient()
    const pair = `and(requester_id.eq.${meId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${meId})`
    const { error } = op === 'add'
      ? await supabase.from('friendships').insert({ requester_id: meId, addressee_id: otherId })
      : op === 'accept'
        ? await supabase.from('friendships').update({ status: 'accepted' }).eq('requester_id', otherId).eq('addressee_id', meId)
        : await supabase.from('friendships').delete().or(pair)
    setBusy(false)
    if (error) { setError(/30 friend requests/.test(error.message) ? 'That’s 30 requests today. Try again tomorrow.' : 'That didn’t go through. Refresh the page and try again.'); return }
    setSure(false)
    router.refresh()
  }

  return (
    <div>
      {state === 'none' && <button type="button" disabled={busy} onClick={() => run('add')} className="btn btn-curb">Add friend</button>}
      {state === 'outgoing' && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[15px] font-semibold">Friend request sent</span>
          <button type="button" disabled={busy} onClick={() => run('remove')} className="text-[14px] font-semibold text-pool hover:underline">Cancel it</button>
        </div>
      )}
      {state === 'incoming' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[15px] font-semibold">{name} wants to be friends</span>
          <button type="button" disabled={busy} onClick={() => run('accept')} className="btn btn-curb !py-2">Accept</button>
          <button type="button" disabled={busy} onClick={() => run('remove')} className="btn btn-ghost !py-2">Decline</button>
        </div>
      )}
      {state === 'friends' && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[15px] font-semibold">✓ Friends</span>
          {sure
            ? <>
                <button type="button" disabled={busy} onClick={() => run('remove')} className="text-[14px] font-semibold text-fire hover:underline">Yes, remove</button>
                <button type="button" onClick={() => setSure(false)} className="text-[14px] font-semibold text-muted hover:underline">Keep</button>
              </>
            : <button type="button" onClick={() => setSure(true)} className="text-[14px] font-semibold text-pool hover:underline">Remove friend</button>}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-[14px] font-semibold text-fire">{error}</p>}
    </div>
  )
}
