// Seven-day forecast for a spot, shaped for the sports engine.
// Open-Meteo forecast + marine, both free and keyless. Server- and client-safe.

import type { Snapshot, HourPoint, DaylightMap } from '@/lib/sports'

export interface DayForecast {
  date: string
  sunrise: string
  sunset: string
  uvMax: number | null
  windMax: number
  gustMax: number
  windDirDominant: number
  precipSum: number
  snowfallSum: number
  tempMax: number
  tempMin: number
  waveMax: number | null
  periodMax: number | null
}

export interface SpotForecast {
  fetchedAt: string
  timezone: string
  localTime: string
  coastal: boolean
  current: Snapshot
  hourly: HourPoint[]
  daily: DayForecast[]
  daylight: DaylightMap
}

const UA = { 'User-Agent': 'RitualRollers/1.0 (ritualrollers.com)' }
const num = (x: unknown): number => { const n = Number(x); return Number.isFinite(n) ? n : 0 }
const maybe = (x: unknown): number | null => (x == null ? null : Number.isFinite(Number(x)) ? Number(x) : null)

async function getJson(url: string, revalidate: number): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { headers: UA, next: { revalidate }, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const FORECAST_VARS = {
  current: 'temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,snow_depth,uv_index',
  hourly: 'temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,uv_index,snow_depth,snowfall',
  daily: 'sunrise,sunset,uv_index_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,precipitation_sum,snowfall_sum,temperature_2m_max,temperature_2m_min',
}
const MARINE_VARS = {
  current: 'wave_height,wave_period,wave_direction,sea_surface_temperature,swell_wave_height',
  hourly: 'wave_height,wave_period,sea_surface_temperature,swell_wave_height',
  daily: 'wave_height_max,wave_period_max',
}

type Series = Record<string, unknown[]>

export async function fetchSpotForecast(lat: number, lng: number): Promise<SpotForecast | null> {
  const base = `latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&forecast_days=7&timezone=auto`
  const [fc, marine] = await Promise.all([
    getJson(`https://api.open-meteo.com/v1/forecast?${base}&current=${FORECAST_VARS.current}&hourly=${FORECAST_VARS.hourly}&daily=${FORECAST_VARS.daily}`, 900),
    getJson(`https://marine-api.open-meteo.com/v1/marine?${base}&current=${MARINE_VARS.current}&hourly=${MARINE_VARS.hourly}&daily=${MARINE_VARS.daily}`, 900),
  ])
  if (!fc) return null

  const cur = (fc.current ?? {}) as Record<string, unknown>
  const hourly = (fc.hourly ?? {}) as Series
  const daily = (fc.daily ?? {}) as Series
  const mcur = ((marine?.current ?? {}) as Record<string, unknown>)
  const mhourly = ((marine?.hourly ?? {}) as Series)
  const mdaily = ((marine?.daily ?? {}) as Series)

  // Coastal if the marine model actually has a wave reading for this point
  const coastal = maybe(mcur.wave_height) != null

  // Today's fresh snow (daily snowfall sum, cm) feeds the ski verdict
  const todaySnowfall = maybe(daily.snowfall_sum?.[0])

  const current: Snapshot = {
    windKph: num(cur.wind_speed_10m),
    gustKph: num(cur.wind_gusts_10m),
    windDirDeg: num(cur.wind_direction_10m),
    tempC: num(cur.temperature_2m),
    precipMm: num(cur.precipitation),
    uv: maybe(cur.uv_index),
    waveM: coastal ? maybe(mcur.wave_height) : null,
    periodS: coastal ? maybe(mcur.wave_period) : null,
    swellM: coastal ? maybe(mcur.swell_wave_height) : null,
    sstC: coastal ? maybe(mcur.sea_surface_temperature) : null,
    snowCm: cur.snow_depth != null ? Math.round(num(cur.snow_depth) * 100) : null,
    newSnowCm: todaySnowfall,
    coastal,
  }

  const times = (hourly.time ?? []) as string[]
  const mtimes = (mhourly.time ?? []) as string[]
  const mIndex = new Map(mtimes.map((t, i) => [t, i]))
  const dayIndex = new Map(((daily.time ?? []) as string[]).map((d, i) => [d, i]))

  const points: HourPoint[] = times.map((time, i) => {
    const mi = mIndex.get(time)
    const di = dayIndex.get(time.slice(0, 10))
    const snowfallToday = di != null ? maybe(daily.snowfall_sum?.[di]) : null
    return {
      time,
      snap: {
        windKph: num(hourly.wind_speed_10m?.[i]),
        gustKph: num(hourly.wind_gusts_10m?.[i]),
        windDirDeg: num(hourly.wind_direction_10m?.[i]),
        tempC: num(hourly.temperature_2m?.[i]),
        precipMm: num(hourly.precipitation?.[i]),
        uv: maybe(hourly.uv_index?.[i]),
        waveM: coastal && mi != null ? maybe(mhourly.wave_height?.[mi]) : null,
        periodS: coastal && mi != null ? maybe(mhourly.wave_period?.[mi]) : null,
        swellM: coastal && mi != null ? maybe(mhourly.swell_wave_height?.[mi]) : null,
        sstC: coastal && mi != null ? maybe(mhourly.sea_surface_temperature?.[mi]) : null,
        snowCm: hourly.snow_depth?.[i] != null ? Math.round(num(hourly.snow_depth[i]) * 100) : null,
        newSnowCm: snowfallToday,
        coastal,
      },
    }
  })

  const days: DayForecast[] = ((daily.time ?? []) as string[]).map((date, i) => ({
    date,
    sunrise: String(daily.sunrise?.[i] ?? ''),
    sunset: String(daily.sunset?.[i] ?? ''),
    uvMax: maybe(daily.uv_index_max?.[i]),
    windMax: num(daily.wind_speed_10m_max?.[i]),
    gustMax: num(daily.wind_gusts_10m_max?.[i]),
    windDirDominant: num(daily.wind_direction_10m_dominant?.[i]),
    precipSum: num(daily.precipitation_sum?.[i]),
    snowfallSum: num(daily.snowfall_sum?.[i]),
    tempMax: num(daily.temperature_2m_max?.[i]),
    tempMin: num(daily.temperature_2m_min?.[i]),
    waveMax: coastal ? maybe(mdaily.wave_height_max?.[i]) : null,
    periodMax: coastal ? maybe(mdaily.wave_period_max?.[i]) : null,
  }))

  const daylight: DaylightMap = {}
  for (const d of days) {
    const rise = parseInt(d.sunrise.slice(11, 13), 10)
    const set = parseInt(d.sunset.slice(11, 13), 10)
    daylight[d.date] = [Number.isFinite(rise) ? rise : 7, Number.isFinite(set) ? set : 19]
  }

  return {
    fetchedAt: new Date().toISOString(),
    timezone: String(fc.timezone ?? 'UTC'),
    localTime: String(cur.time ?? ''),
    coastal,
    current,
    hourly: points,
    daily: days,
    daylight,
  }
}

// Lightweight "right now" read for the home-page strip — two small calls, cached 15 min
export async function fetchCurrentSnapshot(lat: number, lng: number): Promise<Snapshot | null> {
  const base = `latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&timezone=auto`
  const [fc, marine] = await Promise.all([
    getJson(`https://api.open-meteo.com/v1/forecast?${base}&current=${FORECAST_VARS.current}&daily=snowfall_sum&forecast_days=1`, 900),
    getJson(`https://marine-api.open-meteo.com/v1/marine?${base}&current=${MARINE_VARS.current}`, 900),
  ])
  if (!fc) return null
  const cur = (fc.current ?? {}) as Record<string, unknown>
  const mcur = ((marine?.current ?? {}) as Record<string, unknown>)
  const coastal = maybe(mcur.wave_height) != null
  const daily = (fc.daily ?? {}) as Series
  return {
    windKph: num(cur.wind_speed_10m),
    gustKph: num(cur.wind_gusts_10m),
    windDirDeg: num(cur.wind_direction_10m),
    tempC: num(cur.temperature_2m),
    precipMm: num(cur.precipitation),
    uv: maybe(cur.uv_index),
    waveM: coastal ? maybe(mcur.wave_height) : null,
    periodS: coastal ? maybe(mcur.wave_period) : null,
    swellM: coastal ? maybe(mcur.swell_wave_height) : null,
    sstC: coastal ? maybe(mcur.sea_surface_temperature) : null,
    snowCm: cur.snow_depth != null ? Math.round(num(cur.snow_depth) * 100) : null,
    newSnowCm: maybe(daily.snowfall_sum?.[0]),
    coastal,
  }
}
