// Build data/events.json and data/athletes.json from research (research/events/events.json, riders.json; brief in
// research/events/BRIEF.md). A rider's home is kept to the region (anything in brackets is dropped). Checks every result has a source link, every rider is tied to at least one sourced
// result, links are http(s), and places sit in their country. Prints what it drops.
//   node scripts/build-events.mjs

import { readFileSync, writeFileSync } from 'fs'

const DISCIPLINES = new Set(['downhill', 'street-luge', 'skateboard', 'bmx', 'inline', 'roller', 'scooter', 'mtb'])
const BOX = { CA: [41.6, 84, -141.1, -52.5], US: [18.8, 71.5, -179.2, -66.9], MX: [14.4, 32.8, -118.5, -86.6] }
const isUrl = u => typeof u === 'string' && /^https?:\/\/\S+$/.test(u)
const clean = s => String(s ?? '').replace(/\S+@\S+\.\S+/g, '').replace(/\+?\d[\d\s().-]{7,}\d/g, '').replace(/\s{2,}/g, ' ').trim()
const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const km = (a, b) => { const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dg = (b.lng - a.lng) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dg / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }

const cities = JSON.parse(readFileSync('data/cities.json', 'utf8'))
const hubOf = p => cities.map(c => ({ c, d: km(c, p) })).filter(x => x.d <= 80).sort((a, b) => a.d - b.d)[0]?.c.slug ?? null
const links = l => Object.fromEntries(Object.entries(l ?? {}).filter(([, v]) => isUrl(v)))
const dropped = []

const events = []
for (const e of JSON.parse(readFileSync('research/events/events.json', 'utf8'))) {
  const fail = why => dropped.push(`event ${e.name}: ${why}`)
  const country = String(e.country ?? '').toUpperCase(), lat = Number(e.lat), lng = Number(e.lng)
  if (!BOX[country] || !Number.isFinite(lat) || !Number.isFinite(lng)) { fail('no place'); continue }
  const [s, n, w, ea] = BOX[country]
  if (lat < s || lat > n || lng < w || lng > ea) { fail(`outside ${country}`); continue }
  const disciplines = (e.disciplines ?? []).filter(d => DISCIPLINES.has(d))
  if (!disciplines.length) { fail('no discipline'); continue }
  if (!isUrl(e.source)) { fail('no source'); continue }
  const results = (e.results ?? []).filter(r => isUrl(r.source) && Number.isFinite(Number(r.year)) && Array.isArray(r.podium) && r.podium.length)
    .map(r => ({ year: Number(r.year), class: clean(r.class), podium: r.podium.slice(0, 3).map(clean), source: r.source }))
    .sort((a, b) => b.year - a.year || a.class.localeCompare(b.class))
  const slug = e.slug ? slugify(e.slug) : slugify(`${e.name} ${e.city}`)
  if (events.some(x => x.slug === slug)) { fail('duplicate'); continue }
  events.push({
    slug, name: clean(e.name), disciplines, kind: e.kind ?? 'race', place: clean(e.place), city: clean(e.city), region: clean(e.region), country,
    lat: +lat.toFixed(5), lng: +lng.toFixed(5), coords: e.coords ?? 'city', park_id: e.park_id ?? null, spot_slug: e.spot_slug ?? null,
    years: [...new Set((e.years ?? []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b),
    organiser: clean(e.organiser), about: clean(e.about), results, links: links(e.links), source: e.source, hub: hubOf({ lat, lng }),
  })
}

const athletes = []
for (const a of JSON.parse(readFileSync('research/events/riders.json', 'utf8'))) {
  const fail = why => dropped.push(`rider ${a.name}: ${why}`)
  const results = (a.results ?? []).filter(r => isUrl(r.source) && Number.isFinite(Number(r.year)) && r.event)
    .map(r => ({ year: Number(r.year), event: clean(r.event), event_slug: events.some(e => e.slug === r.event_slug) ? r.event_slug : null, class: clean(r.class), place: Number(r.place) || null, source: r.source }))
    .sort((x, y) => y.year - x.year || (x.place ?? 99) - (y.place ?? 99))
  if (!results.length) { fail('no sourced results'); continue }
  const disciplines = (a.disciplines ?? []).filter(d => DISCIPLINES.has(d))
  if (!disciplines.length) { fail('no discipline'); continue }
  const country = String(a.country ?? '').toUpperCase()
  if (!BOX[country]) { fail('no country'); continue }
  const lat = Number(a.lat), lng = Number(a.lng)
  athletes.push({
    slug: a.slug ? slugify(a.slug) : slugify(a.name), name: clean(a.name), disciplines, home: clean(String(a.home ?? '').replace(/\s*\(.*\)\s*/g, ' ')), country,
    ...(Number.isFinite(lat) && Number.isFinite(lng) ? { lat: +lat.toFixed(4), lng: +lng.toFixed(4), hub: hubOf({ lat, lng }) } : {}),
    about: clean(a.about), results, links: links(a.links), sources: (a.sources ?? []).filter(isUrl),
  })
}

writeFileSync('data/events.json', JSON.stringify({ built: new Date().toISOString(), count: events.length, events }, null, 1) + '\n')
writeFileSync('data/athletes.json', JSON.stringify({ built: new Date().toISOString(), count: athletes.length, athletes }, null, 1) + '\n')
console.log(`wrote ${events.length} events (${events.filter(e => e.results.length).length} with results) and ${athletes.length} riders`)
if (dropped.length) console.log(`dropped ${dropped.length}:\n  ` + dropped.join('\n  '))
