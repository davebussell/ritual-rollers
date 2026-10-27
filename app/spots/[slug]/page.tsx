import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import legacy from '@/data/legacy-spot-slugs.json'
import SpotView from '@/components/SpotView'
import { spotBySlug, spotsNear, isFeaturedPark, COUNTRY_LABEL } from '@/lib/spots-index'
import { parksNear, parkById, PARK_KIND_META, osmEditUrl } from '@/lib/parks'
import { linesFor } from '@/lib/lines'
import ParkMapSection from '@/components/ParkMapSection'
import { shopsNear } from '@/lib/shops'
import Plans from '@/components/Plans'
import Photos, { Credit } from '@/components/Photos'
import { photosFor } from '@/lib/photos'
import { eventsAt } from '@/lib/events'
import { EventRow } from '@/components/EventBits'
import { crewsNear } from '@/lib/crews'
import { nearestCity } from '@/lib/cities'
import { ridersFor } from '@/lib/riders'
import { KIND_META, FEATURE_LABEL } from '@/lib/sports'
import { getWheel } from '@/lib/wheel-server'
import { fits, parkFits } from '@/lib/wheels'

export const dynamic = 'force-dynamic'

function EventsHere({ list }: { list: ReturnType<typeof eventsAt> }) {
  if (!list.length) return null
  return (
    <section>
      <h2 className="h-section text-[22px] sm:text-[26px]">Races and contests here</h2>
      <div className="rows panel mt-3 px-4 sm:px-5">{list.map(e => <EventRow key={e.slug} e={e} />)}</div>
    </section>
  )
}

// The first photo of someone riding it, as the page's banner
function heroFor(list: ReturnType<typeof photosFor>) {
  const p = list.find(x => x.width >= x.height) ?? list[0]
  return p ? { src: p.src, alt: p.caption || p.title, credit: <Credit p={p} /> } : null
}

const SITE = 'https://ritualrollers.com'

// The outdoor-sports index (kite, surf, ski…) that lived here until the wheels relaunch
const LEGACY = new Set(legacy as string[])

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const spot = spotBySlug(slug)
  if (!spot) return { title: 'Spot not found' }
  const title = `${spot.name}, ${spot.city}: sessions and riders`
  const description = `${KIND_META[spot.kind].label} in ${spot.city}, ${spot.region}. ${spot.why}`.slice(0, 300)
  return {
    title, description,
    alternates: { canonical: `/spots/${slug}` },
    openGraph: { title, description, url: `${SITE}/spots/${slug}`, type: 'website' },
  }
}

export default async function SpotPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams
  const { slug } = await params
  const spot = spotBySlug(slug)
  if (!spot) {
    if (LEGACY.has(slug)) permanentRedirect('/spots')
    notFound()
  }
  const hub = nearestCity(spot.lat, spot.lng)
  const { wheel } = await getWheel()
  const disciplines = wheel?.disciplines
  const riders = await ridersFor({ spot: slug, disciplines }, 6)
  const misfit = wheel && !fits(spot.disciplines, wheel) ? `This ${KIND_META[spot.kind].label.toLowerCase()} isn't one for ${wheel.lower}.` : undefined
  // the mapped park behind a featured spot: its outline and lines
  const park = spot.osm ? parkById(spot.osm) : undefined
  const lines = park ? linesFor(park.id) : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': spot.kind === 'street' ? 'Place' : 'SportsActivityLocation',
    name: spot.name,
    description: spot.why,
    url: `${SITE}/spots/${slug}`,
    geo: { '@type': 'GeoCoordinates', latitude: spot.lat, longitude: spot.lng },
    address: { '@type': 'PostalAddress', addressLocality: spot.city, addressRegion: spot.region, addressCountry: spot.country },
    ...(spot.cost === 'free' ? { isAccessibleForFree: true } : {}),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SpotView
        facts={{
          name: spot.name,
          kindLabel: KIND_META[spot.kind].label,
          color: KIND_META[spot.kind].color,
          place: `${spot.city}, ${spot.region}, ${COUNTRY_LABEL[spot.country]}`,
          cityHref: hub ? `/cities/${hub.slug}` : undefined,
          lat: spot.lat, lng: spot.lng,
          about: spot.why,
          headsUp: spot.heads_up,
          features: spot.features.map(f => FEATURE_LABEL[f] ?? f),
          disciplines: spot.disciplines,
          level: spot.skill === 'beginner' ? 'learning' : spot.skill === 'intermediate' ? 'comfortable' : spot.skill === 'advanced' ? 'advanced' : 'all',
          cost: spot.cost,
          lit: spot.lit,
          indoor: spot.indoor,
          source: { url: spot.source, label: new URL(spot.source).hostname.replace(/^www\./, '') },
        }}
        riders={riders}
        crews={crewsNear(spot.lat, spot.lng, 25).filter(c => fits(c.disciplines, wheel))}
        nearbySpots={spotsNear(spot.lat, spot.lng, 40, slug).filter(s => fits(s.disciplines, wheel))}
        nearbyParks={parksNear(spot.lat, spot.lng, 20, 200).filter(p => p.id !== spot.osm && !isFeaturedPark(p) && p.distanceKm > 0.05 && parkFits(p.kind, wheel)).slice(0, 60)}
        shops={shopsNear(spot.lat, spot.lng, 25, wheel, 4)}
        photos={<Photos place={{ spot: slug, park: spot.osm ?? null, lat: spot.lat, lng: spot.lng }} name={spot.name} next={`/spots/${slug}`} />}
        hero={heroFor(photosFor({ spot: slug, park: spot.osm ?? null }))}
        events={<EventsHere list={eventsAt({ spot: slug, park: spot.osm ?? null, lat: spot.lat, lng: spot.lng })} />}
        plans={<Plans place={{ spot: slug, name: spot.name, city: hub?.slug ?? null, lat: spot.lat, lng: spot.lng }} next={`/spots/${slug}`} open={plan === '1'} />}
        wheelLabel={wheel?.lower}
        misfit={misfit}
        parkMap={
          <ParkMapSection
            parkId={park?.id ?? ''} parkKind={park?.kind ?? (spot.kind === 'bmxtrack' ? 'bmx' : spot.kind === 'pumptrack' ? 'pump' : spot.kind === 'bikepark' ? 'bike' : 'skate')}
            color={park ? PARK_KIND_META[park.kind].color : KIND_META[spot.kind].color} name={spot.name}
            lat={spot.lat} lng={spot.lng} country={spot.country}
            entry={lines}
            editUrl={park ? osmEditUrl(park.id) : `https://www.openstreetmap.org/edit#map=19/${spot.lat}/${spot.lng}`}
          />
        }
      />
    </>
  )
}
