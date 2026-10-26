// Build data/spots.json (the featured index) from research files.
//   node scripts/build-spots.mjs <research.json> [more.json ...]
// Each research file is a JSON array in the shape of the briefs (see README "Featured spots").
// Every entry is validated, normalised, de-duplicated and — where OpenStreetMap has the same spot
// within 1.5 km under a similar name — snapped to the OSM coordinates (data/parks.json), which
// also links the spot to its OSM feature. A report of anything dropped or unsnapped is printed.

import { readFileSync, writeFileSync } from 'fs'

const files = process.argv.slice(2)
if (!files.length) { console.error('usage: node scripts/build-spots.mjs <research.json> ...'); process.exit(1) }

const KINDS = new Set(['park', 'plaza', 'diy', 'street', 'bowl', 'indoor', 'pumptrack', 'bikepark', 'bmxtrack'])
const BIKE_KINDS = new Set(['pumptrack', 'bikepark', 'bmxtrack'])
const FEATURES = new Set(['street', 'ledges', 'rails', 'stairs', 'gaps', 'manual pads', 'banks', 'bowl', 'transition', 'vert',
  'mini ramp', 'flow', 'snake run', 'pool coping', 'full pipe', 'pump track', 'dirt jumps', 'jump line', 'slopestyle', 'downhill',
  'freeride', 'drops', 'berms', 'rollers', 'skills', 'race track', 'start hill', 'foam pit', 'resi ramp', 'beginner area'])
const FEATURE_ALIASES = { 'pump': 'pump track', 'pumptrack': 'pump track', 'dirt jump': 'dirt jumps', 'jumps': 'dirt jumps', 'jump lines': 'jump line',
  'stair': 'stairs', 'rail': 'rails', 'ledge': 'ledges', 'bank': 'banks', 'gap': 'gaps', 'manual pad': 'manual pads', 'miniramp': 'mini ramp',
  'mini-ramp': 'mini ramp', 'pool': 'pool coping', 'bowls': 'bowl', 'quarter pipes': 'transition', 'quarterpipe': 'transition', 'halfpipe': 'vert',
  'half pipe': 'vert', 'snake': 'snake run', 'snakerun': 'snake run', 'skill': 'skills', 'starting hill': 'start hill', 'berm': 'berms', 'roller': 'rollers' }
const DISCIPLINES = new Set(['skateboard', 'roller', 'inline', 'scooter', 'bmx', 'mtb'])
const SKILLS = new Set(['beginner', 'intermediate', 'advanced', 'all'])
const BOX = { CA: [41.6, 84, -141.1, -52.5], US: [18.8, 71.5, -179.2, -66.9], MX: [14.4, 32.8, -118.5, -86.6] }

const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const slugify = s => norm(s).replace(/ /g, '-')
const km = (a, b) => { const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dg = (b.lng - a.lng) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dg / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
const STOP = new Set(['skatepark', 'skate', 'park', 'the', 'de', 'del', 'la', 'el', 'los', 'las', 'and', 'of', 'bike', 'pump', 'track', 'bmx', 'parque', 'skateplaza', 'plaza', 'centre', 'center', 'memorial', 'community', 'city'])
const tokens = s => new Set(norm(s).split(' ').filter(t => t.length > 2 && !STOP.has(t)))
const similar = (a, b) => { const A = tokens(a), B = tokens(b); if (!A.size || !B.size) return false; let n = 0; for (const t of A) if (B.has(t)) n++; return n >= 1 && n / Math.min(A.size, B.size) >= 0.5 }

let parks = []
try { parks = JSON.parse(readFileSync('data/parks.json', 'utf8')).parks } catch { console.warn('no data/parks.json — skipping OSM snapping') }
const OSM_KIND = { park: 'skate', plaza: 'skate', diy: 'skate', bowl: 'skate', indoor: undefined, street: null, pumptrack: 'pump', bmxtrack: 'bmx', bikepark: 'bike' }

// Spots a research file may suggest that we don't feature, keyed by normalised name, with the reason.
const EXCLUDE = new Map([
  ['freedom plaza', 'skating is banned there (National Park Service land; Park Police move skaters on)'],
])

const dropped = []
const unsnapped = []
const out = []

for (const file of files) {
  const list = JSON.parse(readFileSync(file, 'utf8'))
  for (const raw of Array.isArray(list) ? list : list.spots ?? []) {
    const why = String(raw.why ?? '').trim()
    const name = String(raw.name ?? '').trim()
    const country = String(raw.country ?? '').toUpperCase()
    const lat = Number(raw.lat), lng = Number(raw.lng)
    const kind = String(raw.kind ?? '').toLowerCase()
    const source = String(raw.source ?? '').trim()
    const fail = why => dropped.push(`${name || '?'} (${file.split('/').pop()}): ${why}`)
    if (!name || !why) { fail('missing name or why'); continue }
    if (EXCLUDE.has(norm(name))) { fail(EXCLUDE.get(norm(name))); continue }
    if (!BOX[country]) { fail(`country ${country}`); continue }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { fail('no coordinates'); continue }
    const [s, n, w, e] = BOX[country]
    if (lat < s || lat > n || lng < w || lng > e) { fail(`coordinates outside ${country}`); continue }
    if (!KINDS.has(kind)) { fail(`kind ${kind}`); continue }
    if (!/^https?:\/\//.test(source)) { fail('no source URL'); continue }

    const features = [...new Set((raw.features ?? []).map(f => String(f).toLowerCase().trim()).map(f => FEATURE_ALIASES[f] ?? f).filter(f => FEATURES.has(f)))]
    const indoor = raw.indoor === true || kind === 'indoor'
    const surfaceRaw = String(raw.surface ?? '').toLowerCase()
    const surface = indoor ? 'wood'
      : BIKE_KINDS.has(kind) ? (['asphalt', 'concrete'].includes(surfaceRaw) ? 'hard' : surfaceRaw === 'wood' ? 'wood'
        // well-known pump tracks are mostly asphalt; bike parks and BMX tracks mostly dirt
        : surfaceRaw ? 'dirt' : kind === 'pumptrack' ? 'hard' : 'dirt')
      : 'hard'
    let disciplines = (raw.disciplines ?? []).map(d => String(d).toLowerCase()).filter(d => DISCIPLINES.has(d))
    if (!disciplines.length) {
      disciplines = BIKE_KINDS.has(kind)
        ? (kind === 'pumptrack' && surface === 'hard' ? ['bmx', 'mtb', 'skateboard', 'scooter', 'roller', 'inline'] : kind === 'bikepark' ? ['mtb', 'bmx'] : ['bmx'])
        : ['skateboard', 'roller', 'inline', 'scooter']
    }
    const spot = {
      name,
      slug: '',
      country,
      region: String(raw.region ?? '').trim(),
      city: String(raw.city ?? '').trim(),
      lat: Math.round(lat * 1e5) / 1e5,
      lng: Math.round(lng * 1e5) / 1e5,
      kind,
      features,
      surface,
      disciplines,
      indoor,
      lit: raw.lit === true ? true : raw.lit === false ? false : null,
      cost: ['free', 'paid'].includes(raw.cost) ? raw.cost : 'unknown',
      skill: SKILLS.has(raw.skill) ? raw.skill : 'all',
      why,
      heads_up: String(raw.heads_up ?? '').trim(),
      source,
      confidence: raw.confidence === 'high' ? 'high' : 'medium',
    }

    // Same spot twice (two researchers, or two names for one place)
    const dup = out.find(o => (norm(o.name) === norm(spot.name) && km(o, spot) < 3) || km(o, spot) < 0.12 && o.kind === spot.kind)
    if (dup) {
      if (spot.confidence === 'high' && dup.confidence !== 'high') Object.assign(dup, { ...spot, slug: dup.slug })
      else if (spot.why.length > dup.why.length && dup.confidence === spot.confidence) { dup.why = spot.why; dup.features = [...new Set([...dup.features, ...spot.features])] }
      dropped.push(`${spot.name}: duplicate of ${dup.name}`)
      continue
    }

    // Snap to OpenStreetMap when the same spot is mapped nearby
    const want = OSM_KIND[kind]
    const coordSource = String(raw.coord_source ?? '')
    if (parks.length && want !== null) {
      let best = null, bestKm = 99
      for (const p of parks) {
        if (want && p.kind !== want) continue
        if (Math.abs(p.lat - spot.lat) > 0.02 || Math.abs(p.lng - spot.lng) > 0.03) continue
        const d = km(p, spot)
        const named = p.name && (similar(p.name, spot.name) || norm(p.name) === norm(spot.name))
        if (d < 1.5 && named && d < bestKm) { best = p; bestKm = d }
      }
      // Rough coordinates (estimated, or geocoded from an address): if exactly one mapped spot of the
      // same kind sits within 1.5 km, it is the one
      if (!best && ['estimated', 'address', ''].includes(coordSource) && want) {
        const near = parks.filter(p => p.kind === want && Math.abs(p.lat - spot.lat) < 0.02 && km(p, spot) < 1.5)
        if (near.length === 1) best = near[0]
      }
      if (best) { spot.osm = best.id; spot.lat = best.lat; spot.lng = best.lng; if (best.lit != null && spot.lit == null) spot.lit = best.lit }
      else unsnapped.push(`${spot.name} (${spot.city}) — ${coordSource || 'no coord_source'}`)
    }
    if (coordSource === 'estimated' && !spot.osm) spot.confidence = 'medium'
    out.push(spot)
  }
}

// Slugs: name + city, unique
const used = new Set()
for (const s of out) {
  let base = slugify(s.name.toLowerCase().includes(s.city.toLowerCase()) || !s.city ? s.name : `${s.name} ${s.city}`)
  let slug = base, i = 2
  while (used.has(slug)) slug = `${base}-${i++}`
  used.add(slug)
  s.slug = slug
}

out.sort((a, b) => a.country.localeCompare(b.country) || a.region.localeCompare(b.region) || a.name.localeCompare(b.name))
writeFileSync('data/spots.json', JSON.stringify(out, null, 1) + '\n')

const by = k => Object.entries(out.reduce((m, s) => ((m[s[k]] = (m[s[k]] ?? 0) + 1), m), {})).map(([a, b]) => `${a} ${b}`).join(', ')
console.log(`wrote ${out.length} spots — ${by('country')} — ${by('kind')}`)
console.log(`snapped to OSM: ${out.filter(s => s.osm).length}; high confidence: ${out.filter(s => s.confidence === 'high').length}`)
if (dropped.length) console.log(`\ndropped ${dropped.length}:\n  ` + dropped.join('\n  '))
if (unsnapped.length) console.log(`\nnot found in OSM (coordinates as researched) ${unsnapped.length}:\n  ` + unsnapped.join('\n  '))
