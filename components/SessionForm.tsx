'use client'

// Post a session: where (a featured spot or a mapped park), when, who it's for, what you ride.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DISCIPLINES, LEVELS, type Level } from '@/lib/sports'

export interface PlaceOption {
  key: string              // spot:<slug> or park:<id>
  name: string
  where: string            // "Ottawa, Ontario"
  lat: number
  lng: number
  city: string | null      // hub slug
  disciplines: string[]
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SessionForm({ userId, places, initial, myDisciplines }: {
  userId: string; places: PlaceOption[]; initial: PlaceOption | null; myDisciplines: string[]
}) {
  const router = useRouter()
  const [place, setPlace] = useState<PlaceOption | null>(initial)
  const [q, setQ] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState<Level | 'all'>('all')
  const [beginners, setBeginners] = useState(true)
  const [rides, setRides] = useState<string[]>(() => {
    const base = initial?.disciplines ?? []
    const mine = myDisciplines.filter(d => !base.length || base.includes(d))
    return mine.length ? mine : base.slice(0, 3)
  })
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const matches = useMemo(() => {
    const f = fold(q.trim())
    if (f.length < 2) return []
    return places.filter(p => fold(`${p.name} ${p.where}`).includes(f)).slice(0, 8)
  }, [q, places])

  const choose = (p: PlaceOption) => {
    setPlace(p); setQ('')
    if (!rides.length) setRides(p.disciplines.filter(d => myDisciplines.includes(d)).slice(0, 3))
  }
  const toggleRide = (id: string) => setRides(r => r.includes(id) ? r.filter(x => x !== id) : [...r, id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!place) { setError('Pick the spot you’re riding.'); return }
    if (!date || !time) { setError('Pick a day and a time.'); return }
    // The time is the wall-clock time at the spot; turn it into an instant with the spot's rough offset
    // (longitude / 15 hours), the same rule the rest of the site uses for "today" at a spot.
    const startsAt = new Date(Date.parse(`${date}T${time}:00Z`) - Math.round(place.lng / 15) * 3600_000)
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 30 * 60_000) { setError('That time has already passed. Pick a time that’s coming up.'); return }
    if (title.trim().length < 3) { setError('Give the session a short title, like “Saturday morning session”.'); return }
    if (!rides.length) { setError('Say what people can ride.'); return }
    setBusy(true)
    const [kind, ref] = place.key.split(':')
    const { data, error } = await createClient().from('ride_sessions').insert({
      host_id: userId,
      title: title.trim().slice(0, 80),
      notes: notes.trim() ? notes.trim().slice(0, 1000) : null,
      spot_slug: kind === 'spot' ? ref : null,
      park_id: kind === 'park' ? ref : null,
      place_name: place.name,
      city: place.city,
      lat: place.lat,
      lng: place.lng,
      starts_at: startsAt.toISOString(),
      starts_local: `${date}T${time}`,
      disciplines: rides,
      level,
      beginners_welcome: beginners,
    }).select('id').single()
    setBusy(false)
    if (error || !data) { setError(error?.message?.includes('6 sessions') ? 'You can post up to 6 sessions a day.' : 'The session didn’t post. Check the details and try again.'); return }
    router.push(`/sessions/${data.id}`)
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <fieldset>
        <legend className="label">Where</legend>
        {place ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-asphalt bg-flyer px-4 py-3">
            <div><p className="font-extrabold">{place.name}</p><p className="text-[14px] text-muted">{place.where}</p></div>
            <button type="button" onClick={() => setPlace(null)} className="text-[14px] font-semibold text-pool hover:underline">Change</button>
          </div>
        ) : (
          <div>
            <input value={q} onChange={e => setQ(e.target.value)} className="field" placeholder="Search spots by name or city" aria-label="Search spots" />
            {matches.length > 0 && (
              <ul className="rows panel mt-2 px-3">
                {matches.map(p => (
                  <li key={p.key}><button type="button" onClick={() => choose(p)} className="block w-full py-2.5 text-left">
                    <span className="font-bold">{p.name}</span> <span className="text-[14px] text-muted">{p.where}</span>
                  </button></li>
                ))}
              </ul>
            )}
            <p className="hint mt-2">Not in the list? Find it on its city page under every mapped park, and post from there.</p>
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="label">Day</label>
          <input id="date" type="date" min={todayLocal()} value={date} onChange={e => setDate(e.target.value)} className="field" required />
        </div>
        <div>
          <label htmlFor="time" className="label">Time</label>
          <input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} className="field" required />
          <p className="hint mt-1">Local time at the spot.</p>
        </div>
      </div>

      <div>
        <label htmlFor="title" className="label">Title</label>
        <input id="title" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} className="field" placeholder="Saturday morning session" required />
      </div>

      <fieldset>
        <legend className="label">What people can ride</legend>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.map(d => (
            <button key={d.id} type="button" onClick={() => toggleRide(d.id)} aria-pressed={rides.includes(d.id)} className="chip !py-1.5">{d.label}</button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Who it&apos;s for</legend>
        <select value={level} onChange={e => setLevel(e.target.value as Level | 'all')} className="field sm:!w-auto" aria-label="Level">
          <option value="all">All levels</option>
          {LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}: {l.hint.toLowerCase()}</option>)}
        </select>
        <label className="mt-3 flex items-center gap-2.5 text-[15px] font-semibold">
          <input type="checkbox" checked={beginners} onChange={e => setBeginners(e.target.checked)} className="h-5 w-5 accent-[#1F201C]" />
          Beginners welcome
        </label>
      </fieldset>

      <div>
        <label htmlFor="notes" className="label">Notes <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} rows={4} className="field"
          placeholder="Where you'll be in the park, what to bring, how long you're staying." />
        <p className="hint mt-1">Public. Meet at the spot; don&apos;t post phone numbers or addresses.</p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-fire/10 px-4 py-3 font-semibold text-fire">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-curb !px-8 !py-3.5 !text-[17px]">{busy ? 'Posting…' : 'Post session'}</button>
    </form>
  )
}
