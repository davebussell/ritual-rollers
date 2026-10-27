'use client'

// Your rider profile: the name people see, what you ride, your city and spots, and whether you're open to
// riding with people. Confirming you're 16 or older is what lets you post and join sessions.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DISCIPLINES, LEVELS, type Level } from '@/lib/sports'
import type { Profile } from '@/lib/types'

export interface CityPick { slug: string; name: string; region: string }
export interface SpotPick { slug: string; name: string; city: string; hub: string | null }

const USERNAME = /^[a-z0-9_.]{3,24}$/

export default function ProfileForm({ userId, profile, cities, spots, next }: {
  userId: string; profile: Partial<Profile> | null; cities: CityPick[]; spots: SpotPick[]; next: string | null
}) {
  const router = useRouter()
  const confirmed = !!profile?.age_confirmed_at
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [username, setUsername] = useState(profile?.username?.startsWith('rider_') ? '' : profile?.username ?? '')
  const [birthYear, setBirthYear] = useState('')
  const [isAdult, setIsAdult] = useState(false)
  const [rides, setRides] = useState<string[]>(profile?.disciplines ?? [])
  const [level, setLevel] = useState<Level | ''>(profile?.level ?? '')
  const [city, setCity] = useState(profile?.home_city ?? '')
  const [homeSpots, setHomeSpots] = useState<string[]>(profile?.home_spots ?? [])
  const [open, setOpen] = useState(profile?.open_to_ride ?? true)
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState('')

  const cityName = cities.find(c => c.slug === city)?.name
  const citySpots = useMemo(() => spots.filter(s => s.hub === city), [spots, city])
  const year = new Date().getFullYear()

  const toggle = (list: string[], set: (v: string[]) => void, id: string, max = 99) =>
    set(list.includes(id) ? list.filter(x => x !== id) : list.length >= max ? list : [...list, id])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const u = username.trim().toLowerCase()
    if (!USERNAME.test(u)) { setError('Usernames are 3 to 24 characters: lowercase letters, numbers, dots and underscores.'); return }
    if (!displayName.trim()) { setError('Add the name people will see.'); return }
    if (!confirmed) {
      const y = parseInt(birthYear, 10)
      if (!y || !isAdult) { setError('Confirm the year you were born and that you’re 16 or older.'); return }
      if (year - y < 16) { setError('Accounts are for riders 16 and over. You can still browse spots, sessions and crews.'); return }
    }
    if (!rides.length) { setError('Pick at least one thing you ride.'); return }
    setState('saving')
    const { error } = await createClient().from('profiles').update({
      username: u,
      display_name: displayName.trim().slice(0, 40),
      disciplines: rides,
      level: level || null,
      home_city: city || null,
      home_spots: homeSpots.filter(s => citySpots.some(x => x.slug === s)).slice(0, 3),
      open_to_ride: open,
      bio: bio.trim().slice(0, 280) || null,
      ...(confirmed ? {} : { age_confirmed_at: new Date().toISOString() }),
    }).eq('id', userId)
    if (error) {
      setState('idle')
      if (error.code === '23505') setError('That username is taken. Try another.')
      else if (error.code === '42703' || error.code === 'PGRST204') setError('Rider profiles aren’t switched on yet. Try again soon.')
      else setError('Your profile didn’t save. Try again.')
      return
    }
    setState('saved')
    if (next) router.push(next)
    else router.refresh()
  }

  const signOut = async () => {
    await createClient().auth.signOut()
    window.location.href = '/'
  }

  return (
    <form onSubmit={save} className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="display" className="label">Name people see</label>
          <input id="display" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40} className="field" placeholder="First name, or a nickname" />
          <p className="hint mt-1">A first name and initial is plenty.</p>
        </div>
        <div>
          <label htmlFor="username" className="label">Username</label>
          <input id="username" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} maxLength={24} className="field" placeholder="e.g. kai.rolls" autoCapitalize="none" />
          <p className="hint mt-1">Your page will be ritualrollers.com/riders/{username || 'username'}</p>
        </div>
      </div>

      {!confirmed && (
        <fieldset className="panel p-4">
          <legend className="label px-1">Confirm your age</legend>
          <p className="text-[15px] text-asphalt-2">Accounts are for riders 16 and over, because sessions mean meeting people in person. We only keep the fact that you confirmed, not your birth year.</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <select value={birthYear} onChange={e => setBirthYear(e.target.value)} className="field !w-auto" aria-label="Year you were born">
              <option value="">Year you were born</option>
              {Array.from({ length: 90 }, (_, i) => year - 10 - i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <label className="flex items-center gap-2.5 text-[15px] font-semibold">
              <input type="checkbox" checked={isAdult} onChange={e => setIsAdult(e.target.checked)} className="h-5 w-5 accent-[#1F201C]" />
              I&apos;m 16 or older
            </label>
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="label">What you ride</legend>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.map(d => <button key={d.id} type="button" onClick={() => toggle(rides, setRides, d.id)} aria-pressed={rides.includes(d.id)} className="chip !py-1.5">{d.label}</button>)}
        </div>
      </fieldset>

      <div>
        <label htmlFor="level" className="label">How you ride</label>
        <select id="level" value={level} onChange={e => setLevel(e.target.value as Level | '')} className="field sm:!w-auto">
          <option value="">Rather not say</option>
          {LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}: {l.hint.toLowerCase()}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="city" className="label">City you ride in</label>
        <select id="city" value={city} onChange={e => { setCity(e.target.value); setHomeSpots([]) }} className="field">
          <option value="">Pick a city</option>
          {cities.map(c => <option key={c.slug} value={c.slug}>{c.name}, {c.region}</option>)}
        </select>
        <p className="hint mt-1">Pick the nearest. We never ask where you live.</p>
      </div>

      {citySpots.length > 0 && (
        <fieldset>
          <legend className="label">Spots you ride in {cityName} <span className="font-normal text-muted">(up to 3)</span></legend>
          <div className="flex flex-wrap gap-2">
            {citySpots.map(s => <button key={s.slug} type="button" onClick={() => toggle(homeSpots, setHomeSpots, s.slug, 3)} aria-pressed={homeSpots.includes(s.slug)} className="chip !py-1.5">{s.name}</button>)}
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor="bio" className="label">About you <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={280} rows={3} className="field" placeholder="Back on a board after ten years, mostly Saturday mornings, happy to ride with beginners." />
      </div>

      <label className="flex items-start gap-3 text-[16px]">
        <input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#1F201C]" />
        <span><span className="font-bold">List me on Riders.</span> <span className="text-asphalt-2">People in {cityName ?? 'your city'} can see your name, what you ride and your spots, and find you at sessions.</span></span>
      </label>

      {error && <p role="alert" className="rounded-lg bg-fire/10 px-4 py-3 font-semibold text-fire">{error}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={state === 'saving'} className="btn btn-curb !px-8 !py-3.5">{state === 'saving' ? 'Saving…' : 'Save profile'}</button>
        {state === 'saved' && <span role="status" className="font-semibold">Saved.</span>}
        <button type="button" onClick={signOut} className="ml-auto text-[15px] font-semibold text-muted hover:text-asphalt">Sign out</button>
      </div>
    </form>
  )
}
