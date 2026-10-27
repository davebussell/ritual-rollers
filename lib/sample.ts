// Sample riders and sessions, so a first visit shows how the site works before real riders post.
// Everything here is invented and is always shown with a "Sample" tag. Sessions are generated relative to
// today, at real featured spots, so they're always upcoming. Real riders and sessions push samples out
// (see withSamples): once a place has enough real ones, its samples stop showing.

import type { Level } from '@/lib/sports'
import type { RideSession, RiderCard, RiderLite } from '@/lib/types'
import { cityBySlug } from '@/lib/cities'
import { spotsNear, type IndexedSpot } from '@/lib/spots-index'
import { addDays, localToday } from '@/lib/format'

interface SampleRider {
  username: string
  display_name: string
  city: string
  disciplines: string[]
  level: Level
  bio: string
  spot: number            // which nearby featured spot is home (index into spotsNear)
}

const RIDERS: SampleRider[] = [
  { username: 'mara.rolls', display_name: 'Mara K.', city: 'toronto', disciplines: ['roller'], level: 'learning', bio: 'Rink skater learning the park. Looking for people to drop in with on weekday evenings.', spot: 0 },
  { username: 'devon_sk8', display_name: 'Devon A.', city: 'toronto', disciplines: ['skateboard'], level: 'comfortable', bio: 'Back on a board after twelve years. Early Saturdays, mostly the small bowl.', spot: 1 },
  { username: 'lea.patine', display_name: 'Léa B.', city: 'montreal', disciplines: ['inline', 'roller'], level: 'comfortable', bio: 'Aggressive inline, a bit of park on quads. Always up for a Sunday session.', spot: 0 },
  { username: 'samir.bmx', display_name: 'Samir H.', city: 'montreal', disciplines: ['bmx'], level: 'advanced', bio: 'Park and street BMX. Happy to show newer riders the lines.', spot: 1 },
  { username: 'jess_pumps', display_name: 'Jess T.', city: 'vancouver', disciplines: ['mtb', 'bmx'], level: 'comfortable', bio: 'Pump tracks after work, North Shore on weekends.', spot: 0 },
  { username: 'kai.wheels', display_name: 'Kai N.', city: 'vancouver', disciplines: ['skateboard'], level: 'learning', bio: 'Adult beginner. Would love a crew that does not mind slams.', spot: 1 },
  { username: 'tara_bowls', display_name: 'Tara M.', city: 'calgary', disciplines: ['skateboard', 'roller'], level: 'comfortable', bio: 'Bowl carver. Skate mom of two; we ride as a family on Sundays.', spot: 0 },
  { username: 'nico.ottawa', display_name: 'Nico R.', city: 'ottawa', disciplines: ['skateboard'], level: 'comfortable', bio: 'Street and plaza. Usually at the plaza after work when it is light.', spot: 0 },
  { username: 'ana.roda', display_name: 'Ana P.', city: 'ottawa', disciplines: ['roller'], level: 'new', bio: 'New to roller skating. Looking for a beginners group, or anyone patient.', spot: 1 },
  { username: 'rae.ny', display_name: 'Rae C.', city: 'new-york', disciplines: ['skateboard'], level: 'advanced', bio: 'Ledges and manual pads. Down to film.', spot: 0 },
  { username: 'luis_quads', display_name: 'Luis G.', city: 'new-york', disciplines: ['roller'], level: 'comfortable', bio: 'Jam skater taking it to the park. Thursday nights.', spot: 1 },
  { username: 'brooke.la', display_name: 'Brooke S.', city: 'los-angeles', disciplines: ['skateboard'], level: 'learning', bio: 'Thirty-something beginner. Looking for other late starters.', spot: 0 },
  { username: 'omar.dirt', display_name: 'Omar F.', city: 'los-angeles', disciplines: ['bmx', 'mtb'], level: 'advanced', bio: 'Dirt jumps. I dig on Saturdays, everyone is welcome to help.', spot: 2 },
  { username: 'quinn.sf', display_name: 'Quinn L.', city: 'san-francisco', disciplines: ['skateboard', 'scooter'], level: 'comfortable', bio: 'Hills and plazas. Usually out at lunch.', spot: 0 },
  { username: 'ivy.seattle', display_name: 'Ivy W.', city: 'seattle', disciplines: ['roller', 'inline'], level: 'learning', bio: 'Rain or shine, mostly under the bridge. Learning drop-ins.', spot: 0 },
  { username: 'max.pdx', display_name: 'Max O.', city: 'portland-oregon', disciplines: ['skateboard'], level: 'advanced', bio: 'Burnside regular. Will happily tell you where the DIYs are.', spot: 0 },
  { username: 'dani.chi', display_name: 'Dani V.', city: 'chicago', disciplines: ['skateboard', 'roller'], level: 'comfortable', bio: 'Lakefront sessions all summer, indoor all winter.', spot: 0 },
  { username: 'sol.denver', display_name: 'Sol R.', city: 'denver', disciplines: ['skateboard'], level: 'learning', bio: 'Moved here in spring. Looking for a crew.', spot: 0 },
  { username: 'hank.atx', display_name: 'Hank D.', city: 'austin', disciplines: ['bmx'], level: 'comfortable', bio: 'Pump track loops and the odd race night.', spot: 0 },
  { username: 'priya.philly', display_name: 'Priya S.', city: 'philadelphia', disciplines: ['skateboard'], level: 'new', bio: 'Brand new. Taking lessons, want people to practise with.', spot: 0 },
  { username: 'fer.cdmx', display_name: 'Fer Z.', city: 'mexico-city', disciplines: ['skateboard', 'roller'], level: 'comfortable', bio: 'Patino y skate los domingos. Sundays on the flat ground and the bowl.', spot: 0 },
  { username: 'memo.gdl', display_name: 'Memo E.', city: 'guadalajara', disciplines: ['bmx', 'skateboard'], level: 'advanced', bio: 'Park sessions after work, mostly the big bowl.', spot: 0 },
  { username: 'june.yeg', display_name: 'June H.', city: 'edmonton', disciplines: ['skateboard', 'inline'], level: 'comfortable', bio: 'River valley rides, then the park.', spot: 0 },
  { username: 'cam.halifax', display_name: 'Cam J.', city: 'halifax', disciplines: ['skateboard'], level: 'learning', bio: 'Learning transition. Weekends.', spot: 0 },
]

export function isSampleUsername(username: string): boolean {
  return RIDERS.some(r => r.username === username)
}

function homeSpot(r: SampleRider): IndexedSpot | null {
  const c = cityBySlug(r.city)
  if (!c) return null
  const near = spotsNear(c.lat, c.lng, 30)
  const fits = near.filter(s => r.disciplines.some(d => s.disciplines.includes(d)))
  return fits[r.spot] ?? fits[0] ?? near[0] ?? null
}

function toCard(r: SampleRider): RiderCard {
  const spot = homeSpot(r)
  return {
    username: r.username, display_name: r.display_name, avatar_url: null, bio: r.bio,
    disciplines: r.disciplines, level: r.level, home_city: r.city, home_spots: spot ? [spot.slug] : [], sample: true,
  }
}

function toLite(r: SampleRider): RiderLite {
  return { username: r.username, display_name: r.display_name, avatar_url: null, sample: true }
}

export function sampleRiders(filter: { city?: string; spot?: string } = {}): RiderCard[] {
  return RIDERS.map(toCard).filter(r =>
    (!filter.city || r.home_city === filter.city) && (!filter.spot || r.home_spots.includes(filter.spot)))
}

export function sampleRider(username: string): RiderCard | null {
  const r = RIDERS.find(x => x.username === username)
  return r ? toCard(r) : null
}

// ── Sessions ─────────────────────────────────────────────────────────

interface Template {
  title: string
  notes: string
  weekday: number        // 0 = Sunday
  time: string           // HH:MM
  level: Level | 'all'
  beginners: boolean
  fits: (s: IndexedSpot) => boolean
  disciplines: (s: IndexedSpot) => string[]
}

const skateKinds = new Set(['park', 'plaza', 'diy', 'street', 'bowl', 'indoor'])
const own = (s: IndexedSpot) => s.disciplines

const TEMPLATES: Template[] = [
  { title: 'Saturday morning beginners session', weekday: 6, time: '10:00', level: 'new', beginners: true,
    notes: 'Brand new, or back after years off? Come roll. We start on the flat and the small banks and nobody is in a hurry. Bring a helmet.',
    fits: s => skateKinds.has(s.kind) && s.kind !== 'street', disciplines: own },
  { title: 'Thursday roller night', weekday: 4, time: '18:30', level: 'all', beginners: true,
    notes: 'Roller and inline skaters of any level. Laps, music, and a few people working on park basics.',
    fits: s => s.disciplines.includes('roller') && s.kind !== 'street', disciplines: () => ['roller', 'inline'] },
  { title: 'Sunday bowl jam', weekday: 0, time: '14:00', level: 'comfortable', beginners: false,
    notes: 'Carving, pumping, a few drop-ins. Take turns and call your line.',
    fits: s => s.kind === 'bowl' || s.features.includes('bowl') || s.features.includes('transition'), disciplines: own },
  { title: 'After-work plaza session', weekday: 3, time: '17:30', level: 'all', beginners: false,
    notes: 'Ledges and manuals until the light goes. Filming if someone brings a camera.',
    fits: s => s.kind === 'plaza' || s.features.includes('ledges'), disciplines: s => s.disciplines.filter(d => d !== 'mtb') },
  { title: 'Pump track laps', weekday: 2, time: '18:00', level: 'all', beginners: true,
    notes: 'Any wheels. Short laps, swap tips, nobody is timing anyone.',
    fits: s => s.kind === 'pumptrack' || s.features.includes('pump track'), disciplines: own },
  { title: 'Dig, then ride', weekday: 6, time: '09:00', level: 'learning', beginners: false,
    notes: 'Bring a shovel if you have one. We dig for an hour, then ride the lines.',
    fits: s => s.kind === 'bikepark' || s.kind === 'bmxtrack' || s.features.includes('dirt jumps'), disciplines: () => ['bmx', 'mtb'] },
  { title: 'Friday indoor session', weekday: 5, time: '19:00', level: 'all', beginners: true,
    notes: 'Whatever the weather. Check the park’s fees and waiver before you come.',
    fits: s => s.indoor, disciplines: own },
]

const SESSION_CITIES = ['toronto', 'montreal', 'vancouver', 'calgary', 'ottawa', 'new-york', 'los-angeles', 'san-francisco', 'seattle',
  'portland-oregon', 'chicago', 'denver', 'austin', 'philadelphia', 'mexico-city', 'guadalajara', 'edmonton', 'halifax']

// Small stable hash, so counts and picks don't jump around between visits
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

function nextWeekday(today: string, weekday: number): string {
  const [y, m, d] = today.split('-').map(Number)
  const now = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return addDays(today, ((weekday - now + 7) % 7) || 7)
}

export function sampleSessions(now = Date.now()): RideSession[] {
  const out: RideSession[] = []
  for (const slug of SESSION_CITIES) {
    const city = cityBySlug(slug)
    if (!city) continue
    const spots = spotsNear(city.lat, city.lng, 30).slice(0, 8)
    const locals = RIDERS.filter(r => r.city === slug)
    const others = RIDERS.filter(r => r.city !== slug)
    const used = new Set<string>()
    let n = 0
    // Each city gets its own mix: try the templates in an order seeded by the city
    const order = [...TEMPLATES].sort((a, b) => hash(`${slug}|${a.title}`) - hash(`${slug}|${b.title}`))
    for (const t of order) {
      if (n >= 3) break
      const spot = spots.find(s => t.fits(s) && !used.has(s.slug))
      if (!spot) continue
      used.add(spot.slug)
      const h = hash(`${slug}:${t.title}`)
      const date = nextWeekday(localToday(city.lng, now), t.weekday)
      const startsLocal = `${date}T${t.time}`
      const offsetH = Math.round(city.lng / 15)
      const startsAt = new Date(Date.parse(`${startsLocal}:00Z`) - offsetH * 3600_000).toISOString()
      const host = locals[n % Math.max(1, locals.length)] ?? others[h % others.length]
      const going = [...locals.filter(r => r !== host), ...others.filter((_, i) => (h + i) % 7 === 0)].slice(0, 3)
      const disciplines = t.disciplines(spot)
      out.push({
        id: `sample-${slug}-${n + 1}`,
        sample: true,
        title: t.title,
        notes: t.notes,
        spot_slug: spot.slug,
        park_id: null,
        place_name: spot.name,
        city: slug,
        lat: spot.lat,
        lng: spot.lng,
        starts_at: startsAt,
        starts_local: startsLocal,
        disciplines: disciplines.length ? disciplines : spot.disciplines,
        level: t.level,
        beginners_welcome: t.beginners,
        cancelled: false,
        host: toLite(host),
        riders: going.map(toLite),
        riders_count: going.length + 1 + (h % 6),
      })
      n += 1
    }
  }
  return out.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

export function sampleSession(id: string, now = Date.now()): RideSession | null {
  return sampleSessions(now).find(s => s.id === id) ?? null
}

// Real first; samples fill in only while a list has fewer than `min` real entries.
export function withSamples<T>(real: T[], samples: T[], min = 3, max = 12): T[] {
  if (real.length >= min) return real.slice(0, max)
  return [...real, ...samples].slice(0, Math.max(max, real.length))
}
