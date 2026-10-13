'use client'

// Browse the index: filter by sport, region, month and level; flip between list and map.

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { List, Map as MapIcon } from 'lucide-react'
import { SPORTS, SPORT_BY_ID, FAMILY_META, countryFlag } from '@/lib/sports'
import { MONTHS, TRAVEL_REGIONS, filterSpots, type Country, type Month, type Skill } from '@/lib/spots-index'

const SpotsMap = dynamic(() => import('@/components/SpotsMap'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-zinc-900" /> })

const SELECT = 'rounded-md border-2 border-zinc-800 bg-zinc-950 px-3 py-2 font-body text-sm text-white outline-none focus:border-orange-500'

export default function SpotsBrowser() {
  const router = useRouter()
  const params = useSearchParams()
  const sport = params.get('sport') && SPORT_BY_ID[params.get('sport')!] ? params.get('sport') : null
  const country = (['US', 'CA', 'MX'] as const).includes(params.get('country') as Country) ? (params.get('country') as Country) : null
  const region = TRAVEL_REGIONS.some(r => r.id === params.get('region')) ? params.get('region') : null
  const month = (MONTHS as string[]).includes(params.get('month') ?? '') ? (params.get('month') as Month) : null
  const skill = (['beginner', 'intermediate', 'advanced'] as const).includes(params.get('skill') as Exclude<Skill, 'all'>) ? (params.get('skill') as Skill) : null
  const view = params.get('view') === 'map' ? 'map' : 'list'
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  const set = (key: string, value: string | null) => {
    const q = new URLSearchParams(params.toString())
    if (value) q.set(key, value); else q.delete(key)
    router.replace(`/spots?${q.toString()}`)
  }

  const spots = useMemo(() => filterSpots({ sport, country, travelRegion: region, month, skill }), [sport, country, region, month, skill])

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Sport" value={sport ?? ''} onChange={e => set('sport', e.target.value || null)} className={SELECT}>
          <option value="">Every sport</option>
          {SPORTS.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
        </select>
        <select aria-label="Region" value={region ?? ''} onChange={e => set('region', e.target.value || null)} className={SELECT}>
          <option value="">All of North America</option>
          {TRAVEL_REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <select aria-label="Country" value={country ?? ''} onChange={e => set('country', e.target.value || null)} className={SELECT}>
          <option value="">Any country</option>
          <option value="US">🇺🇸 United States</option><option value="CA">🇨🇦 Canada</option><option value="MX">🇲🇽 Mexico</option>
        </select>
        <select aria-label="Month" value={month ?? ''} onChange={e => set('month', e.target.value || null)} className={SELECT}>
          <option value="">Any month</option>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select aria-label="Level" value={skill ?? ''} onChange={e => set('skill', e.target.value || null)} className={SELECT}>
          <option value="">Any level</option>
          <option value="beginner">Learning</option><option value="intermediate">Solid</option><option value="advanced">Sending</option>
        </select>
        <div className="ml-auto flex rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
          <button type="button" onClick={() => set('view', null)} aria-pressed={view === 'list'}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-expedition text-[11px] uppercase tracking-[0.14em] ${view === 'list' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-white'}`}>
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button type="button" onClick={() => set('view', 'map')} aria-pressed={view === 'map'}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-expedition text-[11px] uppercase tracking-[0.14em] ${view === 'map' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-white'}`}>
            <MapIcon className="h-3.5 w-3.5" /> Map
          </button>
        </div>
      </div>
      <p className="mt-3 font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">{spots.length} spot{spots.length === 1 ? '' : 's'}</p>

      {view === 'map' ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="h-[560px] overflow-hidden rounded-xl border border-zinc-800">
            <SpotsMap spots={spots} activeSlug={activeSlug} onSelect={setActiveSlug} />
          </div>
          <ul className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {spots.map(s => (
              <li key={s.slug}>
                <Link href={`/spots/${s.slug}`} onMouseEnter={() => setActiveSlug(s.slug)}
                  className={`block rounded-md border bg-zinc-950 px-3 py-2 transition-colors ${activeSlug === s.slug ? 'border-orange-500' : 'border-zinc-800 hover:border-zinc-700'}`}>
                  <p className="font-display text-lg font-bold uppercase tracking-[0.02em] text-white">{countryFlag(s.country)} {s.name}</p>
                  <p className="font-body text-xs text-zinc-500">{s.region} · {s.sports.map(id => SPORT_BY_ID[id]?.emoji).join(' ')}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {spots.map(s => {
            const fam = SPORT_BY_ID[s.sports[0]]?.family ?? 'water'
            return (
              <li key={s.slug}>
                <Link href={`/spots/${s.slug}`} className="group block h-full rounded-md border border-zinc-800 bg-zinc-950 p-4 transition-all hover:border-orange-500">
                  <p className="font-expedition text-[10px] uppercase tracking-[0.18em]" style={{ color: FAMILY_META[fam].color }}>{countryFlag(s.country)} {s.region}</p>
                  <p className="mt-0.5 font-display text-2xl font-bold uppercase tracking-[0.02em] text-white group-hover:text-orange-500">{s.name}</p>
                  <p className="font-body text-xs text-zinc-500">{s.venueType} · {s.nearestTown}</p>
                  <p className="mt-2 line-clamp-2 font-body text-sm text-zinc-400">{s.why}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {s.sports.map(id => <span key={id} className="tag px-1.5 py-0.5 text-[10px] tracking-wider">{SPORT_BY_ID[id]?.emoji} {SPORT_BY_ID[id]?.label}</span>)}
                  </div>
                  <p className="mt-2 font-expedition text-[10px] uppercase tracking-[0.14em] text-zinc-600">{s.bestMonths.join(' · ')}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {spots.length === 0 && (
        <p className="mt-6 rounded-md border border-dashed border-zinc-700 p-6 font-body text-sm text-zinc-500">
          Nothing established matches those filters. We only list spots where the sport is truly established — loosen a filter to see more.
        </p>
      )}
    </div>
  )
}
