// Skate, roller and bike shops in Canada, the US and Mexico, from OpenStreetMap → data/shops.json.
//   node scripts/fetch-shops.mjs
// Same source as the parks (QLever over the OSM planet). Kinds: "skate" (skateboard and scooter shops, with
// roller: true when they're roller or inline shops) and "bike" (bicycle shops: the BMX and MTB riders' shops).
// Hockey and figure skating shops are left out. Data © OpenStreetMap contributors, ODbL.

import { writeFileSync } from 'fs'

const ENDPOINT = 'https://qlever.dev/api/osm-planet'
const UA = 'RitualRollers/1.0 (ritualrollers.com; dave@clickshift.ca)'
const COUNTRIES = { CA: 1428125, MX: 114686, US: 148838 }
const KEY = k => `<https://www.openstreetmap.org/wiki/Key:${k}>`
const TAGS = ['shop', 'sport', 'name', 'name:en', 'website', 'contact:website', 'url', 'opening_hours', 'addr:housenumber', 'addr:street',
  'addr:city', 'addr:state', 'addr:province', 'brand', 'disused', 'service:bicycle:repair', 'service:bicycle:retail']
const varOf = t => '?' + t.replace(/[^a-z]/g, '_')

const query = rel => `PREFIX ogc: <http://www.opengis.net/rdf#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
SELECT ?o ${TAGS.map(varOf).join(' ')} ?wkt WHERE {
  <https://www.openstreetmap.org/relation/${rel}> ogc:sfContains ?o .
  { ?o ${KEY('shop')} ?s0 . FILTER(REGEX(?s0, "^(skate|skateboard|skateboards|skateshop|skate_shop|skateboarding|bicycle|sports;skate)$")) }
  UNION { ?o ${KEY('shop')} "sports" . ?o ${KEY('sport')} ?sp0 . FILTER(REGEX(?sp0, "skateboard|roller_skating|inline|bmx")) }
  UNION { ?o ${KEY('shop')} ?s1 . FILTER(REGEX(?s1, "^(sports|clothes|surf|shoes|outdoor|second_hand)$")) ?o ${KEY('name')} ?n0 . FILTER(REGEX(?n0, "skate|board ?shop|roller", "i")) }
  ${TAGS.map(t => `OPTIONAL { ?o ${KEY(t)} ${varOf(t)} }`).join('\n  ')}
  ?o geo:hasGeometry/geo:asWKT ?wkt .
}`

const sleep = ms => new Promise(r => setTimeout(r, ms))
async function sparql(q) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: 'query=' + encodeURIComponent(q), signal: AbortSignal.timeout(600_000),
      })
      const text = await res.text()
      if (res.ok && text.trim().startsWith('{')) return JSON.parse(text).results.bindings
      console.warn(`QLever → ${res.status} ${text.slice(0, 100)}`)
    } catch (e) { console.warn(`QLever failed: ${e.message}`) }
    await sleep(15_000 * (attempt + 1))
  }
  return null
}

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

const ICE = /hockey|figure|sharpen|\bice\b|rink|skating club|skate canada|pro skate|penalty box|sports experts|sport chek|play it again|source for sports|national sports|canadian tire|decathlon/i
const SKATE_SHOP = /^(skate|skateboard|skateboards|skateshop|skate_shop|skateboarding|sports;skate)$/
const round = n => Math.round(n * 1e5) / 1e5

function shape(id, t, c, cc) {
  if (t.disused) return null
  const name = t.name ?? t['name:en']
  if (!name) return null
  const shop = t.shop ?? '', sport = (t.sport ?? '').toLowerCase()
  let kind = null, roller = false
  if (shop === 'bicycle') kind = 'bike'
  else if (SKATE_SHOP.test(shop)) kind = 'skate'
  else if (/skateboard|roller_skating|inline/.test(sport)) kind = 'skate'
  else if (/bmx/.test(sport)) kind = 'bike'
  else if (/skateboard|skate ?shop|skateshop|board ?shop|boardshop|skate co|skate supply|roller/i.test(name)) kind = 'skate'
  else if (shop !== 'sports' && /skate/i.test(name)) kind = 'skate'
  if (!kind) return null
  if (kind === 'skate' && ICE.test(name) && !/skateboard/i.test(name + sport)) return null
  if (kind === 'skate' && (/roller_skating|inline/.test(sport) || /roller|inline/i.test(name))) roller = true
  const out = { id, name, kind, lat: round(c.lat), lng: round(c.lng), cc }
  if (roller) out.roller = true
  const web = t.website ?? t['contact:website'] ?? t.url
  if (web && /^https?:\/\//.test(web)) out.web = web
  if (t.opening_hours) out.hours = t.opening_hours
  if (t['addr:street']) out.addr = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
  if (t['addr:city']) out.city = t['addr:city']
  if (t.brand) out.brand = t.brand
  return out
}

const shops = []
const seen = new Set()
for (const [cc, rel] of Object.entries(COUNTRIES)) {
  const rows = await sparql(query(rel))
  if (!rows) throw new Error(`QLever gave nothing for ${cc}`)
  let kept = 0
  for (const row of rows) {
    const m = row.o.value.match(/\/(node|way|relation)\/(\d+)$/)
    const c = row.wkt ? centre(row.wkt.value) : null
    if (!m || !c) continue
    const id = `${m[1][0]}${m[2]}`
    if (seen.has(id)) continue
    const t = {}
    for (const tag of TAGS) { const v = row[varOf(tag).slice(1)]; if (v) t[tag] = v.value }
    const s = shape(id, t, c, cc)
    if (!s) continue
    seen.add(id)
    shops.push(s)
    kept++
  }
  console.log(`${cc}: ${rows.length} rows, ${kept} shops`)
  await sleep(3_000)
}
if (shops.length < 2000) throw new Error(`only ${shops.length} shops — refusing to overwrite`)
shops.sort((a, b) => a.cc.localeCompare(b.cc) || a.lat - b.lat)
writeFileSync('data/shops.json', JSON.stringify({
  source: 'OpenStreetMap contributors, ODbL — https://www.openstreetmap.org/copyright',
  fetched: new Date().toISOString(), count: shops.length, shops,
}) + '\n')
const n = f => shops.filter(f).length
console.log(`wrote ${shops.length} shops: skate ${n(s => s.kind === 'skate')} (roller ${n(s => s.roller)}), bike ${n(s => s.kind === 'bike')}`)
