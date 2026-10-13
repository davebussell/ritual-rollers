// Build data/spots.json from research output.
// Usage:
//   node scripts/ingest-spots.mjs <journal.jsonl> [--raw]   workflow journal: audit-merge result, or --raw to merge the researchers deterministically
//   node scripts/ingest-spots.mjs <spots.json>              replace the index with this file ({ spots: [...] } or [...])
//   node scripts/ingest-spots.mjs <spots.json> --merge      merge this file INTO the existing data/spots.json (same dedupe rules, existing slugs kept)
// Every entry is validated (North America bounds, known sports/months/skill) before anything is written.

import { readFileSync, writeFileSync } from 'fs'

const SPORTS = new Set(['kite', 'wing', 'windsurf', 'sail', 'paraglide', 'surf', 'sup', 'dive', 'swim', 'ski', 'mtb', 'climb', 'hike', 'kayak', 'whitewater', 'fish'])
const MONTHS = new Set(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
const SKILLS = new Set(['beginner', 'intermediate', 'advanced', 'all'])

const args = process.argv.slice(2)
const src = args.find(a => !a.startsWith('--'))
const flag = f => args.includes(f)
if (!src) { console.error('usage: node scripts/ingest-spots.mjs <journal.jsonl | spots.json> [--raw] [--merge]'); process.exit(1) }

// ---- dedupe rules ---------------------------------------------------------------
// Same venue = same slug, or same normalised name within ~8 km, or same first word within 2 km
// ("Mont Tremblant (ski)" vs "Mont-Tremblant", "Hood River downwind" vs "Hood River").
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const km = (a, b) => { const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dg = (b.lng - a.lng) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dg / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
const suffixed = sl => /-(sup|surf|kite|wing|windsurf|sail|dive|swim|ski|mtb|climb|hike|kayak|whitewater|fish|paraglide)$/.test(sl ?? '')
const sameVenue = (m, s) => m.slug === s.slug
  || (norm(m.name) === norm(s.name) && km(m, s) < 8)
  || (norm(m.name).split(' ')[0] === norm(s.name).split(' ')[0] && km(m, s) < 2)

// Fold `incoming` into `merged` (mutated). Unions sports/months, keeps the higher-confidence
// coordinates and the longer descriptive fields, prefers the canonical un-suffixed name/slug.
function mergeInto(merged, incoming) {
  const added = []
  let folded = 0
  for (const s of incoming) {
    const hit = merged.find(m => sameVenue(m, s))
    if (!hit) { merged.push({ ...s, sports: [...new Set(s.sports ?? [])], bestMonths: [...new Set(s.bestMonths ?? [])] }); added.push(s.name); continue }
    folded++
    if ((suffixed(hit.slug) && !suffixed(s.slug)) || (String(hit.name).includes('/') && !String(s.name).includes('/') && String(s.name).length < String(hit.name).length)) {
      hit.name = s.name; hit.slug = s.slug; hit.venueType = s.venueType || hit.venueType; hit.nearestTown = s.nearestTown || hit.nearestTown
    }
    for (const id of s.sports ?? []) if (!hit.sports.includes(id)) hit.sports.push(id)
    for (const m of s.bestMonths ?? []) if (!hit.bestMonths.includes(m)) hit.bestMonths.push(m)
    if (s.confidence === 'high' && hit.confidence !== 'high') { hit.lat = s.lat; hit.lng = s.lng; hit.confidence = 'high'; hit.source = s.source || hit.source }
    if ((s.why ?? '').length > (hit.why ?? '').length) hit.why = s.why
    if ((s.heads_up ?? '').length > (hit.heads_up ?? '').length) hit.heads_up = s.heads_up
    if (hit.skill !== s.skill) hit.skill = 'all'
  }
  return { merged, added, folded }
}

// ---- load ------------------------------------------------------------------------
let spots
if (src.endsWith('.jsonl')) {
  const lines = readFileSync(src, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  // Labels live on "started" lines; results join to them by key
  const labelByKey = new Map(lines.filter(l => l.type === 'started').map(l => [l.key, l.label]))
  const audit = [...lines].reverse().find(l => l.type === 'result' && /audit/.test(labelByKey.get(l.key) ?? '') && l.result?.spots)
  if (audit && !flag('--raw')) {
    spots = audit.result.spots
    console.log(`audit notes: ${audit.result.notes ?? ''}`.slice(0, 600))
    if (audit.result.removed?.length) console.log(`removed by audit: ${audit.result.removed.length}`)
  } else {
    const raw = lines
      .filter(l => l.type === 'result' && /^research:/.test(labelByKey.get(l.key) ?? ''))
      .flatMap(l => l.result?.spots ?? [])
    console.log(`raw merge of ${raw.length} researcher entries${audit ? '' : ' (audit not finished)'}`)
    spots = mergeInto([], raw).merged
    console.log(`merged to ${spots.length} venues`)
  }
} else {
  const j = JSON.parse(readFileSync(src, 'utf8'))
  const incoming = Array.isArray(j) ? j : j.spots
  if (!Array.isArray(incoming)) { console.error('expected an array or { spots: [...] }'); process.exit(1) }
  if (flag('--merge')) {
    const existing = JSON.parse(readFileSync('data/spots.json', 'utf8'))
    const r = mergeInto(existing.map(s => ({ ...s, sports: [...s.sports], bestMonths: [...s.bestMonths] })), incoming)
    console.log(`merge: ${existing.length} existing + ${incoming.length} incoming -> ${r.merged.length} venues (${r.added.length} new, ${r.folded} folded into existing)`)
    if (r.added.length) console.log('new venues:', r.added.slice(0, 60).join(' · ') + (r.added.length > 60 ? ` · … +${r.added.length - 60}` : ''))
    spots = r.merged
  } else {
    spots = incoming
  }
}

// ---- validate + write -------------------------------------------------------------
const inNA = (lat, lng) => (lat >= 14 && lat <= 72 && lng >= -170 && lng <= -52) || (lat >= 18.5 && lat <= 22.5 && lng >= -161 && lng <= -154)
const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const seen = new Set()
const clean = []
const rejected = []
for (const s of spots) {
  const problems = []
  const sports = (s.sports ?? []).filter(id => SPORTS.has(id))
  if (sports.length === 0) problems.push('no valid sports')
  if (!['US', 'CA', 'MX'].includes(s.country)) problems.push(`country ${s.country}`)
  if (typeof s.lat !== 'number' || typeof s.lng !== 'number' || !inNA(s.lat, s.lng)) problems.push(`coords ${s.lat},${s.lng}`)
  const months = (s.bestMonths ?? []).filter(m => MONTHS.has(m))
  const skill = SKILLS.has(s.skill) ? s.skill : 'all'
  let slug = slugify(s.slug || s.name || '')
  if (!slug) problems.push('no slug')
  if (seen.has(slug)) { let i = 2; while (seen.has(`${slug}-${i}`)) i++; slug = `${slug}-${i}` }
  if (!s.name || !s.region || !s.nearestTown) problems.push('missing name/region/town')
  if (problems.length) { rejected.push({ name: s.name, problems }); continue }
  seen.add(slug)
  clean.push({
    name: String(s.name).trim(), slug, sports, country: s.country, region: String(s.region).trim(), nearestTown: String(s.nearestTown).trim(),
    lat: Number(s.lat.toFixed(4)), lng: Number(s.lng.toFixed(4)), venueType: String(s.venueType ?? '').trim(),
    bestMonths: months, skill, why: String(s.why ?? '').trim(), heads_up: String(s.heads_up ?? '').trim(),
    source: String(s.source ?? '').trim(), confidence: s.confidence === 'high' ? 'high' : 'medium',
  })
}

clean.sort((a, b) => a.name.localeCompare(b.name))
writeFileSync('data/spots.json', JSON.stringify(clean, null, 2) + '\n')

const perSport = {}
const perCountry = { US: 0, CA: 0, MX: 0 }
for (const s of clean) { perCountry[s.country]++; for (const id of s.sports) perSport[id] = (perSport[id] ?? 0) + 1 }
console.log(`wrote data/spots.json: ${clean.length} spots (${rejected.length} rejected)`)
console.log('per country:', perCountry)
console.log('per sport:', Object.entries(perSport).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '))
if (rejected.length) console.log('rejected:\n  ' + rejected.map(r => `${r.name}: ${r.problems.join(', ')}`).join('\n  '))
