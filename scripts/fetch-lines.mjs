// The lines inside every park in data/parks.json, from OpenStreetMap → public/lines/<id>.json and data/lines-index.json.
//   node scripts/fetch-lines.mjs            (after scripts/fetch-skateparks.mjs; reads data/parks.json)
// For each park: its outline (when it's mapped as an area), and for bike parks, pump tracks and BMX tracks the trails
// and track lines inside it, with names and difficulty. The trail maps on park pages and the 3D ride (/ride/<id>) read
// these files. Same source as the parks: the QLever SPARQL endpoint over the OSM planet (qlever.dev).
// Data © OpenStreetMap contributors, ODbL.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'

const ENDPOINT = 'https://qlever.dev/api/osm-planet'
const UA = 'RitualRollers/1.0 (ritualrollers.com; dave@clickshift.ca)'
const COUNTRIES = { CA: 1428125, MX: 114686, US: 148838 }
const OUT_DIR = 'public/lines'
const SOURCE = 'OpenStreetMap contributors, ODbL — https://www.openstreetmap.org/copyright'

const KEY = k => `<https://www.openstreetmap.org/wiki/Key:${k}>`
const varOf = t => '?' + t.replace(/[^a-z]/g, '_')
const PARK_FILTER = (v, withSkate) => `
  { ${v} ${KEY('sport')} ?s0 . FILTER(REGEX(?s0, "${withSkate ? 'skateboard|scooter|freestyle|' : ''}bmx|pump|mtb|dirt_jump")) }
  ${withSkate ? `UNION { ${v} ${KEY('leisure')} "skatepark" }` : ''}
  UNION { ${v} ${KEY('leisure')} ?l0 . FILTER(?l0 = "track" || ?l0 = "pitch") ${v} ${KEY('name')} ?n0 . FILTER(REGEX(?n0, "pump ?track|bmx|bike park|dirt jump", "i")) }`

// Every park's own shape (so skateparks get an outline too)
const outlineQuery = rel => `PREFIX ogc: <http://www.opengis.net/rdf#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
SELECT ?o ?leisure ?wkt WHERE {
  <https://www.openstreetmap.org/relation/${rel}> ogc:sfContains ?o .
  ${PARK_FILTER('?o', true)}
  FILTER(!STRSTARTS(STR(?o), "https://www.openstreetmap.org/node/"))
  OPTIONAL { ?o ${KEY('leisure')} ?leisure }
  ?o geo:hasGeometry/geo:asWKT ?wkt .
}`

// Ways that cross a bike park, pump track or BMX track
const LINE_TAGS = ['highway', 'leisure', 'sport', 'mtb:scale', 'mtb:scale:imba', 'mtb', 'name', 'surface', 'oneway',
  'oneway:bicycle', 'bicycle', 'access', 'incline', 'width', 'bmx', 'disused', 'area']
const linesQuery = rel => `PREFIX ogc: <http://www.opengis.net/rdf#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
SELECT ?park ?w ${LINE_TAGS.map(varOf).join(' ')} ?wkt WHERE {
  <https://www.openstreetmap.org/relation/${rel}> ogc:sfContains ?park .
  ${PARK_FILTER('?park', false)}
  ?park ogc:sfIntersects ?w .
  FILTER(STRSTARTS(STR(?w), "https://www.openstreetmap.org/way/"))
  { ?w ${KEY('highway')} ?h1 } UNION { ?w ${KEY('leisure')} "track" } UNION { ?w ${KEY('mtb:scale')} ?m1 } UNION { ?w ${KEY('mtb:scale:imba')} ?m2 }
  ${LINE_TAGS.map(t => `OPTIONAL { ?w ${KEY(t)} ${varOf(t)} }`).join('\n  ')}
  ?w geo:hasGeometry/geo:asWKT ?wkt .
}`

const sleep = ms => new Promise(r => setTimeout(r, ms))

// LINES_CACHE=<dir> keeps the raw answers, so the files can be rebuilt without asking QLever again
const CACHE = process.env.LINES_CACHE
async function sparql(q, label) {
  const cacheFile = CACHE ? `${CACHE}/${label}.json` : null
  if (cacheFile && existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8'))
  const rows = await ask(q, label)
  if (cacheFile && rows) { mkdirSync(CACHE, { recursive: true }); writeFileSync(cacheFile, JSON.stringify(rows)) }
  return rows
}

async function ask(q, label) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const t = Date.now()
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: 'query=' + encodeURIComponent(q),
        signal: AbortSignal.timeout(600_000),
      })
      const text = await res.text()
      if (res.ok && text.trim().startsWith('{')) {
        const rows = JSON.parse(text).results.bindings
        console.log(`  ${label}: ${rows.length} rows in ${Math.round((Date.now() - t) / 1000)} s`)
        return rows
      }
      console.warn(`  ${label}: QLever → ${res.status} ${text.slice(0, 100).replace(/\s+/g, ' ')}`)
    } catch (e) {
      console.warn(`  ${label}: QLever failed: ${e.message}`)
    }
    await sleep(15_000 * (attempt + 1))
  }
  return null
}

const osmId = iri => { const m = iri.match(/\/(node|way|relation)\/(\d+)$/); return m ? m[1][0] + m[2] : null }

// ── Geometry ──────────────────────────────────────────────────────────
// WKT → rings / lines as [[lng, lat], ...]
function parseWkt(wkt) {
  const type = wkt.slice(0, wkt.indexOf('(')).trim().toUpperCase()
  const groups = []
  // every innermost parenthesised run of coordinates
  for (const m of wkt.matchAll(/\(([^()]+)\)/g)) {
    groups.push(m[1].split(',').map(pair => pair.trim().split(/\s+/).map(Number)).filter(c => c.length >= 2 && c.every(Number.isFinite)))
  }
  return { type, groups }
}

// Polygons: the outer rings only (the first ring of each polygon). MULTIPOLYGON nests one level deeper.
function outerRings(wkt) {
  const { type, groups } = parseWkt(wkt)
  if (type === 'POLYGON') return groups.length ? [groups[0]] : []
  if (type === 'MULTIPOLYGON') {
    const rings = []
    // split by polygon: "((a),(hole)),((b))" — the first ring after each "((" is an outer ring
    const body = wkt.slice(wkt.indexOf('(') + 1, wkt.lastIndexOf(')'))
    for (const poly of body.split(/\)\s*\)\s*,\s*\(\s*\(/)) {
      const first = poly.replace(/^[\s(]+/, '').split(/\)\s*,\s*\(/)[0].replace(/[()]/g, '')
      const ring = first.split(',').map(p => p.trim().split(/\s+/).map(Number)).filter(c => c.length >= 2 && c.every(Number.isFinite))
      if (ring.length >= 4) rings.push(ring)
    }
    return rings
  }
  return []
}

const R = 6371008.8
// metres per degree at a latitude
const mPerDeg = lat => ({ x: (Math.PI / 180) * R * Math.cos((lat * Math.PI) / 180), y: (Math.PI / 180) * R })

function lengthM(coords) {
  let d = 0
  for (let i = 1; i < coords.length; i++) {
    const k = mPerDeg(coords[i][1])
    d += Math.hypot((coords[i][0] - coords[i - 1][0]) * k.x, (coords[i][1] - coords[i - 1][1]) * k.y)
  }
  return d
}

function inRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const inRings = (p, rings) => rings.some(r => inRing(p, r))

// Share of a line's length that lies inside the park (sampled every ~5 m)
function shareInside(coords, rings) {
  if (!rings.length) return 1
  let inside = 0, total = 0
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1], b = coords[i]
    const k = mPerDeg(b[1])
    const seg = Math.hypot((b[0] - a[0]) * k.x, (b[1] - a[1]) * k.y)
    const steps = Math.max(1, Math.ceil(seg / 5))
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps
      if (inRings([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], rings)) inside += seg / steps
    }
    total += seg
  }
  return total ? inside / total : 0
}

// Douglas–Peucker in local metres
function simplify(coords, tolM) {
  if (coords.length < 3) return coords
  const k = mPerDeg(coords[0][1])
  const pts = coords.map(([x, y]) => [x * k.x, y * k.y])
  const keep = new Uint8Array(coords.length)
  keep[0] = keep[coords.length - 1] = 1
  const stack = [[0, coords.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    let max = 0, idx = -1
    const [ax, ay] = pts[a], [bx, by] = pts[b]
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i]
      let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0
      t = Math.max(0, Math.min(1, t))
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
      if (d > max) { max = d; idx = i }
    }
    if (max > tolM && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]) }
  }
  return coords.filter((_, i) => keep[i])
}

const r6 = n => Math.round(n * 1e6) / 1e6
const round6 = coords => coords.map(([x, y]) => [r6(x), r6(y)])

// ── What a line is ───────────────────────────────────────────────────
// Difficulty, as North American trail signs show it. mtb:scale:imba first (0 easiest … 4 extremely difficult),
// else mtb:scale (the Singletrail scale, S0 … S6), else unrated.
function difficulty(t) {
  const imba = parseInt(t['mtb:scale:imba'], 10)
  if (Number.isFinite(imba)) return imba <= 1 ? 'green' : imba === 2 ? 'blue' : imba === 3 ? 'black' : 'double'
  const s = parseInt(String(t['mtb:scale'] ?? '').replace(/[^0-9]/g, ''), 10)
  if (Number.isFinite(s)) return s === 0 ? 'green' : s === 1 ? 'blue' : s === 2 ? 'black' : 'double'
  return null
}

const RIDEABLE_HIGHWAY = new Set(['path', 'track', 'cycleway', 'bridleway'])
const yes = v => v === 'yes' || v === 'designated' || v === 'permissive'

// trail (a bike trail), track (a BMX or pump track line) or path (a plain path through the park), or null to drop it.
// In a bike park, a line tagged leisure=track is one of its courses (Valmont maps its trails that way): a trail.
function lineKind(t, parkKind) {
  if (t.disused || ['private', 'no'].includes(t.access)) return null
  const sport = t.sport ?? ''
  if (t['mtb:scale'] != null || t['mtb:scale:imba'] != null || yes(t.mtb) || /mtb/.test(sport)) return 'trail'
  if (t.leisure === 'track' || /bmx|pump|dirt_jump|cycling/.test(sport)) {
    return parkKind === 'bike' && !/bmx|pump/.test(sport) ? 'trail' : 'track'
  }
  if (t.highway === 'footway' && yes(t.bicycle)) return 'path'
  if (RIDEABLE_HIGHWAY.has(t.highway) && t.bicycle !== 'no') return 'path'
  return null
}

function oneway(t) {
  const v = t['oneway:bicycle'] ?? t.oneway
  return v === 'yes' || v === '1' ? 1 : v === '-1' ? -1 : 0
}

// ── Joining ways into trails ─────────────────────────────────────────
// OSM splits a trail into many ways. Join ways end to end where exactly two of them meet and they carry the same
// name, difficulty and kind, so a ride runs the whole trail.
function mergeWays(ways) {
  const key = c => `${c[0].toFixed(6)},${c[1].toFixed(6)}`
  const ends = new Map()
  const add = (k, w) => { if (!ends.has(k)) ends.set(k, []); ends.get(k).push(w) }
  for (const w of ways) { add(key(w.coords[0]), w); add(key(w.coords[w.coords.length - 1]), w) }
  const same = (a, b) => a.name === b.name && a.diff === b.diff && a.kind === b.kind && a.surface === b.surface
  const used = new Set()
  const out = []
  for (const start of ways) {
    if (used.has(start)) continue
    used.add(start)
    let coords = [...start.coords]
    const ids = [start.id]
    let ow = start.oneway
    // grow forwards, then backwards
    for (const dir of ['end', 'start']) {
      for (;;) {
        const tip = dir === 'end' ? coords[coords.length - 1] : coords[0]
        const at = ends.get(key(tip)) ?? []
        if (at.length !== 2) break
        const next = at.find(w => !used.has(w))
        if (!next || !same(next, start)) break
        let c = [...next.coords]
        const nextStartsHere = key(c[0]) === key(tip)
        if (dir === 'end' && !nextStartsHere) { c.reverse(); if (next.oneway) ow = 0 }
        if (dir === 'start' && nextStartsHere) { c.reverse(); if (next.oneway) ow = 0 }
        coords = dir === 'end' ? coords.concat(c.slice(1)) : c.slice(0, -1).concat(coords)
        used.add(next)
        ids.push(next.id)
        if (key(coords[0]) === key(coords[coords.length - 1])) break   // closed the loop
      }
    }
    out.push({ ...start, coords, ids, oneway: ow })
  }
  return out
}

// ── Run ──────────────────────────────────────────────────────────────
const { parks } = JSON.parse(readFileSync('data/parks.json', 'utf8'))
const PARK = new Map(parks.map(p => [p.id, p]))
const LINE_KINDS = new Set(['pump', 'bmx', 'bike'])

const outlines = new Map()   // park id → { rings, leisure, line? }
const waysByPark = new Map() // park id → Map(way id → { tags, wkt })

for (const [cc, rel] of Object.entries(COUNTRIES)) {
  console.log(cc)
  const o = await sparql(outlineQuery(rel), `outlines-${cc}`)
  if (!o) throw new Error(`no outlines for ${cc}`)
  for (const row of o) {
    const id = osmId(row.o.value)
    if (!PARK.has(id)) continue
    const wkt = row.wkt.value
    const rings = outerRings(wkt)
    const entry = outlines.get(id) ?? { rings: [], leisure: row.leisure?.value }
    if (rings.length) entry.rings = rings
    else if (/^LINESTRING/i.test(wkt)) entry.line = parseWkt(wkt).groups[0]   // a track mapped as a line, not an area
    outlines.set(id, entry)
  }
  if (!CACHE) await sleep(3_000)
  const l = await sparql(linesQuery(rel), `lines-${cc}`)
  if (!l) throw new Error(`no lines for ${cc}`)
  for (const row of l) {
    const park = osmId(row.park.value), w = osmId(row.w.value)
    if (!PARK.has(park) || !LINE_KINDS.has(PARK.get(park).kind)) continue
    if (!waysByPark.has(park)) waysByPark.set(park, new Map())
    if (waysByPark.get(park).has(w)) continue
    const tags = {}
    for (const t of LINE_TAGS) { const v = row[varOf(t).slice(1)]; if (v) tags[t] = v.value }
    waysByPark.get(park).set(w, { tags, wkt: row.wkt.value })
  }
  if (!CACHE) await sleep(3_000)
}

if (outlines.size < 3000) throw new Error(`only ${outlines.size} outlines — refusing to overwrite`)

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

const index = {}
let files = 0, rideable = 0, totalLines = 0
for (const p of parks) {
  const o = outlines.get(p.id)
  const rings = (o?.rings ?? []).map(r => round6(simplify(r, 0.8))).filter(r => r.length >= 4)
  const ways = []
  // a park mapped as a point has no area to look inside (a point on a trail would claim the whole trail)
  const lineWays = p.id[0] === 'n' ? [] : waysByPark.get(p.id) ?? []
  for (const [id, { tags, wkt }] of lineWays) {
    if (id === p.id) continue
    const kind = lineKind(tags, p.kind)
    if (!kind) continue
    const g = parseWkt(wkt)
    // closed ways come back as polygons: ride their ring
    const coords = g.type === 'LINESTRING' ? g.groups[0] : g.type === 'POLYGON' ? g.groups[0] : null
    if (!coords || coords.length < 2) continue
    const share = shareInside(coords, o?.rings ?? [])
    // a trail mostly in the park, or a plain path almost all inside it (not a road or greenway passing through)
    if (share < (kind === 'path' ? 0.7 : 0.4)) continue
    ways.push({ id, kind, name: tags.name ?? null, diff: kind === 'trail' || kind === 'path' ? difficulty(tags) : null,
      surface: tags.surface ?? null, oneway: oneway(tags), coords })
  }
  // A pump or BMX track mapped as a line, or as a track area with nothing drawn inside it: ride the shape itself
  let fromOutline = false
  if ((p.kind === 'pump' || p.kind === 'bmx') && !ways.some(w => w.kind === 'track')) {
    if (o?.line?.length >= 2) ways.push({ id: p.id, kind: 'track', name: p.name, diff: null, surface: p.surface ?? null, oneway: 0, coords: o.line })
    else if (o?.leisure === 'track' && o.rings[0] && !ways.length) {
      ways.push({ id: p.id, kind: 'track', name: p.name, diff: null, surface: p.surface ?? null, oneway: 0, coords: o.rings[0] })
      fromOutline = true
    }
  }
  const lines = mergeWays(ways)
    .map(w => ({ ...w, coords: round6(simplify(w.coords, 0.25)) }))
    .map(w => ({ ...w, m: Math.round(lengthM(w.coords)) }))
    .filter(w => w.m >= 8)
    .sort((a, b) => (a.kind === b.kind ? b.m - a.m : a.kind === 'path' ? 1 : b.kind === 'path' ? -1 : 0))
  if (!rings.length && !lines.length) continue

  const file = {
    source: SOURCE,
    id: p.id, name: p.name, kind: p.kind,
    outline: rings,
    lines: lines.map(w => {
      const out = { id: w.ids[0], kind: w.kind, name: w.name, m: w.m, c: w.coords }
      if (w.diff) out.diff = w.diff
      if (w.surface) out.surface = w.surface
      if (w.oneway) out.oneway = w.oneway
      if (w.ids.length > 1) out.ways = w.ids
      return out
    }),
  }
  if (fromOutline) file.fromOutline = true
  writeFileSync(`${OUT_DIR}/${p.id}.json`, JSON.stringify(file))
  files++
  totalLines += lines.length

  // The index ships with the site (server-side): enough to list trails and decide what's rideable
  const ride = lines.filter(w => w.kind !== 'path' && w.m >= 30)
  const entry = { o: rings.length ? 1 : 0 }
  if (lines.length) {
    entry.n = lines.length
    entry.m = lines.reduce((s, w) => s + w.m, 0)
    const d = { green: 0, blue: 0, black: 0, double: 0 }
    for (const w of lines) if (w.diff) d[w.diff]++
    if (d.green + d.blue + d.black + d.double) entry.d = d
    // named trails and tracks, merged by name, longest first
    const named = new Map()
    for (const w of lines) if (w.name && w.kind !== 'path') {
      const e = named.get(w.name) ?? { m: 0, diff: w.diff, kind: w.kind }
      e.m += w.m
      named.set(w.name, e)
    }
    if (named.size) entry.t = [...named].sort((a, b) => b[1].m - a[1].m).slice(0, 40).map(([n, e]) => [n, e.diff ?? e.kind, e.m])
  }
  if (ride.length && LINE_KINDS.has(p.kind)) { entry.r = 1; rideable++ }
  if (fromOutline) entry.fo = 1
  index[p.id] = entry
}

writeFileSync('data/lines-index.json', JSON.stringify({ source: SOURCE, fetched: new Date().toISOString(), parks: index }) + '\n')
console.log(`wrote ${files} park files (${totalLines} lines); ${rideable} parks have a line to ride`)
