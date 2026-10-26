// Weather for a ride read: the last two days (so yesterday's rain still counts this
// morning) and the next seven, hour by hour, from Open-Meteo (free, keyless).
// Server- and client-safe.

import type { Hour } from '@/lib/skate'

export interface DayForecast {
  date: string
  sunrise: string
  sunset: string
  rainMm: number
  snowCm: number
  tMax: number
  tMin: number
  rainProb: number | null
  uvMax: number | null
}

export interface SkateForecast {
  fetchedAt: string
  timezone: string
  localTime: string     // the model's "now", local
  nowIndex: number      // index into hours for the current hour
  hours: Hour[]         // 48 h back, 7 days ahead (feed to readHours with the spot's traits)
  daily: DayForecast[]  // today onwards
}

const UA = { 'User-Agent': 'RitualRollers/1.0 (ritualrollers.com)' }
// Overridable so local checks can point at a mock (tests/mock-open-meteo.mjs)
const API = process.env.OPEN_METEO_URL ?? 'https://api.open-meteo.com'
const num = (x: unknown): number => { const n = Number(x); return Number.isFinite(n) ? n : 0 }
const maybe = (x: unknown): number | null => (x == null ? null : Number.isFinite(Number(x)) ? Number(x) : null)

async function getJson(url: string, revalidate: number): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: UA, next: { revalidate }, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const HOURLY = 'temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,snow_depth,wind_speed_10m,wind_gusts_10m,cloud_cover,is_day,et0_fao_evapotranspiration,precipitation_probability,uv_index'
const DAILY = 'sunrise,sunset,rain_sum,showers_sum,snowfall_sum,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max'

type Series = Record<string, unknown[]>

function shape(fc: Record<string, unknown>): SkateForecast | null {
  const hourly = (fc.hourly ?? {}) as Series
  const daily = (fc.daily ?? {}) as Series
  const times = (hourly.time ?? []) as string[]
  if (!times.length) return null

  const hours: Hour[] = times.map((time, i) => {
    const rain = maybe(hourly.rain?.[i])
    const showers = maybe(hourly.showers?.[i])
    const precip = num(hourly.precipitation?.[i])
    const snowfall = num(hourly.snowfall?.[i])
    const liquid = rain != null || showers != null ? (rain ?? 0) + (showers ?? 0) : Math.max(0, precip - snowfall * 0.7)
    const depth = maybe(hourly.snow_depth?.[i])
    return {
      time,
      tempC: num(hourly.temperature_2m?.[i]),
      rh: maybe(hourly.relative_humidity_2m?.[i]),
      precipMm: precip,
      rainMm: liquid,
      snowfallCm: snowfall,
      snowDepthCm: depth == null ? null : depth * 100,
      windKph: num(hourly.wind_speed_10m?.[i]),
      gustKph: num(hourly.wind_gusts_10m?.[i]),
      cloudPct: maybe(hourly.cloud_cover?.[i]),
      isDay: num(hourly.is_day?.[i]) === 1,
      et0Mm: maybe(hourly.et0_fao_evapotranspiration?.[i]),
      precipProb: maybe(hourly.precipitation_probability?.[i]),
      uv: maybe(hourly.uv_index?.[i]),
    }
  })

  const cur = (fc.current ?? {}) as Record<string, unknown>
  const localTime = String(cur.time ?? '')
  const nowHour = localTime ? `${localTime.slice(0, 13)}:00` : ''
  let nowIndex = times.indexOf(nowHour)
  if (nowIndex < 0) nowIndex = Math.min(times.length - 1, 48)

  const today = nowHour.slice(0, 10) || times[nowIndex].slice(0, 10)
  const days: DayForecast[] = []
  ;((daily.time ?? []) as string[]).forEach((date, i) => {
    if (date < today) return
    days.push({
      date,
      sunrise: String(daily.sunrise?.[i] ?? ''),
      sunset: String(daily.sunset?.[i] ?? ''),
      rainMm: num(daily.rain_sum?.[i]) + num(daily.showers_sum?.[i]),
      snowCm: num(daily.snowfall_sum?.[i]),
      tMax: num(daily.temperature_2m_max?.[i]),
      tMin: num(daily.temperature_2m_min?.[i]),
      rainProb: maybe(daily.precipitation_probability_max?.[i]),
      uvMax: maybe(daily.uv_index_max?.[i]),
    })
  })

  return {
    fetchedAt: new Date().toISOString(),
    timezone: String(fc.timezone ?? 'UTC'),
    localTime,
    nowIndex,
    hours,
    daily: days,
  }
}

const base = (lat: number, lng: number) =>
  `latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&timezone=auto&past_days=2`

export async function fetchSkateForecast(lat: number, lng: number): Promise<SkateForecast | null> {
  const fc = await getJson(
    `${API}/v1/forecast?${base(lat, lng)}&forecast_days=7&current=temperature_2m&hourly=${HOURLY}&daily=${DAILY}`,
    900,
  )
  if (!fc || typeof fc !== 'object') return null
  return shape(fc as Record<string, unknown>)
}

// Several places in one call (Open-Meteo takes comma-separated coordinates). Two days back and
// two ahead is enough for "dry right now" and "dry later today". Returns one entry per point,
// null where the point failed.
export async function fetchSkateForecasts(points: { lat: number; lng: number }[]): Promise<(SkateForecast | null)[]> {
  if (points.length === 0) return []
  const lats = points.map(p => p.lat.toFixed(4)).join(',')
  const lngs = points.map(p => p.lng.toFixed(4)).join(',')
  const data = await getJson(
    `${API}/v1/forecast?latitude=${lats}&longitude=${lngs}&timezone=auto&past_days=2&forecast_days=2&current=temperature_2m&hourly=${HOURLY}&daily=${DAILY}`,
    1800,
  )
  if (!data) return points.map(() => null)
  const list = Array.isArray(data) ? data : [data]
  return points.map((_, i) => (list[i] && typeof list[i] === 'object' ? shape(list[i] as Record<string, unknown>) : null))
}
