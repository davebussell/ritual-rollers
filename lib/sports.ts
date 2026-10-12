// The sport roster and the rules that turn a forecast into a verdict.
// Thresholds are deliberately plain-spoken; every line carries the real number.

export type Family = 'wind' | 'water' | 'mountain' | 'river'

export const FAMILY_META: Record<Family, { label: string; color: string }> = {
  wind: { label: 'Wind', color: '#06b6d4' },
  water: { label: 'Water', color: '#3b82f6' },
  mountain: { label: 'Mountain', color: '#a855f7' },
  river: { label: 'River', color: '#10b981' },
}

export const FAMILY_ORDER: Family[] = ['wind', 'water', 'mountain', 'river']

export interface Sport {
  id: string
  label: string
  family: Family
  emoji: string
}

export const SPORTS: Sport[] = [
  { id: 'kite', label: 'Kitesurf', family: 'wind', emoji: '🪁' },
  { id: 'wing', label: 'Wing foil', family: 'wind', emoji: '🌬️' },
  { id: 'windsurf', label: 'Windsurf', family: 'wind', emoji: '💨' },
  { id: 'sail', label: 'Sailing', family: 'wind', emoji: '⛵' },
  { id: 'paraglide', label: 'Paraglide', family: 'wind', emoji: '🪂' },
  { id: 'surf', label: 'Surf', family: 'water', emoji: '🌊' },
  { id: 'sup', label: 'SUP', family: 'water', emoji: '🏄' },
  { id: 'dive', label: 'Dive & snorkel', family: 'water', emoji: '🤿' },
  { id: 'swim', label: 'Open-water swim', family: 'water', emoji: '🏊' },
  { id: 'ski', label: 'Ski & snowboard', family: 'mountain', emoji: '⛷️' },
  { id: 'mtb', label: 'Mountain bike', family: 'mountain', emoji: '🚵' },
  { id: 'climb', label: 'Climb', family: 'mountain', emoji: '🧗' },
  { id: 'hike', label: 'Hike', family: 'mountain', emoji: '🥾' },
  { id: 'kayak', label: 'Kayak & canoe', family: 'river', emoji: '🛶' },
  { id: 'whitewater', label: 'Whitewater', family: 'river', emoji: '🌀' },
  { id: 'fish', label: 'Fishing', family: 'river', emoji: '🎣' },
]

export const SPORT_BY_ID: Record<string, Sport> = Object.fromEntries(SPORTS.map(s => [s.id, s]))

// One moment in time — "now" or any forecast hour
export interface Snapshot {
  windKph: number
  gustKph: number
  windDirDeg: number
  tempC: number
  precipMm: number
  uv: number | null
  waveM: number | null
  periodS: number | null
  swellM: number | null
  sstC: number | null
  snowCm: number | null
  newSnowCm: number | null
  coastal: boolean
}

export type Status = 'firing' | 'rideable' | 'quiet'

export interface SportVerdict {
  sport: Sport
  status: Status
  line: string
  score: number // 0..1, used to rank hours and days
}

const r = (n: number) => Math.round(n)
const ramp = (x: number, lo: number, hi: number) => Math.max(0, Math.min(1, (x - lo) / (hi - lo)))
const v = (sport: Sport, status: Status, line: string, score: number): SportVerdict => ({ sport, status, line, score })

export function verdictFor(sport: Sport, s: Snapshot): SportVerdict {
  const w = s.windKph, g = s.gustKph, t = s.tempC, p = s.precipMm
  const wave = s.waveM ?? 0, period = s.periodS ?? 0
  const snow = s.snowCm ?? 0, fresh = s.newSnowCm ?? 0

  switch (sport.id) {
    case 'kite':
      if (w > 60) return v(sport, 'quiet', `${r(w)} km/h — nuking, let it settle`, 0.1)
      if (w >= 25) return v(sport, 'firing', `${r(w)} km/h gusting ${r(g)} — kites up`, 0.7 + ramp(w, 25, 40) * 0.3)
      if (w >= 15) return v(sport, 'rideable', `${r(w)} km/h — big kite, worth rigging`, 0.4 + ramp(w, 15, 25) * 0.3)
      return v(sport, 'quiet', `${r(w)} km/h — not enough, foil or wait`, ramp(w, 5, 15) * 0.3)

    case 'wing':
      if (w > 55) return v(sport, 'quiet', `${r(w)} km/h — too much for the wing`, 0.1)
      if (w >= 22) return v(sport, 'firing', `${r(w)} km/h — wing's on, small foil`, 0.7 + ramp(w, 22, 38) * 0.3)
      if (w >= 14) return v(sport, 'rideable', `${r(w)} km/h — big wing, big foil`, 0.4 + ramp(w, 14, 22) * 0.3)
      return v(sport, 'quiet', `${r(w)} km/h — pump it or wait`, ramp(w, 5, 14) * 0.3)

    case 'windsurf':
      if (w > 65) return v(sport, 'quiet', `${r(w)} km/h — survival sailing`, 0.1)
      if (w >= 28) return v(sport, 'firing', `${r(w)} km/h — planing all day`, 0.7 + ramp(w, 28, 45) * 0.3)
      if (w >= 18) return v(sport, 'rideable', `${r(w)} km/h — big sail, you'll plane in gusts`, 0.4 + ramp(w, 18, 28) * 0.3)
      return v(sport, 'quiet', `${r(w)} km/h — light-wind board only`, ramp(w, 6, 18) * 0.3)

    case 'sail':
      if (w > 45) return v(sport, 'quiet', `${r(w)} km/h — small craft warning`, 0.1)
      if (w >= 20) return v(sport, 'firing', `${r(w)} km/h — a proper breeze`, 0.7 + ramp(w, 20, 35) * 0.3)
      if (w >= 10) return v(sport, 'rideable', `${r(w)} km/h — easy sailing`, 0.4 + ramp(w, 10, 20) * 0.3)
      return v(sport, 'quiet', `${r(w)} km/h — drifting`, ramp(w, 3, 10) * 0.3)

    case 'paraglide':
      if (p >= 0.5) return v(sport, 'quiet', `rain — grounded`, 0)
      if (w > 30) return v(sport, 'quiet', `${r(w)} km/h — too strong to launch`, 0.1)
      if (w >= 10 && w <= 22) return v(sport, 'rideable', `${r(w)} km/h — launchable, ridge lift likely`, 0.6)
      if (w >= 5) return v(sport, 'rideable', `${r(w)} km/h — flyable, pick your window`, 0.4)
      return v(sport, 'quiet', `dead calm — no lift`, 0.1)

    case 'surf':
      if (!s.coastal) return v(sport, 'quiet', `no swell inland — find your lake`, 0)
      if (w > 35) return v(sport, 'quiet', `blown out — ${r(w)} km/h`, 0.15)
      if (wave >= 1.2 && period >= 9) return v(sport, 'firing', `${wave.toFixed(1)} m @ ${r(period)} s — it's on`, 0.7 + ramp(wave, 1.2, 2.5) * 0.3)
      if (wave >= 0.6 && period >= 6) return v(sport, 'rideable', `${wave.toFixed(1)} m @ ${r(period)} s — rideable`, 0.4 + ramp(wave, 0.6, 1.2) * 0.3)
      return v(sport, 'quiet', `flat — ${wave.toFixed(1)} m`, ramp(wave, 0.2, 0.6) * 0.3)

    // Fair-weather sports never "fire" — FIRING is reserved for energy (wind, swell, snow,
    // rivers up). Their best band reads as prime-but-RIDEABLE and scores below a real
    // firing day so a kite day always headlines over a nice day to swim.
    case 'sup':
      if (w <= 6 && wave <= 0.2) return v(sport, 'rideable', `glassy — ${r(w)} km/h, prime`, 0.62)
      if (w <= 16 && wave <= 0.6) return v(sport, 'rideable', `${r(w)} km/h — calm enough`, 0.45)
      return v(sport, 'quiet', `choppy — ${r(w)} km/h`, 0.1)

    case 'dive':
      if (s.coastal) {
        if (w <= 10 && wave <= 0.3 && (s.sstC == null || s.sstC >= 18)) return v(sport, 'rideable', `flat and clear — ${wave.toFixed(1)} m${s.sstC != null ? `, ${s.sstC.toFixed(0)} °C` : ''}, prime vis`, 0.62)
        if (w <= 25 && wave <= 1.0) return v(sport, 'rideable', `${wave.toFixed(1)} m — diveable`, 0.45)
        return v(sport, 'quiet', `rough — ${wave.toFixed(1)} m`, 0.1)
      }
      if (w <= 15) return v(sport, 'rideable', `lake or quarry dive — ${r(w)} km/h`, 0.4)
      return v(sport, 'quiet', `${r(w)} km/h — wait for calm`, 0.1)

    case 'swim': {
      if (wave > 1 || w > 30) return v(sport, 'quiet', `choppy — ${r(w)} km/h`, 0.1)
      const sst = s.sstC
      if (sst != null) {
        if (sst >= 24 && w <= 20) return v(sport, 'rideable', `${sst.toFixed(1)} °C water — swim all day`, 0.62)
        if (sst >= 18) return v(sport, 'rideable', `${sst.toFixed(1)} °C — ${sst >= 21 ? 'lovely' : 'brisk'}`, 0.5)
        if (sst >= 14) return v(sport, 'rideable', `${sst.toFixed(1)} °C — wetsuit swim`, 0.35)
        return v(sport, 'quiet', `${sst.toFixed(1)} °C — cold water, suit up`, 0.15)
      }
      if (t >= 22) return v(sport, 'rideable', `air ${r(t)} °C — lake swim`, 0.4)
      return v(sport, 'quiet', `air ${r(t)} °C — no water temp inland`, 0.15)
    }

    case 'ski':
      if (fresh >= 10) return v(sport, 'firing', `${r(fresh)} cm fresh on a ${r(snow)} cm base`, 0.95)
      if (snow >= 60) return v(sport, 'firing', `${r(snow)} cm base — get up there`, 0.8)
      if (snow >= 20) return v(sport, 'rideable', `${r(snow)} cm base`, 0.5)
      return v(sport, 'quiet', `no base — ${r(snow)} cm`, 0.05)

    case 'mtb':
      if (snow > 5) return v(sport, 'quiet', `snow on the trails`, 0.05)
      if (p >= 5) return v(sport, 'quiet', `mud — ${p.toFixed(1)} mm`, 0.1)
      if (p < 0.2 && t >= 14 && t <= 24 && w <= 25) return v(sport, 'rideable', `hero dirt, ${r(t)} °C — prime`, 0.62)
      if (p < 3 && t >= 3 && t <= 32) return v(sport, 'rideable', `${r(t)} °C — rideable`, 0.45)
      return v(sport, 'quiet', `${r(t)} °C — not today`, 0.15)

    case 'climb':
      if (p >= 1) return v(sport, 'quiet', `wet rock`, 0.05)
      if (w > 40) return v(sport, 'quiet', `${r(w)} km/h on the wall`, 0.1)
      if (p < 0.2 && t >= 10 && t <= 18 && w <= 20) return v(sport, 'rideable', `sending temps — ${r(t)} °C`, 0.62)
      if (t >= 2 && t <= 30) return v(sport, 'rideable', `${r(t)} °C — dry rock`, 0.45)
      return v(sport, 'quiet', `${r(t)} °C — too hot or too cold`, 0.15)

    case 'hike':
      if (p >= 8) return v(sport, 'quiet', `soaked — ${p.toFixed(1)} mm`, 0.1)
      if (p < 0.2 && t >= 12 && t <= 22 && w <= 20) return v(sport, 'rideable', `${r(t)} °C, dry and still — prime`, 0.58)
      if (t >= -5 && t <= 32) return v(sport, 'rideable', `${r(t)} °C — layer up`, 0.45)
      return v(sport, 'quiet', `${r(t)} °C — extreme`, 0.15)

    case 'kayak':
      if (w <= 8 && wave <= 0.3) return v(sport, 'rideable', `mirror water — ${r(w)} km/h, prime`, 0.62)
      if (w <= 22 && wave <= 0.8) return v(sport, 'rideable', `${r(w)} km/h — paddleable`, 0.45)
      return v(sport, 'quiet', `wind against you — ${r(w)} km/h`, 0.1)

    case 'whitewater':
      if (p >= 5) return v(sport, 'firing', `rivers up — ${p.toFixed(1)} mm`, 0.85)
      if (p >= 1 || t >= 5) return v(sport, 'rideable', `${r(t)} °C — runnable`, 0.45)
      return v(sport, 'quiet', `low and cold — ${r(t)} °C`, 0.15)

    case 'fish':
      if (w <= 8 && p < 0.2) return v(sport, 'rideable', `dead calm — lines in`, 0.58)
      if (w <= 25) return v(sport, 'rideable', `${r(w)} km/h — fishable`, 0.45)
      return v(sport, 'quiet', `too windy to cast — ${r(w)} km/h`, 0.1)
  }
  return v(sport, 'quiet', 'no read', 0)
}

export function allVerdicts(s: Snapshot): SportVerdict[] {
  return SPORTS.map(sport => verdictFor(sport, s))
}

// ── Windows ──────────────────────────────────────────────────────────

export interface HourPoint { time: string; snap: Snapshot }
export type DaylightMap = Record<string, [number, number]> // date -> [sunrise hour, sunset hour]

export interface WindowHit {
  sportId: string
  start: string
  end: string
  hours: number
  peak: SportVerdict
}

const STATUS_RANK: Record<Status, number> = { firing: 2, rideable: 1, quiet: 0 }

function hourOf(time: string): number { return parseInt(time.slice(11, 13), 10) }
function dateOf(time: string): string { return time.slice(0, 10) }

export function bestWindows(sport: Sport, hourly: HourPoint[], daylight: DaylightMap, top = 3): WindowHit[] {
  const runs: WindowHit[] = []
  let cur: { start: string; end: string; peak: SportVerdict; hours: number } | null = null
  const flush = () => { if (cur && cur.hours >= 2) runs.push({ sportId: sport.id, ...cur }); cur = null }

  for (const h of hourly) {
    const d = dateOf(h.time)
    const [rise, set] = daylight[d] ?? [7, 19]
    const hr = hourOf(h.time)
    const inDaylight = hr >= rise && hr <= set
    const verdict = inDaylight ? verdictFor(sport, h.snap) : null
    if (!verdict || verdict.status === 'quiet') { flush(); continue }
    if (cur && dateOf(cur.start) !== d) flush()
    if (!cur) cur = { start: h.time, end: h.time, peak: verdict, hours: 1 }
    else {
      cur.end = h.time; cur.hours += 1
      if (STATUS_RANK[verdict.status] > STATUS_RANK[cur.peak.status] || (verdict.status === cur.peak.status && verdict.score > cur.peak.score)) cur.peak = verdict
    }
  }
  flush()

  return runs
    .sort((a, b) =>
      STATUS_RANK[b.peak.status] - STATUS_RANK[a.peak.status] ||
      b.peak.score - a.peak.score ||
      b.hours - a.hours)
    .slice(0, top)
}

export interface DaySummary {
  date: string
  top: SportVerdict | null
}

// For each day, the single best sport across its daylight hours
export function daySummaries(hourly: HourPoint[], daylight: DaylightMap): DaySummary[] {
  const byDay = new Map<string, HourPoint[]>()
  for (const h of hourly) {
    const d = dateOf(h.time)
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d)!.push(h)
  }
  const out: DaySummary[] = []
  for (const [date, points] of byDay) {
    const [rise, set] = daylight[date] ?? [7, 19]
    let best: SportVerdict | null = null
    for (const h of points) {
      const hr = hourOf(h.time)
      if (hr < rise || hr > set) continue
      for (const sport of SPORTS) {
        const vd = verdictFor(sport, h.snap)
        if (vd.status === 'quiet') continue
        if (!best || STATUS_RANK[vd.status] > STATUS_RANK[best.status] || (vd.status === best.status && vd.score > best.score)) best = vd
      }
    }
    out.push({ date, top: best })
  }
  return out
}

// ── Kit guide ────────────────────────────────────────────────────────

export interface KitLine { lead: string; detail: string }

export function wetsuitFor(sst: number | null, airC: number): KitLine {
  if (sst == null) {
    return { lead: `No water temp inland`, detail: `judge by air — ${r(airC)} °C. Lakes run colder than they look.` }
  }
  const t = sst.toFixed(1)
  if (sst >= 24) return { lead: `Water ${t} °C`, detail: 'boardshorts and a rash vest' }
  if (sst >= 21) return { lead: `Water ${t} °C`, detail: 'shorty or a 2 mm top; boardshorts if you run warm' }
  if (sst >= 18) return { lead: `Water ${t} °C`, detail: '3/2 full suit' }
  if (sst >= 14) return { lead: `Water ${t} °C`, detail: '4/3 with boots' }
  if (sst >= 10) return { lead: `Water ${t} °C`, detail: '5/4, boots, gloves and a hood' }
  return { lead: `Water ${t} °C`, detail: '6/5 hooded, gloves — or stay dry today' }
}

export function windKitFor(windKph: number): KitLine | null {
  if (windKph < 12) return null
  if (windKph < 15) return { lead: `${r(windKph)} km/h`, detail: 'foil, or your biggest kite' }
  if (windKph < 22) return { lead: `${r(windKph)} km/h`, detail: '10–12 m kite, big board' }
  if (windKph < 30) return { lead: `${r(windKph)} km/h`, detail: '8–10 m kite' }
  if (windKph < 40) return { lead: `${r(windKph)} km/h`, detail: '7–8 m kite, small board' }
  return { lead: `${r(windKph)} km/h`, detail: '5–7 m kite — experienced riders only' }
}

export function sunFor(uv: number | null): KitLine {
  if (uv == null) return { lead: 'UV unknown', detail: 'pack sunscreen anyway' }
  if (uv >= 8) return { lead: `UV ${r(uv)} — extreme`, detail: 'zinc, long sleeves, hat; reapply every hour on the water' }
  if (uv >= 6) return { lead: `UV ${r(uv)} — high`, detail: 'SPF 50 and a long-sleeve top' }
  if (uv >= 3) return { lead: `UV ${r(uv)} — moderate`, detail: 'sunscreen on the exposed bits' }
  return { lead: `UV ${r(uv)} — low`, detail: 'no sun worries today' }
}

export function layersFor(tempC: number, windKph: number): KitLine {
  const feels = tempC - (windKph > 20 ? 3 : 0)
  if (feels < 0) return { lead: `${r(tempC)} °C`, detail: 'insulated shell, gloves, warm hat' }
  if (feels < 8) return { lead: `${r(tempC)} °C`, detail: 'softshell over a mid-layer' }
  if (feels < 16) return { lead: `${r(tempC)} °C`, detail: 'light layer you can stash' }
  if (feels < 26) return { lead: `${r(tempC)} °C`, detail: 'sun shirt, 2 L of water' }
  return { lead: `${r(tempC)} °C`, detail: 'heat day — start early, 3 L of water, shade breaks' }
}

// ── Formatting helpers (string-based so the forecast's local time never gets shifted) ──

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function weekdayOf(date: string): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

export function clockOf(time: string): string {
  return time.slice(11, 16)
}

export function hourLabel(time: string): string {
  const h = hourOf(time)
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

export function compassOf(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8]
}

export function countryFlag(alpha2: string | null | undefined): string {
  if (!alpha2 || alpha2.length !== 2) return ''
  return alpha2.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
}
