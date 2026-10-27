// Build data/cities.json: the city hubs (/cities/<slug>).
//   node scripts/build-cities.mjs
// A hub is a metro from the list below, or a town with a featured spot that no metro covers (more than
// HUB_KM away). Metro centres come from OpenStreetMap's Nominatim, cached in research/cities/geocode.json so a
// rebuild only asks for new names (one request a second, generic User-Agent, per Nominatim's usage policy).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'

const HUB_KM = 40

// name, region (province/state, as Nominatim and the spot data spell it), country
const METROS = [
  // Canada
  ['Toronto', 'Ontario', 'CA'], ['Montreal', 'Quebec', 'CA'], ['Vancouver', 'British Columbia', 'CA'], ['Calgary', 'Alberta', 'CA'],
  ['Edmonton', 'Alberta', 'CA'], ['Ottawa', 'Ontario', 'CA'], ['Winnipeg', 'Manitoba', 'CA'], ['Quebec City', 'Quebec', 'CA'],
  ['Hamilton', 'Ontario', 'CA'], ['Kitchener', 'Ontario', 'CA'], ['London', 'Ontario', 'CA'], ['Victoria', 'British Columbia', 'CA'],
  ['Halifax', 'Nova Scotia', 'CA'], ['Saskatoon', 'Saskatchewan', 'CA'], ['Regina', 'Saskatchewan', 'CA'],
  ["St. John's", 'Newfoundland and Labrador', 'CA'], ['Kelowna', 'British Columbia', 'CA'], ['Sherbrooke', 'Quebec', 'CA'],
  ['Trois-Rivières', 'Quebec', 'CA'], ['Moncton', 'New Brunswick', 'CA'], ['Fredericton', 'New Brunswick', 'CA'],
  ['Charlottetown', 'Prince Edward Island', 'CA'], ['Windsor', 'Ontario', 'CA'], ['Barrie', 'Ontario', 'CA'], ['Kingston', 'Ontario', 'CA'],
  ['Sudbury', 'Ontario', 'CA'], ['Thunder Bay', 'Ontario', 'CA'], ['Whistler', 'British Columbia', 'CA'], ['Squamish', 'British Columbia', 'CA'],
  ['Nanaimo', 'British Columbia', 'CA'], ['Kamloops', 'British Columbia', 'CA'], ['Lethbridge', 'Alberta', 'CA'], ['Red Deer', 'Alberta', 'CA'],
  // United States
  ['New York', 'New York', 'US'], ['Los Angeles', 'California', 'US'], ['Chicago', 'Illinois', 'US'], ['Houston', 'Texas', 'US'],
  ['Phoenix', 'Arizona', 'US'], ['Philadelphia', 'Pennsylvania', 'US'], ['San Antonio', 'Texas', 'US'], ['San Diego', 'California', 'US'],
  ['Dallas', 'Texas', 'US'], ['San Jose', 'California', 'US'], ['Austin', 'Texas', 'US'], ['Jacksonville', 'Florida', 'US'],
  ['Columbus', 'Ohio', 'US'], ['Charlotte', 'North Carolina', 'US'], ['Indianapolis', 'Indiana', 'US'], ['San Francisco', 'California', 'US'],
  ['Oakland', 'California', 'US'], ['Seattle', 'Washington', 'US'], ['Denver', 'Colorado', 'US'], ['Washington', 'District of Columbia', 'US'],
  ['Nashville', 'Tennessee', 'US'], ['Oklahoma City', 'Oklahoma', 'US'], ['El Paso', 'Texas', 'US'], ['Boston', 'Massachusetts', 'US'],
  ['Portland', 'Oregon', 'US'], ['Las Vegas', 'Nevada', 'US'], ['Detroit', 'Michigan', 'US'], ['Memphis', 'Tennessee', 'US'],
  ['Louisville', 'Kentucky', 'US'], ['Baltimore', 'Maryland', 'US'], ['Milwaukee', 'Wisconsin', 'US'], ['Albuquerque', 'New Mexico', 'US'],
  ['Tucson', 'Arizona', 'US'], ['Fresno', 'California', 'US'], ['Sacramento', 'California', 'US'], ['Kansas City', 'Missouri', 'US'],
  ['Atlanta', 'Georgia', 'US'], ['Miami', 'Florida', 'US'], ['Omaha', 'Nebraska', 'US'], ['Raleigh', 'North Carolina', 'US'],
  ['Minneapolis', 'Minnesota', 'US'], ['Tulsa', 'Oklahoma', 'US'], ['Tampa', 'Florida', 'US'], ['New Orleans', 'Louisiana', 'US'],
  ['Cleveland', 'Ohio', 'US'], ['Honolulu', 'Hawaii', 'US'], ['Anchorage', 'Alaska', 'US'], ['Pittsburgh', 'Pennsylvania', 'US'],
  ['Cincinnati', 'Ohio', 'US'], ['St. Louis', 'Missouri', 'US'], ['Orlando', 'Florida', 'US'], ['Salt Lake City', 'Utah', 'US'],
  ['Boise', 'Idaho', 'US'], ['Richmond', 'Virginia', 'US'], ['Buffalo', 'New York', 'US'], ['Spokane', 'Washington', 'US'],
  ['Des Moines', 'Iowa', 'US'], ['Birmingham', 'Alabama', 'US'], ['Reno', 'Nevada', 'US'], ['Santa Cruz', 'California', 'US'],
  ['Bend', 'Oregon', 'US'], ['Burlington', 'Vermont', 'US'], ['Providence', 'Rhode Island', 'US'], ['Asheville', 'North Carolina', 'US'],
  ['Madison', 'Wisconsin', 'US'], ['Charleston', 'South Carolina', 'US'], ['Savannah', 'Georgia', 'US'], ['Long Beach', 'California', 'US'],
  // Mexico
  ['Mexico City', 'Ciudad de México', 'MX'], ['Guadalajara', 'Jalisco', 'MX'], ['Monterrey', 'Nuevo León', 'MX'], ['Tijuana', 'Baja California', 'MX'],
  ['Puebla', 'Puebla', 'MX'], ['Mérida', 'Yucatán', 'MX'], ['Oaxaca', 'Oaxaca', 'MX'], ['Querétaro', 'Querétaro', 'MX'], ['León', 'Guanajuato', 'MX'],
  ['Cancún', 'Quintana Roo', 'MX'], ['Puerto Vallarta', 'Jalisco', 'MX'], ['Chihuahua', 'Chihuahua', 'MX'], ['Hermosillo', 'Sonora', 'MX'],
  ['Ensenada', 'Baja California', 'MX'], ['Aguascalientes', 'Aguascalientes', 'MX'], ['San Luis Potosí', 'San Luis Potosí', 'MX'],
  ['Morelia', 'Michoacán', 'MX'], ['Toluca', 'México', 'MX'],
]

const COUNTRY_NAME = { CA: 'Canada', US: 'United States', MX: 'Mexico' }
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const km = (a, b) => { const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dg = (b.lng - a.lng) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dg / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
const sleep = ms => new Promise(r => setTimeout(r, ms))

mkdirSync('research/cities', { recursive: true })
const CACHE = 'research/cities/geocode.json'
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}

async function geocode(name, region, cc) {
  const key = `${name}|${region}|${cc}`
  if (cache[key]) return cache[key]
  const q = `${name}, ${region}, ${COUNTRY_NAME[cc]}`
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=en&countrycodes=${cc.toLowerCase()}&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { 'User-Agent': 'RitualRollers/1.0 (ritualrollers.com)' } })
  await sleep(1100)
  if (!res.ok) throw new Error(`nominatim ${res.status} for ${q}`)
  const hit = (await res.json())[0]
  if (!hit) { console.warn('not found:', q); return null }
  cache[key] = { lat: +(+hit.lat).toFixed(4), lng: +(+hit.lon).toFixed(4) }
  writeFileSync(CACHE, JSON.stringify(cache, null, 1) + '\n')
  return cache[key]
}

const spots = JSON.parse(readFileSync('data/spots.json', 'utf8'))
const hubs = []
for (const [name, region, country] of METROS) {
  const at = await geocode(name, region, country)
  if (at) hubs.push({ name, region, country, ...at, metro: true })
}

// Towns with a featured spot that no metro covers become hubs of their own, centred on their spots.
const towns = new Map()
for (const s of spots) {
  if (hubs.some(h => km(h, s) <= HUB_KM)) continue
  const key = `${s.city}|${s.region}|${s.country}`
  const t = towns.get(key) ?? { name: s.city, region: s.region, country: s.country, pts: [] }
  t.pts.push(s); towns.set(key, t)
}
for (const t of towns.values()) {
  const lat = t.pts.reduce((a, p) => a + p.lat, 0) / t.pts.length
  const lng = t.pts.reduce((a, p) => a + p.lng, 0) / t.pts.length
  if (hubs.some(h => km(h, { lat, lng }) <= HUB_KM / 2)) continue
  hubs.push({ name: t.name, region: t.region, country: t.country, lat: +lat.toFixed(4), lng: +lng.toFixed(4), metro: false })
}

// Slugs: the name, or name-region when two hubs share a name
const count = {}
for (const h of hubs) count[norm(h.name)] = (count[norm(h.name)] ?? 0) + 1
for (const h of hubs) h.slug = count[norm(h.name)] > 1 ? `${norm(h.name)}-${norm(h.region)}` : norm(h.name)

// How much is there: featured spots within HUB_KM
for (const h of hubs) h.spots = spots.filter(s => km(h, s) <= HUB_KM).length

hubs.sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name))
writeFileSync('data/cities.json', JSON.stringify(hubs, null, 1) + '\n')
const by = hubs.reduce((m, h) => (m[h.country] = (m[h.country] ?? 0) + 1, m), {})
console.log(`wrote ${hubs.length} cities — ${JSON.stringify(by)} — ${hubs.filter(h => !h.metro).length} towns outside the metros`)
