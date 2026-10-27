'use client'

// Browse the featured spots: filter by what you ride, kind of spot, region, style and level; flip between
// list and map. Filters live in the URL so a view can be shared.

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DISCIPLINES, KIND_META, KINDS, KIND_GROUPS, FEATURE_LABEL, STYLE_LABEL, type Kind, type Style } from '@/lib/sports'
import { TRAVEL_REGIONS, filterSpots, type Country, type Skill } from '@/lib/spots-index'

const PinsMap = dynamic(() => import('@/components/PinsMap'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-concrete-2" /> })

const SELECT = 'field !w-auto min-w-0 !rounded-full !py-2 !text-[15px] font-semibold'

export default function SpotsBrowser({ wheelDisciplines }: { wheelDisciplines?: string[] }) {
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

  // The wheel picked in the header narrows everything first
  const spots = useMemo(
    () => filterSpots({ group, kind, ride, country, travelRegion: region, style, skill, indoor })
      .filter(s => !wheelDisciplines || s.disciplines.some(d => wheelDisciplines.includes(d))),
    [group, kind, ride, country, region, style, skill, indoor, wheelDisciplines],
  )
  const present = useMemo(() => new Set(filterSpots({}).filter(s => !wheelDisciplines || s.disciplines.some(d => wheelDisciplines.includes(d))).map(s => s.kind)), [wheelDisciplines])
  const kindOptions = (group ? KIND_GROUPS.find(g => g.id === group)!.kinds : KINDS).filter(k => present.has(k))
  const rideOptions = DISCIPLINES.filter(d => !wheelDisciplines || wheelDisciplines.includes(d.id))
  const groups = KIND_GROUPS.filter(g => g.kinds.some(k => present.has(k)))
  const pins = useMemo(() => spots.map(s => ({
    id: s.slug, lat: s.lat, lng: s.lng, title: s.name, sub: `${KIND_META[s.kind].label} in ${s.city}`,
    href: `/spots/${s.slug}`, linkLabel: 'See the spot', color: KIND_META[s.kind].color, big: true,
  })), [spots])

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Kind of spot">
        {groups.length > 1 && ([null, ...groups.map(g => g.id)] as const).map(g => (
          <button key={g ?? 'all'} type="button" onClick={() => set('group', g)} aria-pressed={group === g} className="chip !px-4 !py-2 !text-[15px]">
            {g === null ? 'Every kind' : KIND_GROUPS.find(x => x.id === g)!.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select aria-label="Kind of spot" value={kind ?? ''} onChange={e => set('kind', e.target.value || null)} className={SELECT}>
          <option value="">Every kind</option>
          {kindOptions.map(k => <option key={k} value={k}>{KIND_META[k].plural}</option>)}
        </select>
        <select aria-label="What you ride" value={ride ?? ''} onChange={e => set('ride', e.target.value || null)} className={SELECT}>
          <option value="">{wheelDisciplines ? 'Any of these' : 'Anything on wheels'}</option>
          {rideOptions.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        <select aria-label="Region" value={region ?? ''} onChange={e => set('region', e.target.value || null)} className={SELECT}>
          <option value="">All regions</option>
          {TRAVEL_REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <select aria-label="Country" value={country ?? ''} onChange={e => set('country', e.target.value || null)} className={SELECT}>
          <option value="">Any country</option>
          <option value="CA">Canada</option><option value="US">United States</option><option value="MX">Mexico</option>
        </select>
        <select aria-label="Style" value={style ?? ''} onChange={e => set('style', e.target.value || null)} className={SELECT}>
          <option value="">Any style</option>
          {(['street', 'tranny', 'dirt'] as Style[]).map(s => <option key={s} value={s}>{STYLE_LABEL[s]}</option>)}
        </select>
        <select aria-label="Level" value={skill ?? ''} onChange={e => set('skill', e.target.value || null)} className={SELECT}>
          <option value="">Any level</option>
          <option value="beginner">Good for learning</option><option value="intermediate">Comfortable</option><option value="advanced">Advanced</option>
        </select>
        <label className="flex items-center gap-2 px-2 text-[15px] font-semibold">
          <input type="checkbox" checked={indoor} onChange={e => set('indoor', e.target.checked ? '1' : null)} className="h-4 w-4 accent-[#1F201C]" />
          Indoor only
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-[15px] font-semibold text-muted">{spots.length} {spots.length === 1 ? 'spot' : 'spots'}</p>
        <div className="flex gap-1" role="group" aria-label="View">
          <button type="button" onClick={() => set('view', null)} aria-pressed={view === 'list'} className="chip">List</button>
          <button type="button" onClick={() => set('view', 'map')} aria-pressed={view === 'map'} className="chip">Map</button>
        </div>
      </div>

      {view === 'map' ? (
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="panel h-[460px] overflow-hidden sm:h-[580px]">
            <PinsMap pins={pins} activeId={activeSlug} onSelect={setActiveSlug} label="Map of featured spots" />
          </div>
          <ul className="rows panel max-h-[580px] overflow-y-auto px-4">
            {spots.map(s => (
              <li key={s.slug}>
                <Link href={`/spots/${s.slug}`} onMouseEnter={() => setActiveSlug(s.slug)} className={`block py-3 ${activeSlug === s.slug ? 'underline underline-offset-4' : ''}`}>
                  <span className="block text-[15px] font-extrabold">{s.name}</span>
                  <span className="block text-[13px] text-muted">{KIND_META[s.kind].label} in {s.city}, {s.region}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="rows panel mt-3 px-4 sm:px-6">
          {spots.map(s => (
            <li key={s.slug}>
              <Link href={`/spots/${s.slug}`} className="group grid gap-x-6 gap-y-1 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <div className="flex gap-3">
                  <span aria-hidden="true" className="mt-1.5 h-3 w-3 shrink-0 rounded-[3px]" style={{ background: KIND_META[s.kind].color }} />
                  <div>
                    <span className="block text-[17px] font-extrabold leading-snug group-hover:underline group-hover:underline-offset-4">{s.name}</span>
                    <span className="block text-[14px] text-muted">{KIND_META[s.kind].label}{s.indoor && s.kind !== 'indoor' ? ', indoor' : ''} in {s.city}, {s.region}</span>
                  </div>
                </div>
                <div className="pl-6 md:pl-0">
                  <span className="line-clamp-2 block text-[15px] text-asphalt-2">{s.why}</span>
                  {s.features.length > 0 && <span className="mt-1 block text-[13px] text-muted">{s.features.slice(0, 5).map(f => FEATURE_LABEL[f] ?? f).join(', ')}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {spots.length === 0 && (
        <p className="mt-6 rounded-xl border-2 border-dashed border-concrete-3 p-6 text-[15px]">
          Nothing featured matches those filters. Loosen one, or <Link href="/cities" className="prose-link">pick a city</Link> to see every mapped park around it.
        </p>
      )}
    </div>
  )
}
