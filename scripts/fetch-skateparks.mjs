// Every wheels spot OpenStreetMap knows about in Canada, the US and Mexico → data/parks.json:
// skateparks, pump tracks, BMX tracks and bike / dirt jump parks.
//   node scripts/fetch-skateparks.mjs
// Source: the QLever SPARQL endpoint over the OpenStreetMap planet (qlever.dev, University of
// Freiburg), which answers a whole country in seconds where the public Overpass servers time out.
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
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json', 'User-Agent': UA },
        body: 'query=' + encodeURIComponent(q),
        signal: AbortSignal.timeout(300_000),
      })
      const text = await res.text()
      if (res.ok && text.trim().startsWith('{')) return JSON.parse(text).results.bindings
      console.warn(`QLever → ${res.status} ${text.slice(0, 160).replace(/\s+/g, ' ')}`)
    } catch (e) {
      console.warn(`QLever failed: ${e.message}`)
    }
    await sleep(20_000 * (attempt + 1))
  }
  throw new Error('QLever did not answer')
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

function shape(row, cc) {
  const t = {}
  for (const tag of TAGS) { const v = row[varOf(tag).slice(1)]; if (v) t[tag] = v.value }
  if (t.shop || t.club || t.office) return null
  if (['private', 'no'].includes(t.access)) return null
  if (t.disused || t.demolished) return null
  if (t.leisure && !PLACES.has(t.leisure)) return null
  const kind = kindOf(t)
  if (!kind) return null
  if (!t.leisure && kind !== 'skate' && !t.name) return null
  const iri = row.o.value // https://www.openstreetmap.org/way/123
  const m = iri.match(/\/(node|way|relation)\/(\d+)$/)
  if (!m) return null
  const c = centre(row.wkt.value)
  if (!c) return null
  const indoor = yes(t.indoor) || yes(t.covered) || (t.building != null && t.building !== 'no')
    || t.leisure === 'sports_centre' || t.leisure === 'sports_hall'
  const fee = t.fee == null ? null : yes(t.fee) ? true : t.fee === 'no' ? false : null
  const lit = t.lit == null ? null : t.lit !== 'no'
  const out = { id: `${m[1][0]}${m[2]}`, name: t.name ?? t['name:en'] ?? null, lat: round(c.lat), lng: round(c.lng), cc, kind }
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
  let kept = 0
  for (const row of rows) {
    const p = shape(row, cc)
    if (!p || seen.has(p.id)) continue
    seen.add(p.id)
    parks.push(p)
    kept++
  }
  console.log(`${cc}: ${rows.length} rows, ${kept} spots`)
  await sleep(3_000)
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

const count = f => final.filter(f).length
writeFileSync('data/parks.json', JSON.stringify({
  source: 'OpenStreetMap contributors, ODbL — https://www.openstreetmap.org/copyright (via qlever.dev)',
  fetched: new Date().toISOString(),
  count: final.length,
  parks: final,
}) + '\n')
console.log(`wrote ${final.length} spots; ` + Object.keys(COUNTRIES).map(cc => `${cc} ${count(p => p.cc === cc)}`).join(', ')
  + '; ' + ['skate', 'pump', 'bmx', 'bike'].map(k => `${k} ${count(p => p.kind === k)}`).join(', ') + `; ${dropped.size} twins dropped`)
