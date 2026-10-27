'use client'

// "Add your crew" / "Send an update": goes to the Netlify Form `crew` (public/__forms.html), which emails the
// site owner. Someone checks it and adds it to the directory.

import { useState } from 'react'
import { AUDIENCES, DISCIPLINES } from '@/lib/sports'

export default function CrewForm({ update, cityName }: { update?: { slug: string; name: string } | null; cityName?: string }) {
  const [rides, setRides] = useState<string[]>([])
  const [who, setWho] = useState<string[]>([])
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter(x => x !== id) : [...list, id])

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setState('sending')
    const data = new FormData(e.currentTarget)
    data.set('rides', rides.join(', '))
    data.set('who', who.join(', '))
    const body = new URLSearchParams(data as unknown as Record<string, string>)
    try {
      const res = await fetch('/__forms.html', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div className="panel p-6">
        <p className="text-[19px] font-extrabold">Thanks, we&apos;ve got it.</p>
        <p className="mt-2 text-[16px] text-asphalt-2">We check every crew before it goes up, usually within a few days. If you left an email, we&apos;ll write if anything&apos;s unclear.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <input type="hidden" name="form-name" value="crew" />
      <input type="hidden" name="update" value={update?.slug ?? ''} />
      <p className="hidden"><label>Leave this empty <input name="company" tabIndex={-1} autoComplete="off" /></label></p>

      <div>
        <label htmlFor="name" className="label">Crew or group name</label>
        <input id="name" name="name" required defaultValue={update?.name ?? ''} className="field" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="city" className="label">City or town</label>
          <input id="city" name="city" required defaultValue={cityName ?? ''} className="field" />
        </div>
        <div>
          <label htmlFor="link" className="label">Your public page</label>
          <input id="link" name="link" type="url" required placeholder="https://instagram.com/…" className="field" />
        </div>
      </div>
      <fieldset>
        <legend className="label">What you ride</legend>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.map(d => <button key={d.id} type="button" onClick={() => toggle(rides, setRides, d.id)} aria-pressed={rides.includes(d.id)} className="chip !py-1.5">{d.label}</button>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Who it&apos;s for</legend>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map(a => <button key={a.id} type="button" onClick={() => toggle(who, setWho, a.id)} aria-pressed={who.includes(a.id)} className="chip !py-1.5">{a.label}</button>)}
        </div>
      </fieldset>
      <div>
        <label htmlFor="meets" className="label">When and where you meet</label>
        <input id="meets" name="meets" placeholder="Thursdays at 6 pm, the bowl at …" className="field" />
      </div>
      <div>
        <label htmlFor="about" className="label">{update ? 'What should change?' : 'Tell people what a session is like'}</label>
        <textarea id="about" name="about" rows={4} maxLength={1500} required className="field" />
      </div>
      <div>
        <label htmlFor="email" className="label">Your email <span className="font-normal text-muted">(optional, never shown)</span></label>
        <input id="email" name="email" type="email" className="field" />
        <p className="hint mt-1">Only so we can ask a question if we need to.</p>
      </div>
      {state === 'error' && <p role="alert" className="rounded-lg bg-fire/10 px-4 py-3 font-semibold text-fire">That didn&apos;t send. Try again in a minute.</p>}
      <button type="submit" disabled={state === 'sending'} className="btn btn-curb !px-8 !py-3.5">{update ? 'Send update' : 'Send crew'}</button>
    </form>
  )
}
