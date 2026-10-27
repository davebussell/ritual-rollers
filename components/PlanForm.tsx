'use client'

// "I'll be here": pick a day (the next week, at the spot) and a rough time. Only friends see it's you.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { localToday, addDays, sessionDate } from '@/lib/format'
import { planExpiry, type PlanPart } from '@/lib/plans-shared'

interface Place { spot: string | null; park: string | null; name: string; city: string | null; lat: number; lng: number }

const PARTS: { id: PlanPart; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'time', label: 'At a time' },
]

export function PlanForm({ meId, place, hasPlans }: { meId: string; place: Place; hasPlans: boolean }) {
  const router = useRouter()
  const today = localToday(place.lng)
  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i))
  const [open, setOpen] = useState(false)
  const [day, setDay] = useState(today)
  const [part, setPart] = useState<PlanPart>('afternoon')
  const [at, setAt] = useState('17:00')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-curb">
        {hasPlans ? 'Add another day' : 'I’ll be here'}
      </button>
    )
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await createClient().from('ride_plans').insert({
      rider_id: meId, spot_slug: place.spot, park_id: place.park, place_name: place.name, city: place.city,
      lat: place.lat, lng: place.lng, day, part, at_local: part === 'time' ? at : null,
      note: note.trim() ? note.trim().slice(0, 140) : null, expires_at: planExpiry(day, place.lng),
    })
    setBusy(false)
    if (error) { setError(/up to 10 plans/.test(error.message) ? 'You already have 10 plans coming up. Remove one first.' : 'That didn’t save. Refresh the page and try again.'); return }
    setOpen(false); setNote('')
    router.refresh()
  }

  return (
    <form onSubmit={save} className="panel max-w-xl p-4 sm:p-5">
      <fieldset>
        <legend className="text-[15px] font-bold">Which day?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {days.map((d, i) => {
            const s = sessionDate(`${d}T12:00`, place.lng)
            return (
              <button key={d} type="button" onClick={() => setDay(d)} aria-pressed={day === d}
                className={`chip ${day === d ? '!bg-asphalt !text-flyer' : ''}`}>{i < 2 ? s.relative : `${s.weekday} ${s.day}`}</button>
            )
          })}
        </div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="text-[15px] font-bold">When?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PARTS.map(p => (
            <button key={p.id} type="button" onClick={() => setPart(p.id)} aria-pressed={part === p.id}
              className={`chip ${part === p.id ? '!bg-asphalt !text-flyer' : ''}`}>{p.label}</button>
          ))}
          {part === 'time' && (
            <input type="time" value={at} onChange={e => setAt(e.target.value)} required className="field !w-auto !py-1.5" aria-label="Time" />
          )}
        </div>
      </fieldset>
      <label className="mt-4 block text-[15px] font-bold" htmlFor="plan-note">A note for your friends <span className="font-normal text-muted">(optional)</span></label>
      <input id="plan-note" value={note} onChange={e => setNote(e.target.value)} maxLength={140} placeholder="Working on drop-ins, come say hi"
        className="field mt-1.5 w-full" />
      <p className="mt-3 text-[13px] text-muted">Only your friends see it’s you. Everyone else sees a count. It disappears after that day.</p>
      {error && <p role="alert" className="mt-2 text-[14px] font-semibold text-fire">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy} className="btn btn-curb">Save</button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">Cancel</button>
      </div>
    </form>
  )
}

export function RemovePlan({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" disabled={busy} className="text-[13px] font-semibold text-pool hover:underline"
      onClick={async () => { setBusy(true); await createClient().from('ride_plans').delete().eq('id', id); router.refresh() }}>
      Remove
    </button>
  )
}
