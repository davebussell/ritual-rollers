// Every wheels spot OpenStreetMap knows about in Canada, the US and Mexico → data/parks.json:
// skateparks, pump tracks, BMX tracks and bike / dirt jump parks.
//   node scripts/fetch-skateparks.mjs
// Source: the QLever SPARQL endpoint over the OpenStreetMap planet (qlever.dev, University of
// Freiburg), which answers a whole country in seconds; when QLever refuses (it blocks some cloud
// networks, GitHub's runners among them) the public Overpass servers, fetched in tiles.
// Runs in GitHub Actions (.github/workflows/skateparks.yml) and anywhere else with network.
// Output is compact on purpose (it ships with the site): one object per spot,
//   { id, name, lat, lng, cc, kind, sports?, lit?, indoor?, fee?, surface?, hours?, web?, city?, region? }
// kind: "skate" | "pump" | "bmx" | "bike". Unnamed spots are kept (name null): the site calls them
// by their kind and shows the distance. Data © OpenStreetMap contributors, ODbL.

import { writeFileSync } from 'fs'

const ENDPOINT = 'https://qlever.dev/api/osm-planet'
const UA = 'RitualRollers/1.0 (ritualrollers.com; dave@clickshift.ca)'
// OSM country relations
const COUNTRIES = { CA: 1428125, MX: 114686, US: 148838 }

const KEY = k => `<https://www.openstreetmap.org/wiki/Key:${k}>`
const TAGS = ['sport', 'leisure', 'name', 'name:en', 'lit', 'indoor', 'covered', 'building', 'fee', 'surface', 'opening_hours',
  'website', 'contact:website', 'url', 'addr:city', 'addr:state', 'addr:province', 'access', 'shop', 'club', 'office',
  'disused', 'demolished', 'bmx', 'track']
const varOf = t => '?' + t.replace(/[^a-z]/g, '_')

const query = rel => `PREFIX ogc: <http://www.opengis.net/rdf#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
SELECT ?o ${TAGS.map(varOf).join(' ')} ?wkt WHERE {
  <https://www.openstreetmap.org/relation/${rel}> ogc:sfContains ?o .
  { ?o ${KEY('sport')} ?s0 . FILTER(REGEX(?s0, "skateboard|bmx|pump|mtb|scooter|dirt_jump|freestyle")) }
  UNION { ?o ${KEY('leisure')} "skatepark" }
  UNION { ?o ${KEY('leisure')} ?l0 . FILTER(?l0 = "track" || ?l0 = "pitch") ?o ${KEY('name')} ?n0 . FILTER(REGEX(?n0, "pump ?track|bmx|bike park|dirt jump", "i")) }
  ${TAGS.map(t => `OPTIONAL { ?o ${KEY(t)} ${varOf(t)} }`).join('\n  ')}
  ?o geo:hasGeometry/geo:asWKT ?wkt .
}`

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function sparql(q) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const init = { headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA }, signal: AbortSignal.timeout(300_000) }
      const res = attempt % 2 === 0
        ? await fetch(`${ENDPOINT}?query=${encodeURIComponent(q)}`, init)
        : await fetch(ENDPOINT, { ...init, method: 'POST', headers: { ...init.headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'query=' + encodeURIComponent(q) })
      const text = await res.text()
      if (res.ok && text.trim().startsWith('{')) return JSON.parse(text).results.bindings
      console.warn(`QLever → ${res.status} ${text.slice(0, 80).replace(/\s+/g, ' ')}`)
      if (res.status === 403 && attempt >= 1) return null // blocked from here: use Overpass
    } catch (e) {
      console.warn(`QLever failed: ${e.message}`)
    }
    await sleep(10_000 * (attempt + 1))
  }
  return null
}

// QLever rows → plain elements { id, tags, lat, lng }
function fromQlever(rows) {
  const out = []
  for (const row of rows) {
    const m = row.o.value.match(/\/(node|way|relation)\/(\d+)$/)
    const c = row.wkt ? centre(row.wkt.value) : null
    if (!m || !c) continue
    const tags = {}
    for (const tag of TAGS) { const v = row[varOf(tag).slice(1)]; if (v) tags[tag] = v.value }
    out.push({ id: `${m[1][0]}${m[2]}`, tags, lat: c.lat, lng: c.lng })
  }
  return out
}

// ── Overpass fallback ────────────────────────────────────────────────
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
// Country-wide queries time out when the servers are busy, so each country goes in tiles
// (south, west, north, east), clipped to the country's own area.
const TILES = {
  CA: [[41.5, -141, 84, -120], [41.5, -120, 84, -100], [41.5, -100, 84, -80], [41.5, -80, 84, -52]],
  MX: [[14, -118.5, 33, -104], [14, -104, 33, -86]],
  US: [
    [24, -125, 50, -115], [24, -115, 50, -105], [24, -105, 50, -97], [24, -97, 50, -90],
    [24, -90, 50, -84], [24, -84, 50, -78], [24, -78, 50, -66],
    [51, -180, 72, -129], [18, -161, 23, -154],
  ],
}
const overpassQuery = (cc, [so, w, n, e]) => {
  const b = `(${so},${w},${n},${e})`
  return `[out:json][timeout:300];
area["ISO3166-1"="${cc}"][admin_level=2]->.a;
(
  nwr["sport"~"skateboard|bmx|pump|mtb|scooter|dirt_jump|freestyle"](area.a)${b};
  nwr["leisure"="skatepark"](area.a)${b};
  nwr["leisure"~"^(track|pitch)$"]["name"~"pump ?track|bmx|bike park|dirt jump",i](area.a)${b};
);
out center tags;`
}

async function overpass(cc) {
  const out = []
  for (const tile of TILES[cc]) {
    let elements = null
    for (let attempt = 0; attempt < 9 && !elements; attempt++) {
      const url = MIRRORS[attempt % MIRRORS.length]
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
          body: 'data=' + encodeURIComponent(overpassQuery(cc, tile)),
          signal: AbortSignal.timeout(360_000),
        })
        const text = await res.text()
        if (res.ok && text.trim().startsWith('{')) {
          const data = JSON.parse(text)
          if (data.remark && /runtime error|timed out|out of memory/i.test(data.remark)) throw new Error(data.remark)
          elements = data.elements ?? []
        } else console.warn(`${url} → ${res.status}`)
      } catch (e) {
        console.warn(`${url} failed: ${e.message}`)
      }
      if (!elements) await sleep(15_000 * (attempt + 1))
    }
    if (!elements) throw new Error(`Overpass: every mirror failed for ${cc} ${tile}`)
    for (const el of elements) {
      const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon
      if (lat == null || lng == null) continue
      out.push({ id: `${el.type[0]}${el.id}`, tags: el.tags ?? {}, lat, lng })
    }
    await sleep(5_000)
  }
  return out
}

// The middle of a geometry: the centre of its bounding box (good enough for a park pin)
function centre(wkt) {
  const nums = wkt.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/gi)?.map(Number) ?? []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i], y = nums[i + 1]
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  return Number.isFinite(minX) ? { lat: (minY + maxY) / 2, lng: (minX + maxX) / 2 } : null
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
  const t = el.tags
  if (t.shop || t.club || t.office || t.route || t.type === 'route') return null
  if (['private', 'no'].includes(t.access)) return null
  if (t.disused || t.demolished || t['disused:leisure'] || t['abandoned:leisure']) return null
  if (t.leisure && !PLACES.has(t.leisure)) return null
  const kind = kindOf(t)
  if (!kind) return null
  if (!t.leisure && kind !== 'skate' && !t.name) return null
  const c = { lat: el.lat, lng: el.lng }
  const indoor = yes(t.indoor) || yes(t.covered) || (t.building != null && t.building !== 'no')
    || t.leisure === 'sports_centre' || t.leisure === 'sports_hall'
  const fee = t.fee == null ? null : yes(t.fee) ? true : t.fee === 'no' ? false : null
  const lit = t.lit == null ? null : t.lit !== 'no'
  const out = { id: el.id, name: t.name ?? t['name:en'] ?? null, lat: round(c.lat), lng: round(c.lng), cc, kind }
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
for (const [cc, rel] of Object.entries(COUNTRIES)) {
  const rows = await sparql(query(rel))
  const elements = rows ? fromQlever(rows) : await overpass(cc)
  let kept = 0
  for (const el of elements) {
    const p = shape(el, cc)
    if (!p || seen.has(p.id)) continue
    seen.add(p.id)
    parks.push(p)
    kept++
  }
  console.log(`${cc}: ${elements.length} elements from ${rows ? 'QLever' : 'Overpass'}, ${kept} spots`)
  await sleep(3_000)
}

// The same spot mapped twice (an area and a point inside it, or two overlapping areas): keep the
// named one, or the area. Same name within 400 m, named + unnamed within 150 m, two unnamed within 100 m.
const km = (a, b) => { const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dg = (b.lng - a.lng) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dg / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
const same = s => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
parks.sort((a, b) => a.lat - b.lat)
const dropped = new Set()
for (let i = 0; i < parks.length; i++) {
  for (let j = i + 1; j < parks.length && parks[j].lat - parks[i].lat < 0.004; j++) {
    const a = parks[i], b = parks[j]
    if (dropped.has(a.id) || dropped.has(b.id) || a.kind !== b.kind) continue
    const d = km(a, b)
    const limit = a.name && b.name ? (same(a.name) === same(b.name) ? 0.4 : 0) : a.name || b.name ? 0.15 : 0.1
    if (d > limit) continue
    const loser = (!a.name && b.name) ? a : (a.name && !b.name) ? b : (a.id[0] === 'n' && b.id[0] !== 'n') ? a : b
    dropped.add(loser.id)
  }
}
const final = parks.filter(p => !dropped.has(p.id)).sort((a, b) => a.cc.localeCompare(b.cc) || a.lat - b.lat)

if (final.length < 3000) throw new Error(`only ${final.length} spots — refusing to overwrite the dataset`)

const count = f => final.filter(f).length
writeFileSync('data/parks.json', JSON.stringify({
  source: 'OpenStreetMap contributors, ODbL — https://www.openstreetmap.org/copyright',
  fetched: new Date().toISOString(),
  count: final.length,
  parks: final,
}) + '\n')
console.log(`wrote ${final.length} spots; ` + Object.keys(COUNTRIES).map(cc => `${cc} ${count(p => p.cc === cc)}`).join(', ')
  + '; ' + ['skate', 'pump', 'bmx', 'bike'].map(k => `${k} ${count(p => p.kind === k)}`).join(', ') + `; ${dropped.size} twins dropped`)
