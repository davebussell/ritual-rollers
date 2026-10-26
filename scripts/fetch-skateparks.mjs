// Every wheels spot OpenStreetMap knows about in Canada, the US and Mexico → data/parks.json:
// skateparks, pump tracks, BMX tracks and bike / dirt jump parks.
// Runs in GitHub Actions (.github/workflows/skateparks.yml), which has the open network this needs.
//   node scripts/fetch-skateparks.mjs
// Output is compact on purpose (it ships with the site): one object per spot,
//   { id, name, lat, lng, cc, kind, sports?, lit?, indoor?, fee?, surface?, hours?, web?, city?, region? }
// kind: "skate" | "pump" | "bmx" | "bike". Unnamed spots are kept (name null): the site calls them
// by their kind and shows the distance. Data © OpenStreetMap contributors, ODbL.

import { writeFileSync } from 'fs'

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const UA = 'RitualRollers/1.0 (ritualrollers.com; dave@clickshift.ca)'
const COUNTRIES = ['CA', 'MX', 'US']

// Country-wide queries time out when the public servers are busy, so each country is fetched in
// longitude/latitude tiles (south, west, north, east), clipped to the country's own area.
const TILES = {
  CA: [[41.5, -141, 84, -120], [41.5, -120, 84, -100], [41.5, -100, 84, -80], [41.5, -80, 84, -52]],
  MX: [[14, -118.5, 33, -104], [14, -104, 33, -86]],
  US: [
    [24, -125, 50, -115], [24, -115, 50, -105], [24, -105, 50, -97], [24, -97, 50, -90],
    [24, -90, 50, -84], [24, -84, 50, -78], [24, -78, 50, -66],
    [51, -180, 72, -129], [18, -161, 23, -154],
  ],
}

const query = (cc, [s, w, n, e]) => {
  const b = `(${s},${w},${n},${e})`
  return `[out:json][timeout:300];
area["ISO3166-1"="${cc}"][admin_level=2]->.a;
(
  nwr["sport"~"skateboard|bmx|pump|mtb|scooter|dirt_jump|freestyle"](area.a)${b};
  nwr["leisure"="skatepark"](area.a)${b};
  nwr["leisure"~"^(track|pitch)$"]["name"~"pump ?track|bmx|bike park|dirt jump",i](area.a)${b};
);
out center tags;`
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function overpass(q) {
  for (let attempt = 0; attempt < 9; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length]
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: 'data=' + encodeURIComponent(q),
        signal: AbortSignal.timeout(360_000),
      })
      const text = await res.text()
      if (res.ok && text.trim().startsWith('{')) {
        const data = JSON.parse(text)
        if (data.remark && /runtime error|timed out|out of memory/i.test(data.remark)) throw new Error(data.remark)
        return data.elements ?? []
      }
      console.warn(`${url} → ${res.status} ${text.slice(0, 120).replace(/\s+/g, ' ')}`)
    } catch (e) {
      console.warn(`${url} failed: ${e.message}`)
    }
    await sleep(15_000 * (attempt + 1))
  }
  throw new Error('every Overpass mirror failed')
}

const yes = v => v === 'yes' || v === 'true' || v === '1'
const round = n => Math.round(n * 1e5) / 1e5
const PLACES = new Set(['pitch', 'track', 'skatepark', 'sports_centre', 'sports_hall', 'park', 'recreation_ground', 'playground'])

function kindOf(t) {
  const sport = (t.sport ?? '').toLowerCase()
  const name = (t.name ?? '').toLowerCase()
  if (sport.includes('skateboard') || t.leisure === 'skatepark') return 'skate'
  if (/pump/.test(sport) || /pump ?track/.test(name) || /pump/.test(t.bmx ?? '') || /pump/.test(t.track ?? '')) return 'pump'
  if (sport.includes('bmx') && (t.leisure === 'track' || /bmx/.test(name))) return 'bmx'
  if (sport.includes('bmx') || sport.includes('mtb') || sport.includes('dirt_jump') || /bike park|dirt jump|skills park/.test(name)) return 'bike'
  if (sport.includes('scooter') || sport.includes('freestyle')) return 'skate'
  return null
}

function shape(el, cc) {
  const t = el.tags ?? {}
  if (t.shop || t.club || t.office || t.route || t.type === 'route') return null
  if (['private', 'no'].includes(t.access)) return null
  if (t.disused || t['disused:leisure'] || t['abandoned:leisure'] || t.demolished || t['demolished:leisure']) return null
  if (t.leisure && !PLACES.has(t.leisure)) return null
  const kind = kindOf(t)
  if (!kind) return null
  if (!t.leisure && kind !== 'skate' && !t.name) return null
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (lat == null || lng == null) return null
  const indoor = yes(t.indoor) || yes(t.covered) || (t.building != null && t.building !== 'no')
    || t.leisure === 'sports_centre' || t.leisure === 'sports_hall'
  const fee = t.fee == null ? null : yes(t.fee) ? true : t.fee === 'no' ? false : null
  const lit = t.lit == null ? null : t.lit !== 'no'
  const out = { id: `${el.type[0]}${el.id}`, name: t.name ?? t['name:en'] ?? null, lat: round(lat), lng: round(lng), cc, kind }
  const sports = (t.sport ?? '').split(';').map(s => s.trim()).filter(Boolean)
  if (sports.length) out.sports = sports
  if (lit != null) out.lit = lit
  if (indoor) out.indoor = true
  if (fee != null) out.fee = fee
  if (t.surface) out.surface = t.surface
  if (t.opening_hours) out.hours = t.opening_hours
  const web = t.website ?? t['contact:website'] ?? t.url
  if (web) out.web = web
  if (t['addr:city']) out.city = t['addr:city']
  const region = t['addr:state'] ?? t['addr:province']
  if (region) out.region = region
  return out
}

const parks = []
const seen = new Set()
for (const cc of COUNTRIES) {
  let kept = 0, total = 0
  for (const tile of TILES[cc]) {
    const elements = await overpass(query(cc, tile))
    total += elements.length
    for (const el of elements) {
      const p = shape(el, cc)
      if (!p || seen.has(p.id)) continue
      seen.add(p.id)
      parks.push(p)
      kept++
    }
    console.log(`${cc} ${tile.join(',')}: ${elements.length} elements`)
    await sleep(5_000)
  }
  console.log(`${cc}: ${total} elements, ${kept} spots`)
}

// A spot mapped as both an area and a point inside it: keep the named area, drop the twin
const km = (a, b) => { const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dg = (b.lng - a.lng) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dg / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
parks.sort((a, b) => a.lat - b.lat)
const dropped = new Set()
for (let i = 0; i < parks.length; i++) {
  for (let j = i + 1; j < parks.length && parks[j].lat - parks[i].lat < 0.001; j++) {
    const a = parks[i], b = parks[j]
    if (dropped.has(a.id) || dropped.has(b.id) || a.kind !== b.kind) continue
    if (km(a, b) > 0.08) continue
    if (a.name && b.name && a.name !== b.name) continue
    const loser = (a.id[0] === 'n' && b.id[0] !== 'n') || (!a.name && b.name) ? a : b
    dropped.add(loser.id)
  }
}
const final = parks.filter(p => !dropped.has(p.id)).sort((a, b) => a.cc.localeCompare(b.cc) || a.lat - b.lat)

if (final.length < 3000) throw new Error(`only ${final.length} spots — refusing to overwrite the dataset`)

const count = (f) => final.filter(f).length
writeFileSync('data/parks.json', JSON.stringify({
  source: 'OpenStreetMap contributors, ODbL — https://www.openstreetmap.org/copyright',
  fetched: new Date().toISOString(),
  count: final.length,
  parks: final,
}) + '\n')
console.log(`wrote ${final.length} spots; ` + ['CA', 'MX', 'US'].map(cc => `${cc} ${count(p => p.cc === cc)}`).join(', ')
  + '; ' + ['skate', 'pump', 'bmx', 'bike'].map(k => `${k} ${count(p => p.kind === k)}`).join(', ') + `; ${dropped.size} twins dropped`)
