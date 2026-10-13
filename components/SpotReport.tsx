'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Navigation, Camera, ChevronUp, Plus, MapPin } from 'lucide-react'
import ScoutSearch from '@/components/ScoutSearch'
import ShareButton from '@/components/ShareButton'
import RideMap from '@/components/RideMap'
import { SampleNotice } from '@/components/SampleNotice'
import { WaveAnim, WindAnim, RoadAnim, SunArc, roadState } from '@/components/ConditionAnimations'
import { CATEGORY_META, fetchLocalSpots, type GeoPoint, type LocalSpot, type SportCategory } from '@/lib/local-sports'
import type { SpotForecast } from '@/lib/forecast'
import {
  SPORTS, FAMILY_META, FAMILY_ORDER,
  allVerdicts, bestWindows, daySummaries,
  wetsuitFor, windKitFor, sunFor, layersFor,
  weekdayOf, clockOf, hourLabel, compassOf, countryFlag,
  type SportVerdict, type Status, type WindowHit,
} from '@/lib/sports'

export interface StoryCard {
  id: string
  title: string
  upvotes: number
  username: string | null
  cover: string | null
  distanceKm: number | null
  sample: boolean
}

interface Props {
  slug: string
  point: GeoPoint
  forecast: SpotForecast | null
  stories: StoryCard[]
}

const SITE = 'https://ritualrollers.com'
const STATUS_RANK: Record<Status, number> = { firing: 2, rideable: 1, quiet: 0 }
const CATEGORY_ORDER: SportCategory[] = ['wind', 'water', 'mountain', 'river']

function StatusBadge({ status }: { status: Status }) {
  if (status === 'firing') return <span className="rounded-sm bg-orange-500 px-2 py-0.5 font-expedition text-[10px] font-semibold uppercase tracking-widest text-white">FIRING</span>
  if (status === 'rideable') return <span className="rounded-sm border border-emerald-500 bg-emerald-500/15 px-2 py-0.5 font-expedition text-[10px] font-semibold uppercase tracking-widest text-[#2E4631]">RIDEABLE</span>
  return <span className="rounded-sm border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-expedition text-[10px] font-semibold uppercase tracking-widest text-zinc-500">QUIET</span>
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-zinc-900 ${className}`} />
}

function windowLabel(w: WindowHit): string {
  return `${weekdayOf(w.start)} ${hourLabel(w.start)}–${hourLabel(w.end)}`
}

export default function SpotReport({ slug, point, forecast, stories }: Props) {
  const flag = countryFlag(point.countryCode)
  const shareUrl = `${SITE}/scout/${slug}`

  const verdicts = useMemo(() => (forecast ? allVerdicts(forecast.current) : []), [forecast])
  const ranked = useMemo(
    () => [...verdicts].sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || b.score - a.score),
    [verdicts]
  )
  const windowsBySport = useMemo(() => {
    if (!forecast) return {} as Record<string, WindowHit[]>
    const out: Record<string, WindowHit[]> = {}
    for (const sport of SPORTS) out[sport.id] = bestWindows(sport, forecast.hourly, forecast.daylight, 3)
    return out
  }, [forecast])
  const days = useMemo(() => (forecast ? daySummaries(forecast.hourly, forecast.daylight) : []), [forecast])

  // Open the top read on first render so the page is complete at rest (and in the server HTML)
  const [openSport, setOpenSport] = useState<string | null>(() => ranked[0]?.sport.id ?? null)
  const open = verdicts.find(v => v.sport.id === openSport) ?? null

  // The logo's canvas patch follows the place: duck canvas on the coast (sand, wind, salt),
  // forest inland (mountains, rivers, trees)
  useEffect(() => {
    if (!forecast) return
    document.documentElement.style.setProperty('--rr-patch', forecast.coastal ? '#B7794A' : '#3F5A42')
    return () => { document.documentElement.style.removeProperty('--rr-patch') }
  }, [forecast])

  // Spots nearby — client-side, slow and best-effort
  const [spots, setSpots] = useState<LocalSpot[] | null | 'loading'>('loading')
  const [activeCategory, setActiveCategory] = useState<SportCategory | 'all'>('all')
  useEffect(() => {
    let alive = true
    setSpots('loading')
    fetchLocalSpots(point.lat, point.lng).then(s => { if (alive) setSpots(s) })
    return () => { alive = false }
  }, [point.lat, point.lng])

  const spotList = spots === 'loading' || spots === null ? [] : spots
  const categoriesPresent = CATEGORY_ORDER.filter(c => spotList.some(s => s.category === c))
  const visibleCategories = activeCategory === 'all' ? categoriesPresent : [activeCategory]

  const cur = forecast?.current
  const today = forecast?.daily[0]
  const road = cur ? roadState(cur) : { state: 'dry' as const, label: '' }
  const weekWindMax = Math.max(1, ...(forecast?.daily.map(d => d.windMax) ?? [1]))
  const weekWaveMax = Math.max(0.5, ...(forecast?.daily.map(d => d.waveMax ?? 0) ?? [0.5]))

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">

      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="tag inline-block px-3 py-1 text-[11px] tracking-[0.18em]">Spot report</p>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-5xl">
            {flag && <span className="mr-2">{flag}</span>}{point.label}
          </h1>
          <p className="mt-2 font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">
            {forecast ? `updated ${clockOf(forecast.localTime)} local · open-meteo` : 'forecast unavailable right now'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <ShareButton url={shareUrl} title={`${point.label} — spot report on Ritual Rollers`} compact />
          <ScoutSearch size="compact" />
        </div>
      </div>

      {!forecast && (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-400">
          The forecast feed didn&apos;t answer. Give it a minute and reload — spots and stories below still stand.
        </div>
      )}

      {forecast && cur && today && (
        <>
          {/* Now — living conditions */}
          <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="tx-stitch relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-expedition text-[11px] uppercase tracking-[0.14em] text-teal-700">Wind</span>
                  <Navigation className="h-4 w-4 text-cyan-600" style={{ transform: `rotate(${cur.windDirDeg + 180}deg)` }} />
                </div>
                <div className="mt-1 font-display text-3xl text-white">{Math.round(cur.windKph)} <span className="text-base text-zinc-500">km/h</span></div>
                <div className="text-xs text-zinc-500">gusts {Math.round(cur.gustKph)} · from {compassOf(cur.windDirDeg)}</div>
              </div>
              <div className="h-12 text-cyan-500"><WindAnim kph={cur.windKph} /></div>
            </div>
            <div className="tx-stitch relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="p-4 pb-2">
                <span className="font-expedition text-[11px] uppercase tracking-[0.14em] text-teal-700">{forecast.coastal ? 'Waves' : 'Water'}</span>
                {forecast.coastal ? (
                  <>
                    <div className="mt-1 font-display text-3xl text-white">{cur.waveM != null ? cur.waveM.toFixed(1) : '—'} <span className="text-base text-zinc-500">m</span></div>
                    <div className="text-xs text-zinc-500">{cur.periodS != null ? `${Math.round(cur.periodS)} s period` : 'no period'}{cur.sstC != null ? ` · sea ${cur.sstC.toFixed(1)} °C` : ''}</div>
                  </>
                ) : (
                  <>
                    <div className="mt-1 font-display text-3xl text-white">flat</div>
                    <div className="text-xs text-zinc-500">inland — lakes and rivers</div>
                  </>
                )}
              </div>
              <div className="h-12 text-blue-500"><WaveAnim heightM={cur.waveM} periodS={cur.periodS} coastal={forecast.coastal} /></div>
            </div>
            <div className="tx-stitch relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="p-4 pb-2">
                <span className="font-expedition text-[11px] uppercase tracking-[0.14em] text-teal-700">Road</span>
                <div className="mt-1 font-display text-3xl capitalize text-white">{road.state === 'snow' ? 'Snowy' : road.state}</div>
                <div className="text-xs text-zinc-500">{road.label}</div>
              </div>
              <div className="h-12"><RoadAnim state={road.state} /></div>
            </div>
            <div className="tx-stitch relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="p-4 pb-2">
                <span className="font-expedition text-[11px] uppercase tracking-[0.14em] text-teal-700">Daylight</span>
                <div className="mt-1 font-display text-3xl text-white">{clockOf(today.sunrise)}<span className="text-base text-zinc-500"> → {clockOf(today.sunset)}</span></div>
                <div className="text-xs text-zinc-500">{Math.round(cur.tempC)} °C air · {cur.precipMm.toFixed(1)} mm · UV {cur.uv != null ? Math.round(cur.uv) : '—'}</div>
              </div>
              <div className="h-12 text-amber-500"><SunArc localTime={forecast.localTime} sunrise={today.sunrise} sunset={today.sunset} /></div>
            </div>
          </section>

          {/* Verdicts */}
          <section className="mt-8">
            <h2 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">What&apos;s rideable right now</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {FAMILY_ORDER.map(fam => {
                const meta = FAMILY_META[fam]
                const list = verdicts.filter(v => v.sport.family === fam)
                return (
                  <div key={fam} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                    <p className="tag mb-2 inline-flex items-center gap-2 px-2 py-0.5 text-[10px] tracking-[0.18em]" style={{ color: meta.color, borderColor: meta.color }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} /> {meta.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map(vd => {
                        const active = openSport === vd.sport.id
                        return (
                          <button key={vd.sport.id} onClick={() => setOpenSport(vd.sport.id)}
                            aria-pressed={active}
                            className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left font-body text-sm transition-all active:scale-95 ${
                              active ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                            } ${vd.status === 'quiet' ? 'opacity-70' : ''}`}>
                            <span>{vd.sport.emoji}</span>
                            <span className="font-semibold">{vd.sport.label}</span>
                            <StatusBadge status={vd.status} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {open && (
              <div className="tx-stitch relative mt-4 rounded-xl border border-zinc-800 border-l-4 border-l-orange-500 bg-zinc-900 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl">{open.sport.emoji}</span>
                  <h3 className="font-display text-xl font-bold text-white">{open.sport.label}</h3>
                  <StatusBadge status={open.status} />
                </div>
                <p className="mt-2 text-zinc-300">{open.line}</p>
                <div className="mt-4">
                  <p className="font-expedition text-[9px] uppercase tracking-[0.25em] text-zinc-500">Best windows this week</p>
                  {windowsBySport[open.sport.id]?.length ? (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-3">
                      {windowsBySport[open.sport.id].map(w => (
                        <li key={w.start} className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="font-display font-bold text-white">{windowLabel(w)}</span>
                            <StatusBadge status={w.peak.status} />
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">{w.peak.line} · {w.hours} h</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">No daylight window in the next seven days — check back after the weekend.</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Week */}
          <section className="mt-8">
            <div className="rule-plaid mb-6" aria-hidden />
            <h2 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">This week</h2>
            <div className="mt-4 overflow-x-auto">
              <div className="grid min-w-[560px] grid-cols-7 gap-2">
                {forecast.daily.map((d, i) => {
                  const summary = days.find(s => s.date === d.date)?.top ?? null
                  return (
                    <div key={d.date} className={`rounded-2xl border p-3 ${i === 0 ? 'border-orange-500/40 bg-zinc-900/60' : 'border-zinc-800 bg-zinc-900/40'}`}>
                      <p className="font-expedition text-[10px] uppercase tracking-widest text-zinc-500">{i === 0 ? 'Today' : weekdayOf(d.date)}</p>
                      <div className="mt-3 flex h-16 items-end gap-1">
                        <div className="flex-1 rounded-t-sm bg-cyan-500/70" style={{ height: `${Math.max(6, (d.windMax / weekWindMax) * 100)}%` }} title={`wind ${Math.round(d.windMax)} km/h`} />
                        {forecast.coastal && (
                          <div className="flex-1 rounded-t-sm bg-blue-500/70" style={{ height: `${Math.max(6, ((d.waveMax ?? 0) / weekWaveMax) * 100)}%` }} title={`waves ${(d.waveMax ?? 0).toFixed(1)} m`} />
                        )}
                      </div>
                      <p className="mt-2 font-expedition text-[10px] text-zinc-400">{Math.round(d.windMax)} km/h{forecast.coastal && d.waveMax != null ? ` · ${d.waveMax.toFixed(1)} m` : ''}</p>
                      <p className="text-[11px] text-zinc-500">{Math.round(d.tempMin)}–{Math.round(d.tempMax)} °C{d.precipSum >= 1 ? ` · ${d.precipSum.toFixed(0)} mm` : ''}{d.snowfallSum >= 1 ? ` · ${d.snowfallSum.toFixed(0)} cm snow` : ''}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-sm">
                        {summary ? (
                          <>
                            <span>{summary.sport.emoji}</span>
                            <span className={`h-1.5 w-1.5 rounded-full ${summary.status === 'firing' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                            <span className="truncate text-xs text-zinc-300">{summary.sport.label}</span>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-600">quiet</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <p className="mt-2 font-expedition text-[9px] uppercase tracking-widest text-zinc-600">
              bars: daily max wind{forecast.coastal ? ' · wave' : ''} · best sport each day
            </p>
          </section>

          {/* Kit */}
          <section className="tx-stitch relative mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Pack list</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                wetsuitFor(cur.sstC, cur.tempC),
                windKitFor(cur.windKph),
                sunFor(cur.uv),
                layersFor(cur.tempC, cur.windKph),
              ].filter(Boolean).map((k, i) => k && (
                <li key={i} className="font-body text-sm text-zinc-300">
                  <span className="-mb-0.5 mr-2 inline-block h-3 w-3 rounded-[2px] border-2 border-zinc-700" aria-hidden />
                  <span className="font-semibold text-white">{k.lead}</span> → {k.detail}
                </li>
              ))}
              <li className="font-body text-sm text-zinc-300">
                <span className="-mb-0.5 mr-2 inline-block h-3 w-3 rounded-[2px] border-2 border-zinc-700" aria-hidden />
                <span className="font-semibold text-white">Daylight {clockOf(today.sunrise)}–{clockOf(today.sunset)}</span> → golden hour from {clockOf(today.sunset).replace(/^(\d{2})/, m => String(Number(m) - 1).padStart(2, '0'))}
              </li>
            </ul>
          </section>
        </>
      )}

      {/* Spots nearby */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Spots within 40 km</h2>
          {categoriesPresent.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setActiveCategory('all')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${activeCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>All</button>
              {categoriesPresent.map(c => (
                <button key={c} onClick={() => setActiveCategory(activeCategory === c ? 'all' : c)}
                  className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                  style={activeCategory === c ? { background: CATEGORY_META[c].color, color: '#fff' } : { background: '#27272a', color: '#a1a1aa' }}>
                  {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            {spots === 'loading' ? (
              <><Skeleton className="h-32" /><Skeleton className="h-32" /></>
            ) : spots === null ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 text-sm text-zinc-400">
                The map-data servers didn&apos;t answer in time. Reload in a minute — the forecast above doesn&apos;t depend on them.
              </div>
            ) : spots.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 text-sm text-zinc-400">
                OpenStreetMap has no tagged spots within 40 km — pioneers welcome.{' '}
                <Link href="/trips/new" className="font-semibold text-orange-400 hover:text-orange-300">Log the first ride here.</Link>
              </div>
            ) : (
              visibleCategories.map(cat => {
                const meta = CATEGORY_META[cat]
                const list = spotList.filter(s => s.category === cat)
                const shown = list.slice(0, 6)
                return (
                  <div key={cat}>
                    <h3 className="flex items-center gap-2 font-display font-bold text-white">
                      <span>{meta.emoji}</span> {meta.label}
                      <span className="font-expedition text-[9px] tracking-widest text-zinc-600">{list.length} spot{list.length !== 1 ? 's' : ''}</span>
                    </h3>
                    <ul className="mt-2 divide-y divide-zinc-800/60 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                      {shown.map(s => (
                        <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">{s.name}</div>
                            <div className="text-xs text-zinc-500">{s.sport}</div>
                          </div>
                          <span className="shrink-0 text-xs text-zinc-500">{s.distanceKm.toFixed(1)} km</span>
                        </li>
                      ))}
                    </ul>
                    {list.length > shown.length && <p className="mt-1.5 text-xs text-zinc-600">+{list.length - shown.length} more on the map</p>}
                  </div>
                )
              })
            )}
          </div>
          <div className="h-[420px] overflow-hidden rounded-2xl border border-zinc-800 lg:sticky lg:top-20">
            <RideMap center={{ lat: point.lat, lng: point.lng }} spots={spotList} activeCategory={activeCategory} />
          </div>
        </div>
      </section>

      {/* Stories */}
      <section className="mt-10">
        <div className="rule-plaid mb-6" aria-hidden />
        <h2 className="font-display text-3xl font-bold uppercase tracking-[0.02em] text-white">
          Stories near <span className="text-orange-500">{point.label}</span>
        </h2>
        {stories.some(s => s.sample) && <SampleNotice className="mt-3" />}
        {stories.length === 0 ? (
          <Link href="/trips/new"
            className="mt-4 block rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center transition-colors hover:border-orange-500/50">
            <Camera className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 font-semibold text-white">No stories here yet — be the first to roll it</p>
            <p className="mt-1 text-xs text-zinc-500">Log a ride and claim the spot</p>
          </Link>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {stories.map(t => (
              <Link key={t.id} href={`/trips/${t.id}`}
                className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition-all hover:border-zinc-600 hover:shadow-xl hover:shadow-black/40">
                <div className="relative aspect-video overflow-hidden bg-zinc-800">
                  {t.cover
                    ? <img src={t.cover} alt={t.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="flex h-full w-full items-center justify-center text-zinc-700"><Camera className="h-8 w-8" /></div>}
                  {t.sample && (
                    <span className="absolute left-2 top-2 rounded-full bg-zinc-950/80 px-2 py-0.5 font-expedition text-[9px] uppercase tracking-widest text-amber-400 backdrop-blur">Sample</span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-bold text-white transition-colors group-hover:text-orange-50">{t.title}</h3>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500">
                    <span>@{t.username ?? 'roller'}</span>
                    <span className="flex items-center gap-1"><ChevronUp className="h-3 w-3" /> {t.upvotes}</span>
                  </div>
                  {t.distanceKm != null && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-zinc-600"><MapPin className="h-3 w-3" /> {Math.round(t.distanceKm)} km away</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-6 flex items-center gap-3">
          <Link href="/trips/new"
            className="tx-stitch relative flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 font-display text-lg font-bold uppercase tracking-wide text-white transition-all hover:bg-orange-400 active:scale-95">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Log a ride here
          </Link>
          <span className="font-expedition text-[11px] uppercase tracking-[0.18em] text-zinc-600">Roll out. Share the story.</span>
        </div>
      </section>
    </div>
  )
}
