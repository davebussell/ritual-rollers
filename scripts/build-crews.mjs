// Build data/crews.json (the crews directory) from research files.
//   node scripts/build-crews.mjs research/crews/*.json
// Each research file is a JSON array in the shape of research/crews/BRIEF.md. Entries are validated, cleaned
// (no email addresses or phone numbers, only http(s) links), de-duplicated, given a slug and attached to the
// nearest city hub (data/cities.json). Anything dropped is printed with the reason.

import { readFileSync, writeFileSync } from 'fs'

const files = process.argv.slice(2)
if (!files.length) { console.error('usage: node scripts/build-crews.mjs <research.json> ...'); process.exit(1) }

const KINDS = new Set(['crew', 'club', 'skate-night', 'nonprofit', 'shop-session', 'lessons'])
const DISCIPLINES = new Set(['skateboard', 'roller', 'inline', 'scooter', 'bmx', 'mtb'])
const AUDIENCE = new Set(['all', 'beginners', 'adults', 'women', 'queer', 'families', 'kids'])
const LINKS = ['website', 'instagram', 'facebook', 'meetup', 'discord', 'tiktok', 'youtube']
const BOX = { CA: [41.6, 84, -141.1, -52.5], US: [18.8, 71.5, -179.2, -66.9], MX: [14.4, 32.8, -118.5, -86.6] }
const HUB_KM = 40

const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const km = (a, b) => { const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dg = (b.lng - a.lng) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dg / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
const clean = s => String(s ?? '').replace(/\S+@\S+\.\S+/g, '').replace(/\+?\d[\d\s().-]{7,}\d/g, '').replace(/\s{2,}/g, ' ').trim()
const isUrl = u => typeof u === 'string' && /^https?:\/\/[^\s]+$/.test(u)

// Groups a research file suggested that we don't list, keyed by normalised name, with the reason
const EXCLUDE = new Map([
  ['rollers-unidos-mexico', 'only evidence is organising one national festival; no sign of regular group skates'],
])

const cities = JSON.parse(readFileSync('data/cities.json', 'utf8'))
const out = []
const dropped = []

for (const file of files) {
  const list = JSON.parse(readFileSync(file, 'utf8'))
  for (const raw of Array.isArray(list) ? list : []) {
    const name = clean(raw.name)
    const fail = why => dropped.push(`${name || '?'} (${file.split('/').pop()}): ${why}`)
    const country = String(raw.country ?? '').toUpperCase()
    const lat = Number(raw.lat), lng = Number(raw.lng)
    if (!name) { fail('no name'); continue }
    if (EXCLUDE.has(norm(name))) { fail(EXCLUDE.get(norm(name))); continue }
    if (!BOX[country]) { fail(`country ${country}`); continue }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { fail('no coordinates'); continue }
    const [s, n, w, e] = BOX[country]
    if (lat < s || lat > n || lng < w || lng > e) { fail(`coordinates outside ${country}`); continue }
    const kind = String(raw.kind ?? '').toLowerCase()
    if (!KINDS.has(kind)) { fail(`kind ${kind}`); continue }
    const disciplines = [...new Set((raw.disciplines ?? []).map(d => String(d).toLowerCase()).filter(d => DISCIPLINES.has(d)))]
    if (!disciplines.length) { fail('no disciplines'); continue }
    const audience = [...new Set((raw.audience ?? []).map(a => String(a).toLowerCase()).filter(a => AUDIENCE.has(a)))]
    const about = clean(raw.about)
    if (about.length < 20) { fail('no description'); continue }
    if (!isUrl(raw.source)) { fail('no source URL'); continue }
    const links = {}
    for (const k of LINKS) if (isUrl(raw.links?.[k])) links[k] = raw.links[k]
    // A group with no page of its own (a city-run skate night, say): its event listing is where to find it
    if (!Object.keys(links).length) links.website = raw.source
    const city = clean(raw.city)
    const key = `${norm(name)}|${norm(city)}`
    if (out.some(c => c._key === key)) { fail('duplicate'); continue }
    const hub = cities.map(c => ({ c, d: km(c, { lat, lng }) })).filter(x => x.d <= HUB_KM).sort((a, b) => a.d - b.d)[0]?.c.slug ?? null
    out.push({
      _key: key,
      name, kind, disciplines, audience: audience.length ? audience : ['all'],
      city, region: clean(raw.region), country, lat: +lat.toFixed(5), lng: +lng.toFixed(5),
      coords: raw.coords === 'spot' ? 'spot' : 'city',
      ...(raw.home_spot ? { home_spot: clean(raw.home_spot) } : {}),
      ...(raw.meets ? { meets: clean(raw.meets) } : {}),
      about, links, source: raw.source, active: clean(raw.active), confidence: raw.confidence === 'high' ? 'high' : 'medium',
      ...(hub ? { hub } : {}),
    })
  }
}

// Slugs: the name, or name-city when two crews share a name
const count = {}
for (const c of out) count[norm(c.name)] = (count[norm(c.name)] ?? 0) + 1
for (const c of out) { c.slug = count[norm(c.name)] > 1 ? `${norm(c.name)}-${norm(c.city)}` : norm(c.name); delete c._key }

out.sort((a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city) || a.name.localeCompare(b.name))
writeFileSync('data/crews.json', JSON.stringify(out, null, 1) + '\n')
const by = out.reduce((m, c) => (m[c.country] = (m[c.country] ?? 0) + 1, m), {})
console.log(`wrote ${out.length} crews — ${JSON.stringify(by)} — ${out.filter(c => !c.hub).length} outside any city hub`)
if (dropped.length) console.log(`\ndropped ${dropped.length}:\n  ` + dropped.join('\n  '))
