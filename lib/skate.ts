// The ride read: is the ground dry, and is it worth rolling?
//
// Concrete doesn't care about the forecast in the abstract; it cares whether water is sitting
// on it. So the engine keeps a running figure for the water on the ground, in millimetres:
//   • rain adds to it, up to what a park actually holds before the rest runs off
//     (the film on the flat, the cracks, the bottom of the bowl);
//   • sun, wind and dry air take it away. Open-Meteo's FAO reference evapotranspiration (ET0)
//     already folds all three together; water on hot concrete goes faster than off the
//     reference grass, so it is scaled up a little;
//   • frost locks it in place, and snow on the ground closes outdoor parks outright.
// Dirt (pump tracks, dirt jumps, BMX tracks, bike parks) soaks rain up instead of shedding it, so
// it holds far more and dries far slower, and past a point it is mud: riding it ruts the track.
// It starts two days back so yesterday's storm still counts this morning. Every line the
// site shows carries the real number behind it.

import { hourOf, dateOf, hourLabel, weekdayOf } from '@/lib/format'

export interface Hour {
  time: string              // local 'YYYY-MM-DDTHH:00'
  tempC: number
  rh: number | null         // relative humidity, %
  precipMm: number          // everything that fell (rain + snow water equivalent)
  rainMm: number            // the liquid part
  snowfallCm: number
  snowDepthCm: number | null
  windKph: number
  gustKph: number
  cloudPct: number | null
  isDay: boolean
  et0Mm: number | null      // FAO reference evapotranspiration for the hour
  precipProb: number | null // %
  uv: number | null
}

export type Ground = 'dry' | 'drying' | 'wet' | 'mud' | 'snow' | 'ice'
export type Surface = 'hard' | 'wood' | 'dirt'
export type Status = 'prime' | 'skateable' | 'no'

export interface Read {
  time: string
  ground: Ground
  waterMm: number
  raining: boolean
  status: Status
  line: string
  score: number             // 0..1, ranks hours and windows
  daylight: boolean
  hour: Hour
}

export interface SpotTraits {
  indoor?: boolean
  lit?: boolean | null      // null: we don't know whether it has lights
  surface?: Surface         // default hard (concrete, asphalt)
}

// How each surface takes water. hold: the most it keeps before the rest runs off.
// dry / damp: thresholds in mm. k: multiple of reference ET0 it dries at, by day and by night.
export const SURFACES: Record<Surface, { hold: number; dry: number; damp: number; kDay: number; kNight: number; floor: number }> = {
  hard: { hold: 1.2, dry: 0.05, damp: 0.35, kDay: 1.5, kNight: 1.2, floor: 0.03 },
  wood: { hold: 1.5, dry: 0.05, damp: 0.3, kDay: 1.0, kNight: 0.8, floor: 0.02 },
  dirt: { hold: 12, dry: 1.5, damp: 4, kDay: 0.8, kNight: 0.4, floor: 0.01 },
}
export const HOLD_MM = SURFACES.hard.hold
export const DRY_MM = SURFACES.hard.dry
export const DAMP_MM = SURFACES.hard.damp
const RAIN_HOUR_MM = 0.2     // an hour with this much rain is a rain hour
const SNOW_CM = 0.5          // snow on the ground from here

const r = (n: number) => Math.round(n)

// ── Water on the ground ──────────────────────────────────────────────

export function dryingRate(h: Hour, surface: Surface = 'hard'): number {
  const m = SURFACES[surface]
  let et = h.et0Mm
  if (et == null || !Number.isFinite(et)) {
    // No ET0 from the model: warm, dry, breezy, sunny air dries faster
    const t = Math.max(0, h.tempC)
    const dryAir = 1 - (h.rh ?? 70) / 100
    const sun = h.isDay ? 1 - (h.cloudPct ?? 50) / 100 : 0
    et = 0.02 + 0.012 * t * dryAir + 0.004 * Math.min(h.windKph, 40) + 0.25 * sun
  }
  let rate = Math.max(m.floor, (h.isDay ? m.kDay : m.kNight) * et)
  if (h.tempC <= 0) rate *= 0.25 // frozen water barely goes anywhere
  return rate
}

// Water on the ground at the end of each hour
export function waterSeries(hours: Hour[], surface: Surface = 'hard', startMm = 0): number[] {
  const m = SURFACES[surface]
  let w = startMm
  let snowBefore = false
  const out: number[] = []
  for (const h of hours) {
    const snowNow = (h.snowDepthCm ?? 0) >= SNOW_CM
    if (snowBefore && !snowNow) w = m.hold // melt-out leaves the ground soaked
    snowBefore = snowNow
    w = Math.min(m.hold, w + Math.max(0, h.rainMm))
    // still raining: next to no drying
    w = Math.max(0, w - dryingRate(h, surface) * (h.rainMm >= RAIN_HOUR_MM ? 0.15 : 1))
    out.push(w)
  }
  return out
}

export function groundOf(h: Hour, waterMm: number, surface: Surface = 'hard'): Ground {
  const m = SURFACES[surface]
  if ((h.snowDepthCm ?? 0) >= SNOW_CM || (h.snowfallCm >= 0.3 && h.tempC <= 1)) return 'snow'
  if (h.tempC <= 0 && waterMm > m.dry) return 'ice'
  if (surface === 'dirt') {
    if (waterMm > m.damp) return 'mud'
    if (h.rainMm >= 1) return 'wet'
    return waterMm > m.dry ? 'drying' : 'dry'
  }
  if (h.rainMm >= RAIN_HOUR_MM || waterMm > m.damp) return 'wet'
  if (waterMm > m.dry) return 'drying'
  return 'dry'
}

// ── One hour's read ──────────────────────────────────────────────────

export function readHour(h: Hour, waterMm: number, traits: SpotTraits = {}): Read {
  const surface = traits.surface ?? 'hard'
  const dirt = surface === 'dirt'
  const ground = groundOf(h, waterMm, surface)
  const raining = h.rainMm >= RAIN_HOUR_MM
  const daylight = h.isDay || traits.lit === true
  const base = { time: h.time, ground, waterMm, raining, daylight, hour: h }
  const out = (status: Status, line: string, score: number): Read => ({ ...base, status, line, score })
  const t = h.tempC, g = h.gustKph

  if (traits.indoor) {
    const outside = ground === 'dry' ? 'dry outside too' : ground === 'drying' ? 'drying outside'
      : ground === 'snow' ? 'snow outside' : ground === 'ice' ? 'icy outside' : raining ? 'raining outside' : 'wet outside'
    return out('skateable', `open whatever the weather (${outside}); check the hours`, ground === 'dry' ? 0.5 : 0.7)
  }

  switch (ground) {
    case 'snow':
      return out('no', `snow on the ground${h.snowDepthCm ? ` — ${r(h.snowDepthCm)} cm` : ''}. Indoor park day`, 0)
    case 'ice':
      return out('no', `${r(t)} °C with water on the ground — ice`, 0.02)
    case 'mud':
      return out('no', `muddy — ${r(waterMm)} mm soaked into the dirt; riding it now ruts the track`, 0.04)
    case 'wet':
      return raining
        ? out('no', `raining — ${h.rainMm.toFixed(1)} mm this hour`, 0.03)
        : out('no', `wet — ${waterMm.toFixed(1)} mm still on the ${surface === 'wood' ? 'ramps' : 'concrete'}`, 0.06)
  }

  if (g >= 55) return out('no', `gusts ${r(g)} km/h — sit it out`, 0.1)
  if (!h.isDay && traits.lit === false) return out('no', 'dark — no lights at this one', 0.08)

  const dark = !h.isDay && traits.lit !== true
  const night = dark ? ' — after dark, bring a light' : ''
  const s = (n: number) => (dark ? n * 0.6 : n)

  if (ground === 'drying') {
    return dirt
      ? out('skateable', `soft — the dirt is still taking water (${waterMm.toFixed(1)} mm); ride light, and stay off if it ruts${night}`, s(0.35))
      : out('skateable', `drying — ${waterMm.toFixed(2)} mm left; damp in the bowl and shady banks${night}`, s(0.35))
  }
  if (dirt && waterMm > 0.3 && waterMm <= SURFACES.dirt.dry && t >= 5 && t <= 28 && g < 30 && !dark) {
    return out('prime', `tacky dirt, ${r(t)} °C — prime`, 0.9)
  }
  if (t >= 35) return out('skateable', `dry, but ${r(t)} °C — ${dirt ? 'dusty and loose' : 'the concrete bakes'}; go early or late${night}`, s(0.45))
  if (t < 3) return out('skateable', `dry at ${r(t)} °C — hard wheels, cold pads; warm up first${night}`, s(0.4))
  if (g >= 38) return out('skateable', `dry, gusts ${r(g)} km/h — airs get pushed around${night}`, s(0.45))
  if ((h.precipProb ?? 0) >= 60) return out('skateable', `dry for now — ${r(h.precipProb ?? 0)}% chance of rain${night}`, s(0.45))
  if (t >= 8 && t <= 30 && g < 30) {
    const sweet = t >= 15 && t <= 24 ? 0.1 : 0
    return dark
      ? out('skateable', `dry and ${r(t)} °C${night}`, 0.5)
      : out('prime', `dry and ${r(t)} °C — prime`, 0.75 + sweet + (g < 20 ? 0.05 : 0))
  }
  return out('skateable', `dry, ${r(t)} °C${night}`, s(0.55))
}

export function readAll(hours: Hour[], water: number[], traits: SpotTraits = {}): Read[] {
  return hours.map((h, i) => readHour(h, water[i] ?? 0, traits))
}

// Hours in, reads out, with the water model run for this spot's surface
export function readHours(hours: Hour[], traits: SpotTraits = {}): Read[] {
  return readAll(hours, waterSeries(hours, traits.surface ?? 'hard'), traits)
}

// ── When will it be dry? ─────────────────────────────────────────────

// The first hour from `from` on where the ground is dry and stays skateable for 2 hours
export function dryBy(reads: Read[], from: number): Read | null {
  for (let i = Math.max(0, from); i < reads.length - 1; i++) {
    const a = reads[i], b = reads[i + 1]
    if ((a.ground === 'dry' || a.ground === 'drying') && a.status !== 'no' && b.status !== 'no' && b.ground !== 'wet' && b.ground !== 'mud') return a
  }
  return null
}

export function whenLabel(time: string, nowTime: string): string {
  const today = dateOf(nowTime)
  const d = dateOf(time)
  const day = d === today ? 'today' : d === nextDate(today) ? 'tomorrow' : weekdayOf(d)
  return `${day} ~${hourLabel(time)}`
}

function nextDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const n = new Date(Date.UTC(y, m - 1, d + 1))
  return n.toISOString().slice(0, 10)
}

// ── Windows ──────────────────────────────────────────────────────────

export interface Window {
  start: string
  end: string
  hours: number
  primeHours: number
  peak: Read
}

const RANK: Record<Status, number> = { prime: 2, skateable: 1, no: 0 }

export function windows(reads: Read[], from: number, top = 3): Window[] {
  const runs: Window[] = []
  let cur: Window | null = null
  const flush = () => { if (cur && cur.hours >= 2) runs.push(cur); cur = null }
  for (let i = Math.max(0, from); i < reads.length; i++) {
    const rd = reads[i]
    if (rd.status === 'no' || !rd.daylight || hourOf(rd.time) < 6) { flush(); continue }
    if (cur && dateOf(cur.start) !== dateOf(rd.time)) flush()
    if (!cur) cur = { start: rd.time, end: rd.time, hours: 1, primeHours: rd.status === 'prime' ? 1 : 0, peak: rd }
    else {
      cur.end = rd.time
      cur.hours += 1
      if (rd.status === 'prime') cur.primeHours += 1
      if (RANK[rd.status] > RANK[cur.peak.status] || (rd.status === cur.peak.status && rd.score > cur.peak.score)) cur.peak = rd
    }
  }
  flush()
  return runs
    .sort((a, b) => b.primeHours - a.primeHours || RANK[b.peak.status] - RANK[a.peak.status] || b.hours - a.hours || a.start.localeCompare(b.start))
    .slice(0, top)
    .sort((a, b) => a.start.localeCompare(b.start))
}

// ── Days ─────────────────────────────────────────────────────────────

export interface DayRead {
  date: string
  status: Status
  label: string
  skateHours: number   // daylight hours that are skateable or prime
  primeHours: number
  rainMm: number
  snowCm: number
  tMin: number
  tMax: number
}

export function dayReads(reads: Read[], from: number): DayRead[] {
  const byDay = new Map<string, Read[]>()
  const startDate = reads[from] ? dateOf(reads[from].time) : null
  for (const rd of reads) {
    const d = dateOf(rd.time)
    if (startDate && d < startDate) continue
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d)!.push(rd)
  }
  const out: DayRead[] = []
  for (const [date, list] of byDay) {
    const lit = list.filter(x => x.hour.isDay)
    const good = lit.filter(x => x.status !== 'no')
    const prime = lit.filter(x => x.status === 'prime')
    const rainMm = list.reduce((s, x) => s + x.hour.rainMm, 0)
    const snowCm = list.reduce((s, x) => s + x.hour.snowfallCm, 0)
    const temps = list.map(x => x.hour.tempC)
    let label: string
    if (lit.length && lit.every(x => x.ground === 'snow')) label = 'Snow'
    else if (good.length === 0) label = rainMm >= 1 ? 'Washout' : 'Wet'
    else if (good.length >= lit.length - 1) label = prime.length >= 3 ? 'Dry all day' : 'Dry'
    else label = `Dry ${hourLabel(good[0].time)}–${hourLabel(good[good.length - 1].time)}`
    out.push({
      date,
      status: prime.length >= 3 ? 'prime' : good.length >= 2 ? 'skateable' : 'no',
      label,
      skateHours: good.length,
      primeHours: prime.length,
      rainMm,
      snowCm,
      tMin: Math.min(...temps),
      tMax: Math.max(...temps),
    })
  }
  return out
}

// ── Labels ───────────────────────────────────────────────────────────

export const GROUND_LABEL: Record<Ground, string> = {
  dry: 'Dry', drying: 'Drying', wet: 'Wet', mud: 'Muddy', snow: 'Snow', ice: 'Ice',
}

export function groundLabel(g: Ground, surface: Surface = 'hard'): string {
  if (surface === 'dirt' && g === 'drying') return 'Soft'
  return GROUND_LABEL[g]
}

export const STATUS_LABEL: Record<Status, string> = {
  prime: 'Prime', skateable: 'Rideable', no: 'Sit it out',
}

// What to bring, from the hour you're heading out
export interface KitLine { lead: string; detail: string }

export function kitFor(h: Hour, ground: Ground): KitLine[] {
  const out: KitLine[] = []
  const t = h.tempC
  if (ground === 'drying') out.push({ lead: 'Damp patches', detail: 'a towel or a push broom for the bottom of the bowl; skip the wet transition and soft dirt lips' })
  if (t >= 30) out.push({ lead: `${r(t)} °C`, detail: 'a litre of water an hour, shade breaks; concrete runs hotter than the air' })
  else if (t < 5) out.push({ lead: `${r(t)} °C`, detail: 'gloves until you are warm; softer wheels and tyre pressure down a touch grip better in the cold' })
  else if (t < 14) out.push({ lead: `${r(t)} °C`, detail: 'a layer you can drop by the fence' })
  if ((h.uv ?? 0) >= 6) out.push({ lead: `UV ${r(h.uv ?? 0)}`, detail: 'sunscreen and a cap; there is rarely shade at a park' })
  if (h.gustKph >= 30) out.push({ lead: `Gusts ${r(h.gustKph)} km/h`, detail: 'keep it low, and watch your board on the deck' })
  out.push({ lead: 'Always', detail: 'a helmet (required at many parks and every track), and pads for transition and dirt' })
  return out
}
