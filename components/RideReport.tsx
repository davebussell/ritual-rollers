'use client'

// The ride report: is the ground dry here, when will it be, and what's around.
// Used for featured spots (/spots/[slug]), every mapped park (/parks/[id]) and any place (/scout/[slug]).

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Camera, ChevronUp, Plus, MapPin, Droplets, Wind, Thermometer, Sun, Lightbulb, Home } from 'lucide-react'
import ScoutSearch from '@/components/ScoutSearch'
import ShareButton from '@/components/ShareButton'
import ParksMap, { type MapPin as Pin } from '@/components/ParksMap'
import { SampleNotice } from '@/components/SampleNotice'
import { GroundAnim, SunArc } from '@/components/ConditionAnimations'
import type { SkateForecast } from '@/lib/forecast'
import type { IndexedSpot } from '@/lib/spots-index'
import { PARK_KIND_META, parkName, osmUrl, type NearPark, type OsmPark, type ParkKind } from '@/lib/parks'
import { KIND_META, FEATURE_LABEL, DISCIPLINE_BY_ID } from '@/lib/sports'
import {
  readHours, dryBy, whenLabel, windows, dayReads, kitFor, groundLabel, STATUS_LABEL,
  type Read, type Status, type SpotTraits, type Window,
} from '@/lib/skate'
import { weekdayOf, clockOf, hourLabel, countryFlag } from '@/lib/format'

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
  mode: 'spot' | 'park' | 'place'
  title: string
  subtitle: string
  kicker: string
  countryCode: string | null
  shareUrl: string
  point: { lat: number; lng: number }
  forecast: SkateForecast | null
  traits: SpotTraits
  index?: IndexedSpot
  park?: OsmPark
  nearbyFeatured: (IndexedSpot & { distanceKm: number })[]
  nearbyParks: NearPark[]
  stories: StoryCard[]
}

const STATUS_STYLE: Record<Status, string> = {
  prime: 'bg-orange-500 text-white',
  skateable: 'border border-emerald-500 bg-emerald-500/15 text-[#2E4631]',
  no: 'border border-zinc-700 bg-zinc-900 text-zinc-500',
}

function StatusBadge({ status, className = '' }: { status: Status; className?: string }) {
  return <span className={`rounded-sm px-2 py-0.5 font-expedition text-[10px] font-semibold uppercase tracking-widest ${STATUS_STYLE[status]} ${className}`}>{STATUS_LABEL[status]}</span>
}

const STATUS_FILL: Record<Status, string> = { prime: '#D9A21B', skateable: '#8FA37E', no: '#D6C8B0' }

function windowLabel(w: Window): string {
  return `${weekdayOf(w.start)} ${hourLabel(w.start)}–${hourLabel(w.end)}`
}

function useReads(forecast: SkateForecast | null, traits: SpotTraits) {
  return useMemo(() => {
    if (!forecast) return null
    const reads = readHours(forecast.hours, traits)
    const now = forecast.nowIndex
    return {
      reads,
      now,
      current: reads[now],
      dry: dryBy(reads, now),
      wins: windows(reads, now, 3),
      days: dayReads(reads, now).slice(0, 7),
      rain24: forecast.hours.slice(Math.max(0, now - 24), now + 1).reduce((s, h) => s + h.rainMm, 0),
    }
  }, [forecast, traits])
}

// ── The big "now" card ───────────────────────────────────────────────
function NowCard({ label, read, dry, rain24, localTime, dirt, indoor }: {
  label?: string; read: Read; dry: Read | null; rain24: number; localTime: string; dirt: boolean; indoor: boolean
}) {
  const h = read.hour
  const notDry = read.ground !== 'dry'
  return (
    <div className="tx-stitch relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="h-14"><GroundAnim ground={read.ground} dirt={dirt} /></div>
      <div className="p-5 pt-3">
        {label && <p className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">{label}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="font-display text-5xl font-bold uppercase leading-none tracking-[0.02em] text-white">
            {indoor ? 'Indoor' : groundLabel(read.ground, dirt ? 'dirt' : 'hard')}
          </p>
          <StatusBadge status={read.status} className="text-[11px]" />
        </div>
        <p className="mt-2 font-body text-base text-zinc-300">{read.line}</p>
        {!indoor && notDry && read.status === 'no' && (
          <p className="mt-2 font-body text-sm font-semibold text-white">
            {dry ? <>Should be rideable {whenLabel(dry.time, localTime)}{dry.ground === 'drying' ? ' (damp patches)' : ''} if the forecast holds.</> : 'No dry spell in the forecast for the next few days.'}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 font-body text-xs text-zinc-500 sm:grid-cols-4">
          <span className="flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5" /> {rain24.toFixed(1)} mm rain, last 24 h</span>
          <span className="flex items-center gap-1.5"><Thermometer className="h-3.5 w-3.5" /> {Math.round(h.tempC)} °C{h.rh != null ? ` · ${Math.round(h.rh)}% humidity` : ''}</span>
          <span className="flex items-center gap-1.5"><Wind className="h-3.5 w-3.5" /> gusts {Math.round(h.gustKph)} km/h</span>
          <span className="flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" /> {h.precipProb != null ? `${Math.round(h.precipProb)}% rain chance` : `UV ${h.uv != null ? Math.round(h.uv) : '—'}`}</span>
        </div>
      </div>
    </div>
  )
}

// ── Next 24 hours as a strip of coloured blocks ──────────────────────
function HourStrip({ reads, from }: { reads: Read[]; from: number }) {
  const next = reads.slice(from, from + 24)
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[600px] gap-0.5">
        {next.map((r, i) => (
          <div key={r.time} className="flex-1 text-center" title={`${hourLabel(r.time)} — ${r.line}`}>
            <div className="h-9 rounded-sm" style={{ background: STATUS_FILL[r.status], opacity: r.daylight ? 1 : 0.55 }} />
            <p className={`mt-1 font-expedition text-[9px] uppercase tracking-wider ${i % 3 === 0 ? 'text-zinc-500' : 'text-transparent'}`}>{i === 0 ? 'now' : hourLabel(r.time)}</p>
          </div>
        ))}
      </div>
      <p className="mt-1 font-expedition text-[9px] uppercase tracking-widest text-zinc-600">
        <span className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: STATUS_FILL.prime }} /> prime
        <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: STATUS_FILL.skateable }} /> rideable
        <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: STATUS_FILL.no }} /> sit it out · faded = after dark
      </p>
    </div>
  )
}

const KIND_TABS: (ParkKind | 'all')[] = ['all', 'skate', 'pump', 'bmx', 'bike']

export default function RideReport(props: Props) {
  const { mode, title, subtitle, kicker, countryCode, shareUrl, point, forecast, traits, index, park, nearbyFeatured, nearbyParks, stories } = props
  const flag = countryFlag(countryCode)
  const indoor = !!traits.indoor
  const dirtSpot = traits.surface === 'dirt'

  // A place gets two reads: hard surfaces and dirt. A spot gets its own.
  const hardTraits = useMemo<SpotTraits>(() => (mode === 'place' ? { surface: 'hard', lit: null } : traits), [mode, traits])
  const dirtTraits = useMemo<SpotTraits>(() => ({ surface: 'dirt', lit: null }), [])
  const main = useReads(forecast, hardTraits)
  const dirt = useReads(mode === 'place' ? forecast : null, dirtTraits)

  const [tab, setTab] = useState<ParkKind | 'all'>('all')
  const kindsPresent = KIND_TABS.filter(k => k === 'all' || nearbyParks.some(p => p.kind === k))
  const parksShown = tab === 'all' ? nearbyParks : nearbyParks.filter(p => p.kind === tab)

  const pins: Pin[] = useMemo(() => [
    ...nearbyFeatured.slice(0, 20).map(s => ({
      id: `f-${s.slug}`, lat: s.lat, lng: s.lng, name: s.name, sub: `${KIND_META[s.kind].label} · featured · ${s.distanceKm.toFixed(1)} km`,
      color: KIND_META[s.kind].color, href: `/spots/${s.slug}`, featured: true,
    })),
    ...parksShown.slice(0, 80).map(p => ({
      id: p.id, lat: p.lat, lng: p.lng, name: parkName(p), sub: `${PARK_KIND_META[p.kind].label} · ${p.distanceKm.toFixed(1)} km`,
      color: PARK_KIND_META[p.kind].color, href: `/parks/${p.id}`,
    })),
  ], [nearbyFeatured, parksShown])

  const today = forecast?.daily[0]

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="tag inline-block px-3 py-1 text-[11px] tracking-[0.18em]">{kicker}</p>
          <h1 className="mt-3 break-words font-display text-4xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-5xl">
            {flag && <span className="mr-2">{flag}</span>}{title}
          </h1>
          <p className="mt-1 font-body text-zinc-500">{subtitle}</p>
          <p className="mt-2 font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">
            {forecast ? `read at ${clockOf(forecast.localTime)} local · weather: open-meteo` : 'forecast unavailable right now'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <ShareButton url={shareUrl} title={`${title} — is it dry? · Ritual Rollers`} compact />
          <ScoutSearch size="compact" />
        </div>
      </div>

      {/* About this spot (featured index) */}
      {index && (
        <section className="tx-stitch relative mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-sm px-2 py-0.5 font-expedition text-[10px] font-semibold uppercase tracking-[0.14em] text-white" style={{ background: KIND_META[index.kind].color }}>{KIND_META[index.kind].label}</span>
                {index.features.slice(0, 8).map(f => <span key={f} className="tag px-2 py-0.5 text-[10px] tracking-[0.14em]">{FEATURE_LABEL[f] ?? f}</span>)}
              </div>
              <p className="mt-3 font-body text-base text-white">{index.why}</p>
              {index.heads_up && <p className="mt-2 font-body text-sm text-zinc-500"><span className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Heads up · </span>{index.heads_up}</p>}
            </div>
            <dl className="grid shrink-0 grid-cols-2 gap-x-5 gap-y-2 font-body text-sm sm:grid-cols-1">
              <div><dt className="font-expedition text-[10px] uppercase tracking-[0.18em] text-zinc-500">Who rides it</dt>
                <dd className="text-white">{index.disciplines.map(d => DISCIPLINE_BY_ID[d]?.short ?? d).join(' · ') || '—'}</dd></div>
              <div><dt className="font-expedition text-[10px] uppercase tracking-[0.18em] text-zinc-500">Level</dt>
                <dd className="text-white">{index.skill === 'all' ? 'Every level' : index.skill[0].toUpperCase() + index.skill.slice(1)}</dd></div>
              <div><dt className="font-expedition text-[10px] uppercase tracking-[0.18em] text-zinc-500">Cost · lights</dt>
                <dd className="text-white">{index.cost === 'unknown' ? 'Check' : index.cost === 'free' ? 'Free' : 'Paid'} · {index.lit == null ? 'lights unknown' : index.lit ? 'lit' : 'no lights'}</dd></div>
              <div><dt className="font-expedition text-[10px] uppercase tracking-[0.18em] text-zinc-500">Source</dt>
                <dd><a href={index.source} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">Read more ↗</a></dd></div>
            </dl>
          </div>
        </section>
      )}

      {/* About this mapped park (OSM) */}
      {park && (
        <section className="tx-stitch relative mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5 font-body text-sm text-zinc-300">
          <p>
            <span className="rounded-sm px-2 py-0.5 font-expedition text-[10px] font-semibold uppercase tracking-[0.14em] text-white" style={{ background: PARK_KIND_META[park.kind].color }}>{PARK_KIND_META[park.kind].label}</span>
            <span className="ml-2">Mapped on OpenStreetMap{park.surface ? ` · ${park.surface}` : ''}{park.indoor ? ' · indoor' : ''}{park.lit != null ? ` · ${park.lit ? 'lit' : 'no lights'}` : ''}{park.fee != null ? ` · ${park.fee ? 'paid' : 'free'}` : ''}</span>
          </p>
          {park.hours && <p className="mt-2"><span className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Hours · </span>{park.hours}</p>}
          <p className="mt-2 text-zinc-500">
            {park.web && <><a href={park.web} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">Website ↗</a> · </>}
            <a href={osmUrl(park.id)} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">OpenStreetMap ↗</a>
            {' '}— something wrong or missing? Fix it there and it shows up here on the next refresh.
          </p>
        </section>
      )}

      {!forecast && (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-400">
          The weather feed didn&apos;t answer. Give it a minute and reload — the spots and stories below still stand.
        </div>
      )}

      {forecast && main && main.current && (
        <>
          {/* Now */}
          <section className="mt-8">
            <h2 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Right now</h2>
            <div className={`mt-3 grid gap-4 ${dirt ? 'md:grid-cols-2' : ''}`}>
              <NowCard label={mode === 'place' ? 'Concrete & asphalt — skateparks, plazas, pump tracks' : undefined}
                read={main.current} dry={main.dry} rain24={main.rain24} localTime={forecast.localTime} dirt={mode !== 'place' && dirtSpot} indoor={indoor} />
              {dirt && dirt.current && (
                <NowCard label="Dirt — jumps, BMX tracks, bike parks" read={dirt.current} dry={dirt.dry} rain24={dirt.rain24} localTime={forecast.localTime} dirt indoor={false} />
              )}
            </div>
            {indoor && (
              <p className="mt-3 flex items-center gap-2 font-body text-sm text-zinc-500"><Home className="h-4 w-4" /> Indoor — the read below is the weather outside, for the ride there.</p>
            )}
          </section>

          {/* Next 24 hours */}
          <section className="mt-8">
            <h2 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Next 24 hours{mode === 'place' ? ' · concrete' : ''}</h2>
            <div className="mt-3"><HourStrip reads={main.reads} from={main.now} /></div>
          </section>

          {/* Windows + week */}
          <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="tx-stitch relative rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Best dry windows this week</h2>
              {main.wins.length ? (
                <ul className="mt-3 space-y-2">
                  {main.wins.map(w => (
                    <li key={w.start} className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-lg font-bold uppercase text-white">{windowLabel(w)}</span>
                        <StatusBadge status={w.peak.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">{w.peak.line} · {w.hours} h{w.primeHours ? `, ${w.primeHours} prime` : ''}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">{indoor ? 'Indoor — every opening hour is a window.' : 'No dry daylight window in the forecast. Look for an indoor park nearby.'}</p>
              )}
              {today && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-10 w-24 text-amber-500"><SunArc localTime={forecast.localTime} sunrise={today.sunrise} sunset={today.sunset} /></div>
                  <p className="font-body text-xs text-zinc-500">Light {clockOf(today.sunrise)}–{clockOf(today.sunset)}{traits.lit ? ' · this one is lit after dark' : ''}</p>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <div className="grid min-w-[520px] grid-cols-7 gap-2">
                {main.days.map((d, i) => (
                  <div key={d.date} className={`rounded-xl border p-2.5 ${i === 0 ? 'border-orange-500/50 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50'}`}>
                    <p className="font-expedition text-[10px] uppercase tracking-widest text-zinc-500">{i === 0 ? 'Today' : weekdayOf(d.date)}</p>
                    <div className="mt-2 h-1.5 rounded-full" style={{ background: STATUS_FILL[d.status] }} />
                    <p className="mt-2 font-display text-sm font-bold uppercase leading-tight text-white">{d.label}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{Math.round(d.tMin)}–{Math.round(d.tMax)} °C</p>
                    <p className="text-[11px] text-zinc-500">{d.rainMm >= 0.5 ? `${d.rainMm.toFixed(0)} mm rain` : 'no rain'}{d.snowCm >= 1 ? ` · ${d.snowCm.toFixed(0)} cm snow` : ''}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 font-expedition text-[9px] uppercase tracking-widest text-zinc-600">daily read{mode === 'place' ? ' for concrete' : ''} · rain counts the day it falls</p>
            </div>
          </section>

          {/* Kit */}
          <section className="tx-stitch relative mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Bring</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {kitFor(main.current.hour, main.current.ground).map((k, i) => (
                <li key={i} className="font-body text-sm text-zinc-300">
                  <span className="-mb-0.5 mr-2 inline-block h-3 w-3 rounded-[2px] border-2 border-zinc-700" aria-hidden />
                  <span className="font-semibold text-white">{k.lead}</span> → {k.detail}
                </li>
              ))}
              {!indoor && traits.lit == null && main.current.hour.isDay === false && (
                <li className="font-body text-sm text-zinc-300"><Lightbulb className="mr-1 inline h-3.5 w-3.5" /><span className="font-semibold text-white">After dark</span> → we don&apos;t know if it&apos;s lit; bring a light</li>
              )}
            </ul>
          </section>
        </>
      )}

      {/* Nearby */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-bold uppercase tracking-[0.02em] text-white">
            {mode === 'place' ? 'Spots around here' : 'More spots nearby'}
          </h2>
          {kindsPresent.length > 2 && (
            <div className="flex flex-wrap gap-1.5">
              {kindsPresent.map(k => (
                <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${tab === k ? 'bg-orange-500 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}>
                  {k === 'all' ? 'All' : PARK_KIND_META[k].plural}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1 font-body text-sm text-zinc-500">
          Same weather, same read: if it&apos;s dry here, it&apos;s dry at these too — unless they&apos;re indoor, or dirt.
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {nearbyFeatured.length > 0 && (
              <div>
                <h3 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Featured within 60 km</h3>
                <ul className="mt-2 divide-y divide-zinc-800/60 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  {nearbyFeatured.slice(0, 6).map(s => (
                    <li key={s.slug}>
                      <Link href={`/spots/${s.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: KIND_META[s.kind].color }} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">{s.name}</div>
                          <div className="text-xs text-zinc-500">{KIND_META[s.kind].label}{s.indoor ? ' · indoor' : ''} · {s.city}</div>
                        </div>
                        <span className="shrink-0 text-xs text-zinc-500">{s.distanceKm.toFixed(1)} km</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h3 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Every mapped spot within 25 km</h3>
              {parksShown.length === 0 ? (
                <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">
                  Nothing mapped within 25 km. Know one? Add it on <a className="text-teal-700 hover:underline" href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> and it shows up here.
                </div>
              ) : (
                <ul className="mt-2 max-h-[340px] divide-y divide-zinc-800/60 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
                  {parksShown.slice(0, 40).map(p => (
                    <li key={p.id}>
                      <Link href={`/parks/${p.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-900">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PARK_KIND_META[p.kind].color }} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">{parkName(p)}</div>
                          <div className="text-xs text-zinc-500">{PARK_KIND_META[p.kind].label}{p.indoor ? ' · indoor' : ''}{p.lit ? ' · lit' : ''}{p.city ? ` · ${p.city}` : ''}</div>
                        </div>
                        <span className="shrink-0 text-xs text-zinc-500">{p.distanceKm.toFixed(1)} km</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1.5 text-[11px] text-zinc-600">Map data © OpenStreetMap contributors.</p>
            </div>
          </div>
          <div className="h-[420px] overflow-hidden rounded-xl border border-zinc-800 lg:sticky lg:top-20">
            <ParksMap center={point} pins={pins} />
          </div>
        </div>
      </section>

      {/* Stories */}
      <section className="mt-10">
        <div className="rule-plaid mb-6" aria-hidden />
        <h2 className="font-display text-3xl font-bold uppercase tracking-[0.02em] text-white">
          Sessions near <span className="text-orange-500">{title}</span>
        </h2>
        {stories.some(s => s.sample) && <SampleNotice className="mt-3" />}
        {stories.length === 0 ? (
          <Link href="/trips/new"
            className="mt-4 block rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center transition-colors hover:border-orange-500/50">
            <Camera className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 font-semibold text-white">No sessions logged here yet — be the first</p>
            <p className="mt-1 text-xs text-zinc-500">Post the photos, tag the spot, claim it</p>
          </Link>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {stories.map(t => (
              <Link key={t.id} href={`/trips/${t.id}`}
                className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition-all hover:border-zinc-600">
                <div className="relative aspect-video overflow-hidden bg-zinc-800">
                  {t.cover
                    ? <img src={t.cover} alt={t.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="flex h-full w-full items-center justify-center text-zinc-700"><Camera className="h-8 w-8" /></div>}
                  {t.sample && <span className="absolute left-2 top-2 rounded-full bg-zinc-950/80 px-2 py-0.5 font-expedition text-[9px] uppercase tracking-widest text-amber-400">Sample</span>}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-bold text-white">{t.title}</h3>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500">
                    <span>@{t.username ?? 'roller'}</span>
                    <span className="flex items-center gap-1"><ChevronUp className="h-3 w-3" /> {t.upvotes}</span>
                  </div>
                  {t.distanceKm != null && <p className="mt-1 flex items-center gap-1 text-xs text-zinc-600"><MapPin className="h-3 w-3" /> {Math.round(t.distanceKm)} km away</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/trips/new"
            className="tx-stitch relative flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 font-display text-lg font-bold uppercase tracking-wide text-white transition-all hover:bg-orange-400 active:scale-95">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Log a session here
          </Link>
          <Link href={`/crew?q=${encodeURIComponent(title)}`} className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700 hover:underline">Who&apos;s rolling here? →</Link>
        </div>
      </section>

      {/* How the read works */}
      <section className="mt-12 rounded-xl border border-dashed border-zinc-700 p-5 font-body text-sm text-zinc-500">
        <h2 className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">How the read works</h2>
        <p className="mt-2">
          We track the water on the ground hour by hour, starting two days back. Rain adds to it; sun, wind and dry air take it away
          (the forecast&apos;s evaporation figure, which folds all three together); frost locks it in. Concrete sheds most of a downpour
          and dries in a couple of hours on a good day. Dirt soaks it up and takes a day or more, and riding it while it&apos;s mud ruts it.
          It&apos;s a model, not a camera: shady corners and the bottom of a bowl hold water longer. Weather from Open-Meteo.
        </p>
      </section>
    </div>
  )
}
