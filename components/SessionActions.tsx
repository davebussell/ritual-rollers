'use client'

// "I'm in", comments and the host's cancel button on a session page.

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SessionComment } from '@/lib/types'
import { Avatar, riderName } from '@/components/bits'

type Gate = 'ok' | 'signin' | 'setup' | 'sample' | 'closed'

function GateNote({ gate, next }: { gate: Gate; next: string }) {
  if (gate === 'signin') return <p className="mt-2 text-[14px] text-muted"><Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="prose-link font-semibold">Sign in</Link> to say you&apos;re in.</p>
  if (gate === 'setup') return <p className="mt-2 text-[14px] text-muted"><Link href={`/me?next=${encodeURIComponent(next)}`} className="prose-link font-semibold">Finish your rider profile</Link> (16+) to join sessions.</p>
  if (gate === 'sample') return <p className="mt-2 text-[14px] text-muted">This is a sample, so it can&apos;t be joined.</p>
  if (gate === 'closed') return <p className="mt-2 text-[14px] text-muted">Joining opens once sessions are switched on.</p>
  return null
}

export function ImIn({ sessionId, userId, initialIn, gate, isHost }: { sessionId: string; userId: string | null; initialIn: boolean; gate: Gate; isHost: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const next = `/sessions/${sessionId}`

  if (isHost) return <p className="text-[15px] font-semibold">You&apos;re hosting this one.</p>

  const toggle = async () => {
    if (gate !== 'ok' || !userId) return
    setBusy(true); setError('')
    const supabase = createClient()
    const { error } = initialIn
      ? await supabase.from('ride_session_riders').delete().eq('session_id', sessionId).eq('rider_id', userId)
      : await supabase.from('ride_session_riders').insert({ session_id: sessionId, rider_id: userId })
    setBusy(false)
    if (error) { setError('That didn’t go through. Refresh the page and try again.'); return }
    router.refresh()
  }

  return (
    <div>
      <button type="button" onClick={toggle} disabled={busy || gate !== 'ok'} aria-pressed={initialIn}
        className={`btn w-full !py-3.5 !text-[17px] ${initialIn ? 'btn-ghost' : 'btn-curb'}`}>
        {initialIn ? 'You’re in. Tap to drop out' : 'I’m in'}
      </button>
      <GateNote gate={gate} next={next} />
      {error && <p role="alert" className="mt-2 text-[14px] font-semibold text-fire">{error}</p>}
    </div>
  )
}

export function Comments({ sessionId, userId, comments, gate, hostUsername, myUsername }: {
  sessionId: string; userId: string | null; comments: SessionComment[]; gate: Gate; hostUsername: string; myUsername: string | null
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isHost = !!myUsername && myUsername === hostUsername

  const post = async (e: React.FormEvent) => {
    e.preventDefault()
    if (gate !== 'ok' || !userId || !body.trim()) return
    setBusy(true); setError('')
    const { error } = await createClient().from('ride_session_comments').insert({ session_id: sessionId, rider_id: userId, body: body.trim().slice(0, 500) })
    setBusy(false)
    if (error) { setError('Your comment didn’t post. Try again.'); return }
    setBody('')
    router.refresh()
  }

  const remove = async (id: string) => {
    await createClient().from('ride_session_comments').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      {comments.length > 0 ? (
        <ul className="rows">
          {comments.map(c => (
            <li key={c.id} className="flex gap-3 py-3.5">
              <Avatar name={riderName(c.rider)} url={c.rider.avatar_url} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px]"><Link href={`/riders/${c.rider.username}`} className="font-bold hover:underline">{riderName(c.rider)}</Link>
                  {c.rider.username === hostUsername && <span className="ml-2 tag tag-line">Host</span>}</p>
                <p className="mt-0.5 whitespace-pre-line text-[15px]">{c.body}</p>
              </div>
              {(myUsername === c.rider.username || isHost) && (
                <button type="button" onClick={() => remove(c.id)} className="self-start text-[13px] font-semibold text-muted hover:text-fire">Delete</button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-muted">No comments yet. Ask where people meet, what to bring, or if it&apos;s still on.</p>
      )}
      {gate === 'ok' ? (
        <form onSubmit={post} className="mt-4">
          <label htmlFor="comment" className="sr-only">Add a comment</label>
          <textarea id="comment" value={body} onChange={e => setBody(e.target.value)} maxLength={500} rows={3} className="field" placeholder="Add a comment" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="hint">Public. Don&apos;t share phone numbers or addresses.</span>
            <button type="submit" disabled={busy || !body.trim()} className="btn btn-dark !py-2.5">Post comment</button>
          </div>
          {error && <p role="alert" className="mt-2 text-[14px] font-semibold text-fire">{error}</p>}
        </form>
      ) : (
        <GateNote gate={gate} next={`/sessions/${sessionId}`} />
      )}
    </div>
  )
}

export function CancelSession({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const cancel = async () => {
    setBusy(true)
    await createClient().from('ride_sessions').update({ cancelled: true }).eq('id', sessionId)
    setBusy(false)
    router.refresh()
  }
  if (!confirming) return <button type="button" onClick={() => setConfirming(true)} className="text-[14px] font-semibold text-muted hover:text-fire">Cancel this session</button>
  return (
    <div className="flex flex-wrap items-center gap-3 text-[14px]">
      <span>Cancel it for everyone who&apos;s in?</span>
      <button type="button" onClick={cancel} disabled={busy} className="font-bold text-fire">Yes, cancel</button>
      <button type="button" onClick={() => setConfirming(false)} className="font-semibold text-muted">Keep it</button>
    </div>
  )
}
