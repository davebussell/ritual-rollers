import Link from 'next/link'
import CitySearch from '@/components/CitySearch'
import { SessionFlyer, SessionRow } from '@/components/SessionBits'
import { CrewRow, RiderRow } from '@/components/Rows'
import { Empty, SectionHead } from '@/components/bits'
import { upcomingSessions } from '@/lib/sessions'
import { ridersFor } from '@/lib/riders'
import { CITIES, POPULAR, cityBySlug } from '@/lib/cities'
import { CREWS, type Crew } from '@/lib/crews'
import { SPOTS } from '@/lib/spots-index'
import { PARKS } from '@/lib/parks'
import { KIND_GROUPS, KIND_META } from '@/lib/sports'
import type { RideSession } from '@/lib/types'
import { getWheel } from '@/lib/wheel-server'
import { fits, parkFits, type Wheel } from '@/lib/wheels'

export const dynamic = 'force-dynamic'

// One per city first, so the home page shows range rather than one busy city
function spread<T>(items: T[], key: (t: T) => string, n: number): T[] {
  const seen = new Set<string>(), first: T[] = [], rest: T[] = []
  for (const it of items) (seen.has(key(it)) ? rest : (seen.add(key(it)), first)).push(it)
  return [...first, ...rest].slice(0, n)
}

function crewMix(n: number, wheel: Wheel | null): Crew[] {
  const byAudience = CREWS.filter(c => fits(c.disciplines, wheel)).sort((a, b) => Number(b.audience.some(x => x !== 'all')) - Number(a.audience.some(x => x !== 'all')))
  return spread(byAudience, c => c.hub ?? c.city, n)
}

export default async function Home() {
  const { wheel } = await getWheel()
  const disciplines = wheel?.disciplines
  const [sessions, riders] = await Promise.all([upcomingSessions({ limit: 40, disciplines }), ridersFor({ disciplines }, 30)])
  // Range over repetition: different cities and different kinds of session
  const flyers = spread(spread(sessions, (s: RideSession) => s.title, 40), (s: RideSession) => s.city ?? s.id, 3)
  const rest = sessions.filter(s => !flyers.includes(s))
  const list = spread(spread(rest, (s: RideSession) => s.title, 40), (s: RideSession) => s.city ?? s.id, 6)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const crews = crewMix(6, wheel)
  const spots = SPOTS.filter(s => fits(s.disciplines, wheel))
  const parks = PARKS.filter(p => parkFits(p.kind, wheel))
  const kinds = KIND_GROUPS.flatMap(g => g.kinds).filter(k => spots.some(s => s.kind === k))
  const people = spread(riders, r => r.home_city ?? r.username, 4)
  const cityOptions = CITIES.map(c => ({ slug: c.slug, name: c.name, region: c.region }))
  const popular = POPULAR.map(cityBySlug).filter(Boolean)

  return (
    <>
      {/* Hero: where you ride, and who's going */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 pb-12 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-16">
        <div className="max-w-xl">
          <h1 className="h-display text-[40px] sm:text-[56px]">Find people to {wheel?.verb ?? 'ride'} with</h1>
          <p className="mt-5 text-lg leading-relaxed text-asphalt-2 sm:text-xl">
            {wheel
              ? `Spots, sessions and crews for ${wheel.lower}, across Canada, the US and Mexico.`
              : 'Spots, sessions and crews for skateboards, roller and inline skates, scooters, BMX and mountain bikes, across Canada, the US and Mexico.'}
          </p>
          <div className="mt-8">
            <CitySearch cities={cityOptions} big />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {popular.slice(0, 8).map(c => c && <Link key={c.slug} href={`/cities/${c.slug}`} className="chip">{c.name}</Link>)}
            <Link href="/cities" className="chip">All cities</Link>
          </div>
          <ol className="mt-10 grid gap-4 border-t-2 border-concrete-2 pt-6 text-[15px] sm:grid-cols-3">
            {[['Pick your city', 'Spots, crews and riders near you.'], ['See who’s going', 'Sessions people have posted, with the time and the spot.'], ['Tap I’m in', 'Then show up and ride. Or post your own.']].map(([t, d], i) => (
              <li key={t} className="flex gap-3 sm:block">
                <span aria-hidden="true" className="font-display text-[22px] font-bold text-fire">{i + 1}</span>
                <span><span className="block font-extrabold sm:mt-1">{t}</span><span className="block text-asphalt-2">{d}</span></span>
              </li>
            ))}
          </ol>
        </div>
        <div aria-label="Sessions coming up" className="grid min-w-0 grid-cols-1 gap-7 overflow-x-clip px-1 pt-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-9 lg:pt-6">
          {flyers.map((s, i) => (
            <div key={s.id} className={i === 2 ? 'sm:col-span-2 sm:mx-auto sm:w-[calc(50%+1rem)]' : ''}>
              <SessionFlyer s={s} i={i} />
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 sm:px-6">
        {/* Sessions */}
        <section>
          <SectionHead title="Sessions coming up" href="/sessions" linkLabel="All sessions">
            Someone says where and when, others say they&apos;re in. Sessions are public and happen at public spots.
          </SectionHead>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rows panel px-4 sm:px-5">{list.map(s => <SessionRow key={s.id} s={s} />)}</div>
            <aside className="panel h-fit p-5">
              <h3 className="text-[17px] font-extrabold">Going riding anyway?</h3>
              <p className="mt-1.5 text-[15px] text-asphalt-2">Post it. Say if beginners are welcome. People nearby can tap I&apos;m in.</p>
              <Link href="/sessions/new" className="btn btn-curb mt-4 w-full">Post a session</Link>
              <p className="mt-3 text-[13px] text-muted">Accounts are for riders 16 and over. <Link href="/guidelines" className="prose-link">How sessions work</Link></p>
            </aside>
          </div>
        </section>

        {/* Crews */}
        <section>
          <SectionHead title="Crews you can show up to" href="/crews" linkLabel="All crews">
            Skate nights, roller groups, women&apos;s and queer sessions, BMX and bike clubs: real groups, with their own links.
          </SectionHead>
          {crews.length ? (
            <div className="rows panel px-4 sm:px-5 md:columns-2 md:gap-10 md:[&>*]:break-inside-avoid">
              {crews.map(c => <CrewRow key={c.slug} c={c} />)}
            </div>
          ) : (
            <Empty>The crews directory is being filled in. Run a crew or a regular session? <Link href="/crews/add" className="prose-link font-semibold">Add it</Link>.</Empty>
          )}
        </section>

        {/* Riders */}
        <section>
          <SectionHead title="Riders looking for people" href="/riders" linkLabel="All riders">
            New in town, starting late, or just want company. Riders list their city and the spots they ride, never where they live.
          </SectionHead>
          <div className="rows panel px-4 sm:px-5 md:columns-2 md:gap-10 md:[&>*]:break-inside-avoid">
            {people.map(r => <RiderRow key={r.username} r={r} />)}
          </div>
          <p className="mt-4 text-[15px]"><Link href="/me" className="prose-link font-semibold">List yourself</Link> <span className="text-muted">so people near you can find you.</span></p>
        </section>

        {/* Spots */}
        <section>
          <SectionHead title="Spots" href="/spots" linkLabel="Browse spots">
            {spots.length} researched spots worth the trip, plus {parks.length.toLocaleString('en-US')}{' '}
            {wheel?.id === 'bike' ? 'pump tracks, BMX tracks and bike parks' : wheel ? 'skateparks and pump tracks' : 'skateparks, pump tracks, BMX tracks and bike parks'} from OpenStreetMap.
          </SectionHead>
          <div className="flex flex-wrap gap-2">
            {kinds.map(k => (
              <Link key={k} href={`/spots?kind=${k}`} className="chip">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: KIND_META[k].color }} />
                {KIND_META[k].plural}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
