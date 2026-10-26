// Every skatepark OpenStreetMap knows about in Canada, the US and Mexico → data/skateparks.json.
// Runs in GitHub Actions (.github/workflows/skateparks.yml), which has the open network this needs.
//   node scripts/fetch-skateparks.mjs
// Output is compact on purpose (it ships with the site): one object per park,
//   { id, name, lat, lng, cc, lit, indoor, fee, surface, hours, web, city, region }
// Unnamed parks are kept (name null): the site calls them "Skatepark" and shows the distance.
// Data © OpenStreetMap contributors, ODbL.

import { writeFileSync } from 'fs'

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const UA = 'RitualRollers/1.0 (ritualrollers.com; dave@clickshift.ca)'
const COUNTRIES = ['CA', 'US', 'MX']

const SKATE = '"sport"~"(^|;)skateboard(;|$)"'
const query = cc => `[out:json][timeout:600];
area["ISO3166-1"="${cc}"][admin_level=2]->.a;
(
  nwr["leisure"="pitch"][${SKATE}](area.a);
  nwr["leisure"="skatepark"](area.a);
  nwr["leisure"="sports_centre"][${SKATE}](area.a);
  nwr["leisure"="sports_hall"][${SKATE}](area.a);
  nwr["leisure"="track"][${SKATE}](area.a);
);
out center tags;`

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function overpass(q) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length]
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: 'data=' + encodeURIComponent(q),
        signal: AbortSignal.timeout(660_000),
      })
      const text = await res.text()
      if (res.ok && text.trim().startsWith('{')) {
        const data = JSON.parse(text)
        if (data.remark && /runtime error|timed out/i.test(data.remark)) throw new Error(data.remark)
        return data.elements ?? []
      }
      console.warn(`${url} → ${res.status} ${text.slice(0, 120).replace(/\s+/g, ' ')}`)
    } catch (e) {
      console.warn(`${url} failed: ${e.message}`)
    }
    await sleep(20_000 * (attempt + 1))
  }
  throw new Error('every Overpass mirror failed')
}

const yes = v => v === 'yes' || v === 'true' || v === '1'
const round = n => Math.round(n * 1e5) / 1e5

function shape(el, cc) {
  const t = el.tags ?? {}
  if (t.shop || t.amenity === 'shop') return null
  if (['private', 'no'].includes(t.access)) return null
  if (t.disused || t['disused:leisure'] || t['abandoned:leisure'] || t.demolished) return null
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (lat == null || lng == null) return null
  const indoor = yes(t.indoor) || yes(t.covered) || t.building != null && t.building !== 'no'
    || t.leisure === 'sports_centre' || t.leisure === 'sports_hall'
  const fee = t.fee == null ? null : yes(t.fee) ? true : t.fee === 'no' ? false : null
  const lit = t.lit == null ? null : t.lit !== 'no'
  const out = {
    id: `${el.type[0]}${el.id}`,
    name: t.name ?? t['name:en'] ?? null,
    lat: round(lat),
    lng: round(lng),
    cc,
  }
  if (lit != null) out.lit = lit
  if (indoor) out.indoor = true
  if (fee != null) out.fee = fee
  if (t.surface) out.surface = t.surface
  if (t.opening_hours) out.hours = t.opening_hours
  const web = t.website ?? t['contact:website'] ?? t.url
  if (web) out.web = web
  const city = t['addr:city']
  if (city) out.city = city
  const region = t['addr:state'] ?? t['addr:province']
  if (region) out.region = region
  return out
}

const parks = []
const seen = new Set()
for (const cc of COUNTRIES) {
  const elements = await overpass(query(cc))
  let kept = 0
  for (const el of elements) {
    const p = shape(el, cc)
    if (!p || seen.has(p.id)) continue
    seen.add(p.id)
    parks.push(p)
    kept++
  }
  console.log(`${cc}: ${elements.length} elements, ${kept} parks`)
  await sleep(15_000)
}

// A park mapped as both an area and a point inside it: keep the named area, drop the twin
const km = (a, b) => { const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dg = (b.lng - a.lng) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dg / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
parks.sort((a, b) => a.lat - b.lat)
const dropped = new Set()
for (let i = 0; i < parks.length; i++) {
  for (let j = i + 1; j < parks.length && parks[j].lat - parks[i].lat < 0.001; j++) {
    const a = parks[i], b = parks[j]
    if (dropped.has(a.id) || dropped.has(b.id)) continue
    if (km(a, b) > 0.08) continue
    if (a.name && b.name && a.name !== b.name) continue
    const loser = (a.id[0] === 'n' && b.id[0] !== 'n') || (!a.name && b.name) ? a : b
    dropped.add(loser.id)
  }
}
const final = parks.filter(p => !dropped.has(p.id)).sort((a, b) => a.cc.localeCompare(b.cc) || a.lat - b.lat)

if (final.length < 3000) throw new Error(`only ${final.length} parks — refusing to overwrite the dataset`)

writeFileSync('data/skateparks.json', JSON.stringify({
  source: 'OpenStreetMap contributors, ODbL — https://www.openstreetmap.org/copyright',
  fetched: new Date().toISOString(),
  count: final.length,
  parks: final,
}) + '\n')
const byCc = Object.fromEntries(COUNTRIES.map(cc => [cc, final.filter(p => p.cc === cc).length]))
console.log(`wrote ${final.length} parks (${JSON.stringify(byCc)}), ${dropped.size} twins dropped`)
