'use client'

// "Burnside, Saturday, skate, solid — who's in?" Writes to crew_calls (phase 2/3 migration).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DISCIPLINES } from '@/lib/sports'

interface Props {
  placeSlug: string
  placeName: string
  lat: number
  lng: number
  defaultSport?: string | null
  signedIn: boolean
}

export default function RollCallForm({ placeSlug, placeName, lat, lng, defaultSport, signedIn }: Props) {
  const router = useRouter()
  const [sport, setSport] = useState(defaultSport ?? '')
  const [starts, setStarts] = useState('')
  const [ends, setEnds] = useState('')
  const [level, setLevel] = useState('all')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!signedIn) {
    return (
      <p className="font-body text-sm text-zinc-500">
        <a href="/auth/login" className="font-semibold text-teal-700 hover:underline">Sign in</a> to post a roll call for {placeName}.
      </p>
    )
  }
  if (done) return <p className="font-body text-sm text-white">Roll call posted. Anyone checking {placeName} will see it.</p>

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sport || !starts || !ends) { setError('Pick what you ride and your dates.'); return }
    setBusy(true); setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sign in first.'); setBusy(false); return }
    const { error: err } = await supabase.from('crew_calls').insert({
      owner_id: user.id, place_slug: placeSlug, place_name: placeName, lat, lng,
      sport, starts_on: starts, ends_on: ends, level, note: note.trim() || null,
    })
    setBusy(false)
    if (err) {
      setError(/does not exist|relation/i.test(err.message) ? 'Roll calls open soon — the crew tables aren\'t live yet.' : err.message)
      return
    }
    setDone(true)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <select aria-label="What you ride" value={sport} onChange={e => setSport(e.target.value)} required
        className="rounded-md border-2 border-zinc-800 bg-zinc-950 px-3 py-2 font-body text-sm text-white outline-none focus:border-orange-500">
        <option value="">Riding…</option>
        {DISCIPLINES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
      </select>
      <input type="date" aria-label="From" value={starts} onChange={e => setStarts(e.target.value)} required
        className="rounded-md border-2 border-zinc-800 bg-zinc-950 px-3 py-2 font-body text-sm text-white outline-none focus:border-orange-500" />
      <input type="date" aria-label="To" value={ends} min={starts || undefined} onChange={e => setEnds(e.target.value)} required
        className="rounded-md border-2 border-zinc-800 bg-zinc-950 px-3 py-2 font-body text-sm text-white outline-none focus:border-orange-500" />
      <select aria-label="Level" value={level} onChange={e => setLevel(e.target.value)}
        className="rounded-md border-2 border-zinc-800 bg-zinc-950 px-3 py-2 font-body text-sm text-white outline-none focus:border-orange-500">
        <option value="all">All levels</option><option value="beginner">Learning</option><option value="intermediate">Solid</option><option value="advanced">Sending</option>
      </select>
      <input aria-label="Note" value={note} onChange={e => setNote(e.target.value)} maxLength={140} placeholder="Note for the crew (optional)"
        className="rounded-md border-2 border-zinc-800 bg-zinc-950 px-3 py-2 font-body text-sm text-white placeholder:text-zinc-600 outline-none focus:border-orange-500 sm:col-span-3" />
      <button type="submit" disabled={busy}
        className="tx-stitch relative rounded-md bg-forest px-4 py-2 font-display text-base font-bold uppercase tracking-wide text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50">
        {busy ? 'Posting…' : 'Who\'s in?'}
      </button>
      {error && <p className="font-body text-sm text-[#A3271F] sm:col-span-4">{error}</p>}
    </form>
  )
}
