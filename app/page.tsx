import Link from 'next/link'
import CitySearch from '@/components/CitySearch'
import FeaturedParks from '@/components/FeaturedParks'
import { RidingRow } from '@/components/Riding'
import { CrewRow } from '@/components/Rows'
import { Empty, SectionHead } from '@/components/bits'
import { CITIES, POPULAR, cityBySlug } from '@/lib/cities'
import { CREWS, type Crew } from '@/lib/crews'
import { SPOTS } from '@/lib/spots-index'
import { PARKS } from '@/lib/parks'
import { KIND_GROUPS, KIND_META } from '@/lib/sports'
import { featuredPlaces } from '@/lib/photos'
import { ridingEverywhere, placeFits } from '@/lib/riding'
import { getMe } from '@/lib/me'
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
  const me = await getMe()
  const { places: riding } = await ridingEverywhere(wheel, me?.id ?? null, 8)
  const featured = spread(featuredPlaces().filter(f => placeFits(f, wheel)), f => f.city, 9)
  const crews = crewMix(6, wheel)
  const spots = SPOTS.filter(s => fits(s.disciplines, wheel))
  const parks = PARKS.filter(p => parkFits(p.kind, wheel))
  const kinds = KIND_GROUPS.flatMap(g => g.kinds).filter(k => spots.some(s => s.kind === k))
  const cityOptions = CITIES.map(c => ({ slug: c.slug, name: c.name, region: c.region }))
  const popular = POPULAR.map(cityBySlug).filter(Boolean)
  const what = wheel?.id === 'bike' ? 'pump tracks, BMX tracks and bike parks' : wheel ? 'skateparks and pump tracks' : 'skateparks, pump tracks, BMX tracks and bike parks'
  const heroPhotos = featured.slice(0, 3)

  return (
    <>
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 pb-12 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pb-16">
        <div className="max-w-xl">
          <h1 className="h-display text-[40px] sm:text-[56px]">Find a park to {wheel?.verb ?? 'ride'}</h1>
          <p className="mt-5 text-lg leading-relaxed text-asphalt-2 sm:text-xl">
            {(spots.length + parks.length).toLocaleString('en-US')} {what} across Canada, the US and Mexico. See each one in 3D,
            see people riding it, and tag the one you&apos;re riding next.
          </p>
          <div className="mt-8"><CitySearch cities={cityOptions} big /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {popular.slice(0, 8).map(c => c && <Link key={c.slug} href={`/cities/${c.slug}`} className="chip">{c.name}</Link>)}
            <Link href="/cities" className="chip">All cities</Link>
          </div>
          <ol className="mt-10 grid gap-4 border-t-2 border-concrete-2 pt-6 text-[15px] sm:grid-cols-3">
            {[['Find the park', 'Its layout in 3D, the climbs and drops, photos of people riding it.'], ['Tag it', 'Say which day you’re riding it. Everyone sees the count.'], ['Ride with friends', 'Friends see it’s you, and you see where they’re riding.']].map(([t, d], i) => (
              <li key={t} className="flex gap-3 sm:block">
                <span aria-hidden="true" className="font-display text-[22px] font-bold text-fire">{i + 1}</span>
                <span><span className="block font-extrabold sm:mt-1">{t}</span><span className="block text-asphalt-2">{d}</span></span>
              </li>
            ))}
          </ol>
        </div>
        {heroPhotos.length >= 3 ? (
          <div className="grid min-w-0 grid-cols-2 gap-3 self-start">
            {heroPhotos.map((f, i) => (
              <Link key={f.key} href={f.href} className={`group relative block overflow-hidden rounded-xl bg-concrete-2 ${i === 0 ? 'col-span-2' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i === 0 ? f.photo.src : f.photo.thumb} alt={f.photo.caption || f.photo.title} className={`w-full object-cover ${i === 0 ? 'aspect-[16/10]' : 'aspect-square'}`} />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-asphalt/85 to-transparent px-3 pb-2 pt-8 text-flyer">
                  <span className="block text-[15px] font-bold">{f.name}</span>
                  <span className="block text-[11px] opacity-80">{f.photo.year ? `${f.photo.year} · ` : ''}Photo: {f.photo.author} · {f.photo.licence}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel h-fit px-4 sm:px-5">
            <h2 className="pt-4 text-[17px] font-extrabold">Who&apos;s riding this week</h2>
            <div className="rows">{riding.slice(0, 4).map(p => <RidingRow key={p.key} p={p} />)}</div>
          </div>
        )}
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 sm:px-6">
        {featured.length > 0 && (
          <section>
            <SectionHead title="Parks, ridden" href="/spots" linkLabel="Browse every park">
              Real photos of people riding real parks, old and new. Every photo is free to share and credited to whoever took it.
            </SectionHead>
            <FeaturedParks places={featured} />
          </section>
        )}

        <section>
          <SectionHead title="Who's riding this week" href="/riding" linkLabel="Everywhere">
            Spots riders have tagged, and when. Everyone sees how many; friends see who.
          </SectionHead>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            {riding.length ? <div className="rows panel px-4 sm:px-5">{riding.map(p => <RidingRow key={p.key} p={p} />)}</div> : <Empty>Nobody has tagged a spot yet this week.</Empty>}
            <aside className="panel h-fit p-5">
              <h3 className="text-[17px] font-extrabold">Riding somewhere soon?</h3>
              <p className="mt-1.5 text-[15px] text-asphalt-2">Tag the park and when. People see how many are heading there; your friends see it&apos;s you.</p>
              <Link href="/tag" className="btn btn-curb mt-4 w-full">Tag a spot</Link>
              <p className="mt-3 text-[13px] text-muted">Accounts are for riders 16 and over. <Link href="/guidelines" className="prose-link">How it works</Link></p>
            </aside>
          </div>
        </section>

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

        <section>
          <SectionHead title="Every kind of spot" href="/spots" linkLabel="Browse spots">
            {spots.length} researched spots worth the trip, plus {parks.length.toLocaleString('en-US')} {what} from OpenStreetMap.
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
