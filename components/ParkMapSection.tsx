'use client'

// A park's map section: the 3D map (terrain, street map, buildings, the park's outline and lines), the legend, and the
// named trails with their climbs and drops. Browsers without WebGL get the flat map.

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { LinesEntry, Difficulty } from '@/lib/lines'
import { DIFFICULTY_META, metres } from '@/lib/lines'
import type { ParkKind } from '@/lib/parks'
import { DifficultySign } from '@/components/TrailSigns'

const ParkMap3D = dynamic(() => import('@/components/ParkMap3D'), { ssr: false, loading: () => <div className="h-[62svh] max-h-[640px] min-h-[340px] w-full animate-pulse bg-concrete-2 sm:h-[560px]" /> })
const TrailMap = dynamic(() => import('@/components/TrailMap'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-concrete-2" /> })

interface Props {
  parkId: string
  parkKind: ParkKind
  color: string
  name: string
  lat: number
  lng: number
  country: 'CA' | 'US' | 'MX'
  entry: LinesEntry | null
  editUrl: string
  title?: string         // e.g. "The course in 3D" on a race page
}

const DIFFS: Difficulty[] = ['green', 'blue', 'black', 'double']

export default function ParkMapSection({ parkId, parkKind, color, name, lat, lng, country, entry, editUrl, title: titleOverride }: Props) {
  const [pick, setPick] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const [stats, setStats] = useState<Record<string, { climb: number; drop: number }>>({})

  const hasLines = (entry?.n ?? 0) > 0
  const title = titleOverride ?? (parkKind === 'bike' ? 'Trail map' : parkKind === 'skate' ? 'The park in 3D' : 'Track map')
  const named = entry?.t ?? []
  const shown = all ? named : named.slice(0, 10)
  const trailWord = parkKind === 'bike' ? 'trails' : 'lines'

  return (
    <section>
      <h2 className="h-section text-[22px]">{title}</h2>
      {hasLines && entry && (
        <p className="mt-1 text-[15px] text-muted">
          {entry.n} {entry.n === 1 ? trailWord.replace(/s$/, '') : trailWord} mapped{entry.m ? `, ${metres(entry.m)} in all` : ''}. Tilt, spin and zoom; tap a {parkKind === 'bike' ? 'trail' : 'line'} for its climbs and drops.
        </p>
      )}
      {!hasLines && <p className="mt-1 text-[15px] text-muted">Tilt, spin and zoom {titleOverride ? 'the place' : 'the park'} and the streets around it.</p>}

      <div className="panel mt-4 overflow-hidden">
        <ParkMap3D
          parkId={parkId} parkKind={parkKind} color={color} name={name} lat={lat} lng={lng} country={country}
          pick={pick} onPick={setPick} onStats={setStats}
          fallback={entry ? <div className="h-[300px] sm:h-[440px]"><TrailMap parkId={parkId} parkKind={parkKind} color={color} label={`${title} of ${name}`} highlight={pick} onPick={setPick} /></div> : null}
        />
        {hasLines && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-asphalt/10 px-4 py-3 text-[13px]">
            {DIFFS.filter(d => (entry?.d?.[d] ?? 0) > 0).map(d => (
              <span key={d} className="inline-flex items-center gap-1.5"><DifficultySign d={d} size={13} /> {DIFFICULTY_META[d].label}</span>
            ))}
            {parkKind !== 'bike' && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-1.5 w-5 rounded" style={{ background: parkKind === 'bmx' ? '#C2571A' : '#B98500' }} /> Track</span>}
            {parkKind === 'bike' && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-1 w-5 rounded bg-[#8B887D]" /> Not rated</span>}
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0 w-5 border-t-2 border-dashed border-[#A3A097]" /> Path</span>
          </div>
        )}
      </div>

      {named.length > 0 && (
        <>
          <ul className="mt-4 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {shown.map(([n, kind, m]) => {
              const st = stats[n]
              return (
                <li key={n}>
                  <button type="button" onClick={() => setPick(p => (p === n ? null : n))} aria-pressed={pick === n}
                    className={`flex w-full items-center gap-2.5 border-b border-asphalt/10 py-2 text-left text-[15px] hover:bg-concrete/60 ${pick === n ? 'font-bold' : ''}`}>
                    {DIFFS.includes(kind as Difficulty)
                      ? <DifficultySign d={kind as Difficulty} size={14} />
                      : <span className="inline-block h-1.5 w-3.5 shrink-0 rounded" style={{ background: kind === 'track' ? (parkKind === 'bmx' ? '#C2571A' : '#B98500') : '#8B887D' }} aria-hidden="true" />}
                    <span className="min-w-0 flex-1 truncate">{n}</span>
                    {st && st.drop >= 3 && <span className="shrink-0 text-[13px] text-muted">↓{Math.round(st.drop)} m</span>}
                    <span className="shrink-0 text-[13px] text-muted">{metres(m)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {named.length > 10 && (
            <button type="button" onClick={() => setAll(a => !a)} className="mt-2 text-[14px] font-semibold text-pool hover:underline">
              {all ? 'Show fewer' : `Show all ${named.length}`}
            </button>
          )}
        </>
      )}

      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        {!entry && titleOverride
          ? null
          : !entry
          ? <>This park is only a dot on the map so far. Know it? <a href={editUrl} className="prose-link font-semibold" rel="noopener">Draw it on OpenStreetMap</a> and its outline shows up here after the next refresh.</>
          : !hasLines && parkKind === 'skate'
            ? <>Only the outline of this park is mapped. Know it well? <a href={editUrl} className="prose-link font-semibold" rel="noopener">Add its bowls, ramps and rails on OpenStreetMap</a> so every map shows them.</>
            : !hasLines
              ? <>Only the outline is mapped. <a href={editUrl} className="prose-link font-semibold" rel="noopener">Draw the {parkKind === 'bike' ? 'trails' : 'track'} on OpenStreetMap</a> and they show up here after the next refresh.</>
              : <>Lines and names from OpenStreetMap. Difficulty is what mappers tagged; trust the signs at the park. Something missing or wrong? <a href={editUrl} className="prose-link" rel="noopener">Fix it on OpenStreetMap</a>.</>}
        {entry?.fo === 1 && ' The track is mapped as an area, so its line is the edge of that area.'}
        {' '}Map © <a href="https://openfreemap.org" className="prose-link" rel="noopener">OpenFreeMap</a>, <a href="https://www.openstreetmap.org/copyright" className="prose-link" rel="noopener">OpenStreetMap</a> contributors.
      </p>
    </section>
  )
}
