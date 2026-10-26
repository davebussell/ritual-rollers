// A stand-in for api.open-meteo.com for local page checks (the sandbox has no network):
//   node tests/mock-open-meteo.mjs 8787 &  OPEN_METEO_URL=http://127.0.0.1:8787 npm run dev
// Rain yesterday afternoon and this morning, a dry warm afternoon, a wet day after tomorrow.
import { createServer } from 'http'

const port = Number(process.argv[2] ?? 8787)
const pad = n => String(n).padStart(2, '0')

function series(lat, lng) {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2))
  const hours = 24 * 9
  const time = [], t = [], rh = [], p = [], rain = [], showers = [], snow = [], depth = [], w = [], g = [], cc = [], day = [], et = [], prob = [], uv = []
  const seed = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233)) // vary a little by place
  for (let i = 0; i < hours; i++) {
    const d = new Date(start.getTime() + i * 3600e3)
    const h = d.getUTCHours()
    time.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(h)}:00`)
    const isDay = h >= 7 && h <= 18
    const dayN = Math.floor(i / 24)
    const wet = (dayN === 1 && h >= 13 && h <= 17) || (dayN === 2 && h >= 4 && h <= 8 + Math.round(seed * 3)) || (dayN === 4 && h >= 9 && h <= 20)
    t.push(Math.round((12 + 9 * Math.sin(((h - 9) / 24) * 2 * Math.PI) + seed * 4) * 10) / 10)
    rh.push(wet ? 92 : 55); p.push(wet ? 1.8 : 0); rain.push(wet ? 1.8 : 0); showers.push(0); snow.push(0); depth.push(0)
    w.push(12); g.push(wet ? 34 : 20); cc.push(wet ? 100 : 25); day.push(isDay ? 1 : 0)
    et.push(isDay ? (wet ? 0.05 : 0.32) : 0.02); prob.push(wet ? 85 : 10); uv.push(isDay ? 4 : 0)
  }
  const dates = [...new Set(time.map(x => x.slice(0, 10)))]
  const nowStr = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}T${pad(now.getUTCHours())}:15`
  return {
    latitude: lat, longitude: lng, timezone: 'UTC',
    current: { time: nowStr, temperature_2m: 15 },
    hourly: { time, temperature_2m: t, relative_humidity_2m: rh, precipitation: p, rain, showers, snowfall: snow, snow_depth: depth,
      wind_speed_10m: w, wind_gusts_10m: g, cloud_cover: cc, is_day: day, et0_fao_evapotranspiration: et, precipitation_probability: prob, uv_index: uv },
    daily: { time: dates, sunrise: dates.map(x => `${x}T06:50`), sunset: dates.map(x => `${x}T18:20`),
      rain_sum: dates.map((_, i) => [0, 9, 9, 0, 22, 0, 0, 0, 0][i] ?? 0), showers_sum: dates.map(() => 0), snowfall_sum: dates.map(() => 0),
      temperature_2m_max: dates.map(() => 21), temperature_2m_min: dates.map(() => 6), precipitation_probability_max: dates.map(() => 40), uv_index_max: dates.map(() => 4) },
  }
}

createServer((req, res) => {
  const u = new URL(req.url, 'http://x')
  const lats = (u.searchParams.get('latitude') ?? '0').split(',').map(Number)
  const lngs = (u.searchParams.get('longitude') ?? '0').split(',').map(Number)
  const out = lats.map((lat, i) => series(lat, lngs[i]))
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(out.length === 1 ? out[0] : out))
}).listen(port, () => console.log(`mock open-meteo on ${port}`))
