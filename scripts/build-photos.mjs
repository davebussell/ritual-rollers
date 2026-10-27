// Build data/photos.json and public/photos/ from research files (research/photos/*.json, shape in BRIEF.md).
//   node scripts/build-photos.mjs research/photos/*.json
// For Wikimedia Commons files the licence, author and date are checked again against the Commons API (extmetadata),
// and anything not public domain, CC0, CC BY or CC BY-SA is dropped. Other sources must state one of the allowed
// licences in the research file. Each photo is downloaded once, saved as /photos/<id>.jpg (longest side 1600 px) and
// /photos/<id>-640.jpg, with no EXIF (the re-encode drops it). Anything dropped is printed with the reason.
// Every photo is looked at before it ships: research/photos/review.json lists the pages that were looked at and are fine
// (ok) and the ones left out, with the reason (skip). Anything else is downloaded so it can be looked at, but held back.
// Images left over from earlier builds are removed.
// Needs Python 3 with Pillow for the resizing.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, renameSync } from 'fs'
import { execFileSync } from 'child_process'
import { createHash } from 'crypto'

// permission-requests.json is the list of social posts to ask about and review.json the review decisions: not photos
const files = process.argv.slice(2).filter(f => f.endsWith('.json') && !/permission-requests|review\.json$/.test(f))
const REVIEW = existsSync('research/photos/review.json') ? JSON.parse(readFileSync('research/photos/review.json', 'utf8')) : { ok: [], skip: {} }
const reviewedOk = new Set(REVIEW.ok ?? [])
if (!files.length) { console.error('usage: node scripts/build-photos.mjs research/photos/*.json'); process.exit(1) }

const UA = 'RitualRollersPhotoBuilder/1.0 (https://ritualrollers.com; dave@clickshift.ca)'
const OUT = 'public/photos'
const DISCIPLINES = new Set(['skateboard', 'roller', 'inline', 'scooter', 'bmx', 'mtb'])
const BOX = { CA: [41.6, 84, -141.1, -52.5], US: [18.8, 71.5, -179.2, -66.9], MX: [14.4, 32.8, -118.5, -86.6] }
const KIDS = /\b(kids?|child(ren)?|boys?|girls?|youth|toddler|little)\b/i
const sleep = ms => new Promise(r => setTimeout(r, ms))

// Captions name a rider only when the rider is a well-known pro. Anyone else (the photographer may have named a local)
// becomes "A skater" / "A rider": the source page keeps the name, we don't repeat it next to a place.
const PUBLIC_RIDERS = ['Tony Hawk', 'Paul Rodriguez', 'Kolby Parks']
const NOT_A_NAME = /^(A|An|The|Two|Three|Four|Several|Dozens|Skaters|Riders|BMX|Crowds?|Spectators|Locals|Opening|Mountain|Vintage)\b/
export function unnamed(caption, discipline) {
  const m = /^((?:[A-Z][\w'’.-]+ ){2,3})(?=[a-z])/.exec(caption)
  if (!m || NOT_A_NAME.test(caption) || PUBLIC_RIDERS.some(n => caption.startsWith(n))) return caption
  const who = discipline === 'bmx' || discipline === 'mtb' ? 'A rider ' : 'A skater '
  return who + caption.slice(m[0].length)
}

// Allowed licences, by their usual short names
function licenceOk(name, url = '') {
  const n = `${name} ${url}`.toLowerCase()
  if (/\bnc\b|non-?commercial|\bnd\b|no-?deriv|all rights reserved/.test(n)) return false
  return /public domain|\bpd\b|pd-|cc0|publicdomain|no known copyright|cc[ -]by(-sa)?|creativecommons\.org\/licenses\/by(-sa)?\/|open government licence|ogl/.test(n)
}

const strip = html => String(html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

async function commonsInfo(page) {
  const title = decodeURIComponent(page.split('/wiki/')[1] ?? '').replace(/_/g, ' ')
  if (!title.startsWith('File:')) return null
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600&titles=${encodeURIComponent(title)}`
  const res = await fetch(api, { headers: { 'User-Agent': UA } })
  if (!res.ok) return null
  const page0 = Object.values((await res.json()).query?.pages ?? {})[0]
  const ii = page0?.imageinfo?.[0]
  if (!ii) return null
  const m = ii.extmetadata ?? {}
  return {
    url: ii.thumburl ?? ii.url, width: ii.width, height: ii.height,
    licence: strip(m.LicenseShortName?.value), licence_url: m.LicenseUrl?.value ?? '',
    author: strip(m.Artist?.value), date: strip(m.DateTimeOriginal?.value),
  }
}

async function download(url, to) {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) { writeFileSync(to, Buffer.from(await res.arrayBuffer())); return true }
    if (res.status === 429 || res.status >= 500) { await sleep(3000 * (i + 1)); continue }
    return false
  }
  return false
}

// Resize with Pillow: 1600 px and 640 px JPEGs, orientation applied, metadata dropped
function resize(src, id) {
  const py = `
import sys
from PIL import Image, ImageOps
src, big, small = sys.argv[1], sys.argv[2], sys.argv[3]
im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
w, h = im.size
for path, side in ((big, 1600), (small, 640)):
    k = min(1, side / max(w, h))
    im.resize((round(w * k), round(h * k)), Image.LANCZOS).save(path, 'JPEG', quality=84, optimize=True, progressive=True)
k = min(1, 1600 / max(w, h))
print(round(w * k), round(h * k))
`
  const out = execFileSync('python3', ['-c', py, src, `${OUT}/${id}.jpg`, `${OUT}/${id}-640.jpg`]).toString().trim().split(' ').map(Number)
  return { width: out[0], height: out[1] }
}

mkdirSync(OUT, { recursive: true })
mkdirSync('.cache/photos', { recursive: true })
mkdirSync('.cache/review', { recursive: true })
const out = [], dropped = [], held = []
const seen = new Set()
for (const file of files) {
  for (const raw of JSON.parse(readFileSync(file, 'utf8'))) {
    const name = raw.title ?? raw.page ?? '?'
    const fail = why => dropped.push(`${name} (${file.split('/').pop()}): ${why}`)
    const key = raw.page ?? raw.image
    if (REVIEW.skip?.[key]) { fail(`skipped after review: ${REVIEW.skip[key]}`); continue }
    if (!key || seen.has(key)) { fail('duplicate or no page'); continue }
    seen.add(key)
    const country = String(raw.country ?? '').toUpperCase()
    const lat = Number(raw.lat), lng = Number(raw.lng)
    if (!BOX[country] || !Number.isFinite(lat) || !Number.isFinite(lng)) { fail('no country or coordinates'); continue }
    const [s, n, w, e] = BOX[country]
    if (lat < s || lat > n || lng < w || lng > e) { fail(`coordinates outside ${country}`); continue }
    if (!raw.park_id && !raw.spot_slug) { fail('not matched to a park'); continue }
    if (KIDS.test(`${raw.title} ${raw.caption}`)) { fail('shows children'); continue }
    if (!DISCIPLINES.has(raw.discipline)) { fail(`discipline ${raw.discipline}`); continue }
    const unreviewed = !reviewedOk.has(key)

    let licence = raw.licence, licence_url = raw.licence_url, author = raw.author, url = raw.image
    if (/commons\.wikimedia\.org\/wiki\/File:/.test(raw.page ?? '')) {
      const info = await commonsInfo(raw.page)
      await sleep(250)
      if (!info) { fail('Commons file not found'); continue }
      licence = info.licence || licence; licence_url = info.licence_url || licence_url
      author = info.author || author; url = info.url
    }
    if (!licenceOk(licence, licence_url)) { fail(`licence ${licence}`); continue }
    if (!author) author = 'Unknown photographer'
    const id = createHash('sha1').update(key).digest('hex').slice(0, 12)
    const cached = `.cache/photos/${id}`
    if (!existsSync(cached) && !(await download(url, cached))) { fail(`download failed ${url}`); continue }
    let size
    try { size = resize(cached, id) } catch { fail('not an image'); continue }
    // Downloaded and resized so it can be looked at (.cache/review/<id>.jpg), but not published until it is in review.json ok
    if (unreviewed) {
      renameSync(`${OUT}/${id}.jpg`, `.cache/review/${id}.jpg`); unlinkSync(`${OUT}/${id}-640.jpg`)
      held.push(`${id}  ${name}  ${key}`); continue
    }
    out.push({
      id, src: `/photos/${id}.jpg`, thumb: `/photos/${id}-640.jpg`, width: size.width, height: size.height,
      title: String(raw.title ?? '').slice(0, 160), author: author.slice(0, 120), licence, licence_url: licence_url || raw.licence_url || '',
      page: raw.page ?? raw.image, year: Number.isFinite(Number(raw.year)) && raw.year ? Number(raw.year) : null,
      discipline: raw.discipline, park_id: raw.park_id ?? null, spot_slug: raw.spot_slug ?? null, park_name: raw.park_name,
      city: raw.city ?? '', region: raw.region ?? '', country, lat: +lat.toFixed(5), lng: +lng.toFixed(5),
      caption: unnamed(String(raw.caption ?? ''), raw.discipline).slice(0, 220),
    })
    await sleep(200)
  }
}
out.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))
// Remove images of photos that are no longer in the set (skipped or dropped since the last build)
const keep = new Set(out.flatMap(p => [`${p.id}.jpg`, `${p.id}-640.jpg`]))
for (const f of readdirSync(OUT)) if (f.endsWith('.jpg') && !keep.has(f)) unlinkSync(`${OUT}/${f}`)
writeFileSync('data/photos.json', JSON.stringify({ built: new Date().toISOString(), count: out.length, photos: out }, null, 1) + '\n')
const parks = new Set(out.map(p => p.spot_slug ?? p.park_id))
console.log(`wrote ${out.length} photos of ${parks.size} parks`)
if (dropped.length) console.log(`dropped ${dropped.length}:\n  ` + dropped.join('\n  '))
if (held.length) console.log(`held ${held.length} until reviewed (look at .cache/review/<id>.jpg, then add the page to ok or skip in research/photos/review.json):\n  ` + held.join('\n  '))
