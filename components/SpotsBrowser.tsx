'use client'

// Browse the featured index: filter by what you ride, kind of spot, region, style and level;
// flip between list and map. Filters live in the URL so a view is shareable.

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { List, Map as MapIcon } from 'lucide-react'
import { countryFlag } from '@/lib/format'
import { DISCIPLINES, DISCIPLINE_BY_ID, KIND_META, KINDS, KIND_GROUPS, FEATURE_LABEL, STYLE_LABEL, type Kind, type Style } from '@/lib/sports'
import { TRAVEL_REGIONS, filterSpots, type Country, type Skill } from '@/lib/spots-index'

const SpotsMap = dynamic(() => import('@/components/SpotsMap'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-zinc-900" /> })

const SELECT = 'min-w-0 rounded-md border-2 border-zinc-800 bg-zinc-950 px-3 py-2 font-body text-sm text-white outline-none focus:border-orange-500'

export default function SpotsBrowser() {
  const router = useRouter()
  const params = useSearchParams()
  const pick = <T extends string>(key: string, allowed: readonly T[]): T | null => {
    const v = params.get(key) as T | null
    return v && allowed.includes(v) ? v : null
  }
  const group = pick('group', ['skate', 'bike'] as const)
  const kind = pick<Kind>('kind', KINDS)
  const ride = pick('ride', DISCIPLINES.map(d => d.id))
  const country = pick<Country>('country', ['US', 'CA', 'MX'])
  const region = pick('region', TRAVEL_REGIONS.map(r => r.id))
  const style = pick<Style>('style', ['street', 'tranny', 'dirt'])
  const skill = pick<Skill>('skill', ['beginner', 'intermediate', 'advanced'])
  const indoor = params.get('indoor') === '1'
  const view = params.get('view') === 'map' ? 'map' : 'list'
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  const set = (key: string, value: string | null) => {
    const q = new URLSearchParams(params.toString())
    if (value) q.set(key, value); else q.delete(key)
    if (key === 'group') q.delete('kind')
    router.replace(`/spots?${q.toString()}`, { scroll: false })
  }

  const spots = useMemo(
    () => filterSpots({ group, kind, ride, country, travelRegion: region, style, skill, indoor }),
    [group, kind, ride, country, region, style, skill, indoor],
  )
  const kindOptions = group ? KIND_GROUPS.find(g => g.id === group)!.kinds : KINDS

  return (
    <div>
      {/* Group tabs */}
      <div className="flex flex-wrap gap-2">
        {([null, 'skate', 'bike'] as const).map(g => (
          <button key={g ?? 'all'} type="button" onClick={() => set('group', g)} aria-pressed={group === g}
            className={`rounded-md px-4 py-2 font-display text-lg font-bold uppercase tracking-wide transition-all active:scale-95 ${group === g ? 'bg-orange-500 text-white' : 'border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-white'}`}>
            {g === null ? 'Everything' : KIND_GROUPS.find(x => x.id === g)!.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select aria-label="Kind of spot" value={kind ?? ''} onChange={e => set('kind', e.target.value || null)} className={SELECT}>
          <option value="">Every kind of spot</option>
          {kindOptions.map(k => <option key={k} value={k}>{KIND_META[k].plural}</option>)}
        </select>
        <select aria-label="What you ride" value={ride ?? ''} onChange={e => set('ride', e.target.value || null)} className={SELECT}>
          <option value="">Anything on wheels</option>
          {DISCIPLINES.map(d => <option key={d.id} value={d.id}>{d.emoji} {d.label}</option>)}
        </select>
        <select aria-label="Region" value={region ?? ''} onChange={e => set('region', e.target.value || null)} className={SELECT}>
          <option value="">All regions</option>
          {TRAVEL_REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <select aria-label="Country" value={country ?? ''} onChange={e => set('country', e.target.value || null)} className={SELECT}>
          <option value="">Any country</option>
          <option value="CA">🇨🇦 Canada</option><option value="US">🇺🇸 United States</option><option value="MX">🇲🇽 Mexico</option>
        </select>
        <select aria-label="Style" value={style ?? ''} onChange={e => set('style', e.target.value || null)} className={SELECT}>
          <option value="">Any style</option>
          {(['street', 'tranny', 'dirt'] as Style[]).map(s => <option key={s} value={s}>{STYLE_LABEL[s]}</option>)}
        </select>
        <select aria-label="Level" value={skill ?? ''} onChange={e => set('skill', e.target.value || null)} className={SELECT}>
          <option value="">Any level</option>
          <option value="beginner">Learning</option><option value="intermediate">Solid</option><option value="advanced">Sending</option>
        </select>
        <label className="col-span-2 flex items-center gap-2 font-body text-sm text-zinc-500 sm:col-span-1">
          <input type="checkbox" checked={indoor} onChange={e => set('indoor', e.target.checked ? '1' : null)} className="h-4 w-4 accent-[#D9A21B]" />
          Indoor only
        </label>
        <div className="col-span-2 flex rounded-md border border-zinc-800 bg-zinc-950 p-0.5 sm:col-span-1 sm:ml-auto">
          <button type="button" onClick={() => set('view', null)} aria-pressed={view === 'list'}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 font-expedition text-[11px] uppercase tracking-[0.14em] ${view === 'list' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-white'}`}>
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button type="button" onClick={() => set('view', 'map')} aria-pressed={view === 'map'}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 font-expedition text-[11px] uppercase tracking-[0.14em] ${view === 'map' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-white'}`}>
            <MapIcon className="h-3.5 w-3.5" /> Map
          </button>
        </div>
      </div>
      <p className="mt-3 font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">{spots.length} spot{spots.length === 1 ? '' : 's'}</p>

      {view === 'map' ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="h-[460px] overflow-hidden rounded-xl border border-zinc-800 sm:h-[560px]">
            <SpotsMap spots={spots} activeSlug={activeSlug} onSelect={setActiveSlug} />
          </div>
          <ul className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {spots.map(s => (
              <li key={s.slug}>
                <Link href={`/spots/${s.slug}`} onMouseEnter={() => setActiveSlug(s.slug)}
                  className={`block rounded-md border bg-zinc-950 px-3 py-2 transition-colors ${activeSlug === s.slug ? 'border-orange-500' : 'border-zinc-800 hover:border-zinc-700'}`}>
                  <p className="font-display text-lg font-bold uppercase tracking-[0.02em] text-white">{countryFlag(s.country)} {s.name}</p>
                  <p className="font-body text-xs text-zinc-500">{KIND_META[s.kind].label} · {s.city}, {s.region}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {spots.map(s => (
            <li key={s.slug}>
              <Link href={`/spots/${s.slug}`} className="group block h-full rounded-md border border-zinc-800 bg-zinc-950 p-4 transition-all hover:border-orange-500">
                <p className="font-expedition text-[10px] uppercase tracking-[0.18em]" style={{ color: KIND_META[s.kind].color }}>
                  {KIND_META[s.kind].label}{s.indoor ? ' · indoor' : ''} · {countryFlag(s.country)} {s.region}
                </p>
                <p className="mt-0.5 font-display text-2xl font-bold uppercase tracking-[0.02em] text-white group-hover:text-orange-500">{s.name}</p>
                <p className="font-body text-xs text-zinc-500">{s.city}</p>
                <p className="mt-2 line-clamp-3 font-body text-sm text-zinc-400">{s.why}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {s.features.slice(0, 4).map(f => <span key={f} className="tag px-1.5 py-0.5 text-[10px] tracking-wider">{FEATURE_LABEL[f] ?? f}</span>)}
                </div>
                <p className="mt-2 font-expedition text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                  {s.disciplines.map(d => DISCIPLINE_BY_ID[d]?.short ?? d).join(' · ')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {spots.length === 0 && (
        <p className="mt-6 rounded-md border border-dashed border-zinc-700 p-6 font-body text-sm text-zinc-500">
          Nothing featured matches those filters — loosen one, or{' '}
          <Link href="/scout" className="text-teal-700 hover:underline">check a town</Link> to see every mapped park around it.
        </p>
      )}
    </div>
  )
}
