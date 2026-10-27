// Sample riders and plans, so a first visit shows how the site works before real riders post.
// Everything here is invented and is always shown with a "Sample" tag. Plans are generated relative to today, at real
// spots, so they're always upcoming: each sample city gets one place per kind of wheel (board, skates, bike) where a
// spot fits. Real riders and plans push samples out (see withSamples).

import type { Level } from '@/lib/sports'
import type { RiderCard } from '@/lib/types'
import type { PlacePlans, PlanCount } from '@/lib/plans'
import { cityBySlug } from '@/lib/cities'
import { spotsNear, type IndexedSpot } from '@/lib/spots-index'
import { parksNear, PARK_KIND_META, type NearPark } from '@/lib/parks'
import { WHEELS, type WheelId } from '@/lib/wheels'
import { addDays, localToday } from '@/lib/format'

interface SampleRider {
  username: string
  display_name: string
  city: string
  disciplines: string[]
  level: Level
  bio: string
  spot: number            // which nearby fitting featured spot is home (index)
}

const RIDERS: SampleRider[] = [
  // Toronto
  { username: 'mara.rolls', display_name: 'Mara K.', city: 'toronto', disciplines: ['roller'], level: 'learning', bio: 'Rink skater learning the park. Looking for people to drop in with on weekday evenings.', spot: 0 },
  { username: 'devon_sk8', display_name: 'Devon A.', city: 'toronto', disciplines: ['skateboard'], level: 'comfortable', bio: 'Back on a board after twelve years. Early Saturdays, mostly the small bowl.', spot: 1 },
  { username: 'theo.bmx', display_name: 'Theo W.', city: 'toronto', disciplines: ['bmx'], level: 'comfortable', bio: 'Park BMX and pump tracks. Usually out after work until it gets dark.', spot: 0 },
  // Montreal
  { username: 'lea.patine', display_name: 'Léa B.', city: 'montreal', disciplines: ['inline', 'roller'], level: 'comfortable', bio: 'Aggressive inline, a bit of park on quads. Always up for a Sunday session.', spot: 0 },
  { username: 'samir.bmx', display_name: 'Samir H.', city: 'montreal', disciplines: ['bmx'], level: 'advanced', bio: 'Park and street BMX. Happy to show newer riders the lines.', spot: 1 },
  { username: 'julien.planche', display_name: 'Julien D.', city: 'montreal', disciplines: ['skateboard'], level: 'learning', bio: 'Learning to drop in at forty. Weekday mornings when the park is quiet.', spot: 0 },
  // Vancouver
  { username: 'jess_pumps', display_name: 'Jess T.', city: 'vancouver', disciplines: ['mtb', 'bmx'], level: 'comfortable', bio: 'Pump tracks after work, North Shore on weekends.', spot: 0 },
  { username: 'kai.wheels', display_name: 'Kai N.', city: 'vancouver', disciplines: ['skateboard'], level: 'learning', bio: 'Adult beginner. Would love a crew that does not mind slams.', spot: 1 },
  { username: 'ruby.rolls', display_name: 'Ruby S.', city: 'vancouver', disciplines: ['roller'], level: 'new', bio: 'Just bought quads. Looking for a patient group to learn the park with.', spot: 0 },
  // Calgary
  { username: 'tara_bowls', display_name: 'Tara M.', city: 'calgary', disciplines: ['skateboard', 'roller'], level: 'comfortable', bio: 'Bowl carver. Skate mom of two; we ride as a family on Sundays.', spot: 0 },
  { username: 'raf.dirt', display_name: 'Rafa C.', city: 'calgary', disciplines: ['mtb', 'bmx'], level: 'advanced', bio: 'Dirt jumps and the pump track. Will lend a shovel.', spot: 0 },
  // Ottawa
  { username: 'nico.ottawa', display_name: 'Nico R.', city: 'ottawa', disciplines: ['skateboard'], level: 'comfortable', bio: 'Street and plaza. Usually at the plaza after work when it is light.', spot: 0 },
  { username: 'ana.roda', display_name: 'Ana P.', city: 'ottawa', disciplines: ['roller'], level: 'new', bio: 'New to roller skating. Looking for a beginners group, or anyone patient.', spot: 1 },
  { username: 'gabe.ottawa', display_name: 'Gabe L.', city: 'ottawa', disciplines: ['bmx', 'mtb'], level: 'learning', bio: 'Getting into dirt jumps. Weekends at the bike park.', spot: 0 },
  // New York
  { username: 'rae.ny', display_name: 'Rae C.', city: 'new-york', disciplines: ['skateboard'], level: 'advanced', bio: 'Ledges and manual pads. Down to film.', spot: 0 },
  { username: 'luis_quads', display_name: 'Luis G.', city: 'new-york', disciplines: ['roller'], level: 'comfortable', bio: 'Jam skater taking it to the park. Thursday nights.', spot: 1 },
  { username: 'kenji.bmx', display_name: 'Kenji O.', city: 'new-york', disciplines: ['bmx'], level: 'comfortable', bio: 'Street BMX, the odd park session. Always looking for people to ride with.', spot: 0 },
  // Los Angeles
  { username: 'brooke.la', display_name: 'Brooke S.', city: 'los-angeles', disciplines: ['skateboard'], level: 'learning', bio: 'Thirty-something beginner. Looking for other late starters.', spot: 0 },
  { username: 'omar.dirt', display_name: 'Omar F.', city: 'los-angeles', disciplines: ['bmx', 'mtb'], level: 'advanced', bio: 'Dirt jumps. I dig on Saturdays, everyone is welcome to help.', spot: 0 },
  { username: 'gigi.la', display_name: 'Gigi R.', city: 'los-angeles', disciplines: ['roller'], level: 'learning', bio: 'Boardwalk skater moving into the park. Sunday mornings.', spot: 0 },
  // San Francisco
  { username: 'quinn.sf', display_name: 'Quinn L.', city: 'san-francisco', disciplines: ['skateboard', 'scooter'], level: 'comfortable', bio: 'Hills and plazas. Usually out at lunch.', spot: 0 },
  { username: 'marisol.sf', display_name: 'Marisol V.', city: 'san-francisco', disciplines: ['roller'], level: 'comfortable', bio: 'Park skating on quads, learning coping tricks.', spot: 0 },
  // Seattle
  { username: 'ivy.seattle', display_name: 'Ivy W.', city: 'seattle', disciplines: ['roller', 'inline'], level: 'learning', bio: 'Rain or shine, mostly under the bridge. Learning drop-ins.', spot: 0 },
  { username: 'lila.mtb', display_name: 'Lila P.', city: 'seattle', disciplines: ['mtb'], level: 'learning', bio: 'Trail rider learning jumps on the pump track.', spot: 0 },
  { username: 'owen.sea', display_name: 'Owen B.', city: 'seattle', disciplines: ['skateboard'], level: 'comfortable', bio: 'Transition mostly. Usually around after six.', spot: 1 },
  // Portland
  { username: 'max.pdx', display_name: 'Max O.', city: 'portland-oregon', disciplines: ['skateboard'], level: 'advanced', bio: 'Burnside regular. Will happily tell you where the DIYs are.', spot: 0 },
  { username: 'bea.pdx', display_name: 'Bea N.', city: 'portland-oregon', disciplines: ['inline'], level: 'comfortable', bio: 'Aggressive inline. Looking for people to session the parks with.', spot: 0 },
  { username: 'cruz.pdx', display_name: 'Cruz A.', city: 'portland-oregon', disciplines: ['bmx', 'mtb'], level: 'comfortable', bio: 'Pump tracks and BMX race nights.', spot: 0 },
  // Chicago
  { username: 'dani.chi', display_name: 'Dani V.', city: 'chicago', disciplines: ['skateboard', 'roller'], level: 'comfortable', bio: 'Lakefront sessions all summer, indoor all winter.', spot: 0 },
  { username: 'zoe.chi', display_name: 'Zoe K.', city: 'chicago', disciplines: ['bmx'], level: 'new', bio: 'New to BMX at 34. Looking for a beginner-friendly crew.', spot: 0 },
  // Denver
  { username: 'sol.denver', display_name: 'Sol R.', city: 'denver', disciplines: ['skateboard'], level: 'learning', bio: 'Moved here in spring. Looking for a crew.', spot: 0 },
  { username: 'dee.denver', display_name: 'Dee M.', city: 'denver', disciplines: ['roller'], level: 'learning', bio: 'Roller skater, mostly parks. Weekend mornings.', spot: 0 },
  { username: 'nora.denver', display_name: 'Nora F.', city: 'denver', disciplines: ['mtb'], level: 'comfortable', bio: 'Bike park weekends, pump track after work.', spot: 0 },
  // Austin
  { username: 'hank.atx', display_name: 'Hank D.', city: 'austin', disciplines: ['bmx'], level: 'comfortable', bio: 'Pump track loops and the odd race night.', spot: 0 },
  { username: 'tess.atx', display_name: 'Tess Y.', city: 'austin', disciplines: ['roller'], level: 'new', bio: 'First pair of quads. Want people to learn with.', spot: 0 },
  // Philadelphia
  { username: 'priya.philly', display_name: 'Priya S.', city: 'philadelphia', disciplines: ['skateboard'], level: 'new', bio: 'Brand new. Taking lessons, want people to practise with.', spot: 0 },
  { username: 'kim.philly', display_name: 'Kim T.', city: 'philadelphia', disciplines: ['inline'], level: 'learning', bio: 'Inline skater learning the park.', spot: 0 },
  { username: 'ben.philly', display_name: 'Ben R.', city: 'philadelphia', disciplines: ['bmx'], level: 'learning', bio: 'BMX after a long break. Weekday evenings.', spot: 0 },
  // Mexico
  { username: 'fer.cdmx', display_name: 'Fer Z.', city: 'mexico-city', disciplines: ['skateboard', 'roller'], level: 'comfortable', bio: 'Patino y skate los domingos. Sundays on the flat ground and the bowl.', spot: 0 },
  { username: 'paco.cdmx', display_name: 'Paco M.', city: 'mexico-city', disciplines: ['bmx'], level: 'advanced', bio: 'BMX park y calle. Happy to ride with newer riders.', spot: 0 },
  { username: 'memo.gdl', display_name: 'Memo E.', city: 'guadalajara', disciplines: ['bmx', 'skateboard'], level: 'advanced', bio: 'Park sessions after work, mostly the big bowl.', spot: 0 },
  { username: 'vale.gdl', display_name: 'Vale R.', city: 'guadalajara', disciplines: ['roller'], level: 'comfortable', bio: 'Patinaje en parque, Sunday mornings.', spot: 0 },
  // Edmonton, Halifax
  { username: 'june.yeg', display_name: 'June H.', city: 'edmonton', disciplines: ['skateboard', 'inline'], level: 'comfortable', bio: 'River valley rides, then the park.', spot: 0 },
  { username: 'cam.halifax', display_name: 'Cam J.', city: 'halifax', disciplines: ['skateboard'], level: 'learning', bio: 'Learning transition. Weekends.', spot: 0 },
  { username: 'nadia.hfx', display_name: 'Nadia S.', city: 'halifax', disciplines: ['roller'], level: 'learning', bio: 'Roller skater looking for a park crew.', spot: 0 },
]

export function isSampleUsername(username: string): boolean {
  return RIDERS.some(r => r.username === username)
}

const ridesAny = (r: { disciplines: string[] }, list: string[]) => r.disciplines.some(d => list.includes(d))

function homeSpot(r: SampleRider): IndexedSpot | null {
  const c = cityBySlug(r.city)
  if (!c) return null
  const fitting = spotsNear(c.lat, c.lng, 30).filter(s => ridesAny(r, s.disciplines))
  return fitting[r.spot] ?? fitting[0] ?? null
}

function toCard(r: SampleRider): RiderCard {
  const spot = homeSpot(r)
  return {
    username: r.username, display_name: r.display_name, avatar_url: null, bio: r.bio,
    disciplines: r.disciplines, level: r.level, home_city: r.city, home_spots: spot ? [spot.slug] : [], sample: true,
  }
}

export function sampleRiders(filter: { city?: string; spot?: string; disciplines?: string[] } = {}): RiderCard[] {
  return RIDERS.map(toCard).filter(r =>
    (!filter.city || r.home_city === filter.city) && (!filter.spot || r.home_spots.includes(filter.spot)) &&
    (!filter.disciplines || ridesAny(r, filter.disciplines)))
}

export function sampleRider(username: string): RiderCard | null {
  const r = RIDERS.find(x => x.username === username)
  return r ? toCard(r) : null
}

// ── Sample plans ─────────────────────────────────────────────────────

interface Place { slug: string | null; parkId: string | null; name: string; lat: number; lng: number; disciplines: string[]; kind: string; features: string[]; indoor: boolean }

interface Template {
  wheel: WheelId
  title: string
  notes: string
  weekday: number        // 0 = Sunday
  time: string           // HH:MM
  level: Level | 'all'
  beginners: boolean
  fits: (p: Place) => boolean
}

const skateKinds = new Set(['park', 'plaza', 'diy', 'bowl', 'indoor', 'skate'])
const dirt = (p: Place) => ['bikepark', 'bmxtrack', 'bmx', 'bike'].includes(p.kind) || p.features.includes('dirt jumps')
const pump = (p: Place) => ['pumptrack', 'pump'].includes(p.kind) || p.features.includes('pump track')

const TEMPLATES: Template[] = [
  // Board
  { wheel: 'board', title: 'Saturday morning beginners session', weekday: 6, time: '10:00', level: 'new', beginners: true,
    notes: 'Brand new, or back after years off? Come roll. We start on the flat and the small banks and nobody is in a hurry. Bring a helmet.',
    fits: p => skateKinds.has(p.kind) },
  { wheel: 'board', title: 'Sunday bowl jam', weekday: 0, time: '14:00', level: 'comfortable', beginners: false,
    notes: 'Carving, pumping, a few drop-ins. Take turns and call your line.',
    fits: p => p.kind === 'bowl' || p.features.includes('bowl') || p.features.includes('transition') },
  { wheel: 'board', title: 'After-work plaza session', weekday: 3, time: '17:30', level: 'all', beginners: false,
    notes: 'Ledges and manuals until the light goes. Filming if someone brings a camera.',
    fits: p => p.kind === 'plaza' || p.features.includes('ledges') },
  { wheel: 'board', title: 'Friday indoor session', weekday: 5, time: '19:00', level: 'all', beginners: true,
    notes: 'Whatever the weather. Check the park’s fees and waiver before you come.',
    fits: p => p.indoor },
  // Skates
  { wheel: 'skates', title: 'Thursday roller night', weekday: 4, time: '18:30', level: 'all', beginners: true,
    notes: 'Roller and inline skaters of any level. Laps, music, and a few people working on park basics.',
    fits: p => skateKinds.has(p.kind) && p.disciplines.includes('roller') },
  { wheel: 'skates', title: 'Park basics on skates', weekday: 0, time: '11:00', level: 'learning', beginners: true,
    notes: 'Rolling in and out of the small banks, then dropping in when you’re ready. Wrist guards and a helmet, please.',
    fits: p => skateKinds.has(p.kind) && p.disciplines.includes('roller') },
  // Bike
  { wheel: 'bike', title: 'Pump track laps', weekday: 2, time: '18:00', level: 'all', beginners: true,
    notes: 'Short laps, swap tips, nobody is timing anyone.',
    fits: pump },
  { wheel: 'bike', title: 'Dig, then ride', weekday: 6, time: '09:00', level: 'learning', beginners: false,
    notes: 'Bring a shovel if you have one. We dig for an hour, then ride the lines.',
    fits: p => dirt(p) && p.kind !== 'bmx' && p.kind !== 'bmxtrack' },
  { wheel: 'bike', title: 'Track night: laps and gate starts', weekday: 4, time: '18:00', level: 'all', beginners: true,
    notes: 'Easy laps to warm up, then a few gate starts. First-timers welcome; borrow a plate at the track.',
    fits: p => p.kind === 'bmx' || p.kind === 'bmxtrack' },
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

const fromSpot = (s: IndexedSpot): Place => ({ slug: s.slug, parkId: null, name: s.name, lat: s.lat, lng: s.lng, disciplines: s.disciplines, kind: s.kind, features: s.features, indoor: s.indoor })
const fromPark = (p: NearPark): Place => ({ slug: null, parkId: p.id, name: p.name ?? PARK_KIND_META[p.kind].label, lat: p.lat, lng: p.lng,
  disciplines: p.kind === 'skate' ? ['skateboard', 'roller', 'inline', 'scooter'] : ['bmx', 'mtb', 'skateboard', 'scooter'], kind: p.kind, features: [], indoor: !!p.indoor })

// Sample plans: a few places per sample city where "riders plan to be" this week, so a first visit shows how it works.
// Always tagged Sample, at real spots, and they give way as soon as an area has real plans.
export function samplePlacePlans(now = Date.now()): PlacePlans[] {
  const out: PlacePlans[] = []
  for (const slug of SESSION_CITIES) {
    const city = cityBySlug(slug)
    if (!city) continue
    // Featured spots first; named mapped parks as a fallback (bike spots are thin among the featured ones)
    const places = [
      ...spotsNear(city.lat, city.lng, 30).slice(0, 10).map(fromSpot),
      ...parksNear(city.lat, city.lng, 30, 200).filter(p => p.name && p.kind !== 'skate').map(fromPark),
    ]
    const used = new Set<string>()
    for (const wheel of WHEELS) {
      const order = TEMPLATES.filter(t => t.wheel === wheel.id).sort((a, b) => hash(`${slug}|${a.title}`) - hash(`${slug}|${b.title}`))
      for (const t of order) {
        const place = places.find(p => t.fits(p) && !used.has(p.name))
        if (!place) continue
        used.add(place.name)
        const h = hash(`${slug}:${t.title}`)
        const hour = Number(t.time.slice(0, 2))
        const day = nextWeekday(localToday(city.lng, now), t.weekday)
        const days: PlanCount[] = [{ day, part: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening', at_local: null, riders: 2 + (h % 5) }]
        if (h % 3 === 0) days.push({ day: addDays(day, 1), part: 'afternoon', at_local: null, riders: 1 + (h % 3) })
        out.push({
          key: `sample:${slug}:${place.slug ?? place.parkId}`, sample: true,
          spot_slug: place.slug, park_id: place.parkId, name: place.name, lat: place.lat, lng: place.lng, city: slug,
          days, total: days.reduce((n, d) => n + d.riders, 0), friends: [],
        })
        break
      }
    }
  }
  return out
}

// Real first; samples fill in only while a list has fewer than `min` real entries.
export function withSamples<T>(real: T[], samples: T[], min = 3, max = 12): T[] {
  if (real.length >= min) return real.slice(0, max)
  return [...real, ...samples].slice(0, Math.max(max, real.length))
}
