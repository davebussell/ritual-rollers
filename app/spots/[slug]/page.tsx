import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import legacy from '@/data/legacy-spot-slugs.json'
import SpotView from '@/components/SpotView'
import { spotBySlug, spotsNear, isFeaturedPark, COUNTRY_LABEL } from '@/lib/spots-index'
import { parksNear, parkById, PARK_KIND_META, osmEditUrl } from '@/lib/parks'
import { linesFor, rideable } from '@/lib/lines'
import ParkMapSection from '@/components/ParkMapSection'
import { crewsNear } from '@/lib/crews'
import { nearestCity } from '@/lib/cities'
import { upcomingSessions } from '@/lib/sessions'
import { ridersFor } from '@/lib/riders'
import { KIND_META, FEATURE_LABEL } from '@/lib/sports'
import { getWheel } from '@/lib/wheel-server'
import { fits, parkFits } from '@/lib/wheels'

export const dynamic = 'force-dynamic'

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

export default async function SpotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const spot = spotBySlug(slug)
  if (!spot) {
    if (LEGACY.has(slug)) permanentRedirect('/spots')
    notFound()
  }
  const hub = nearestCity(spot.lat, spot.lng)
  const { wheel } = await getWheel()
  const disciplines = wheel?.disciplines
  const [sessions, riders] = await Promise.all([upcomingSessions({ spot: slug, disciplines, limit: 8 }), ridersFor({ spot: slug, disciplines }, 6)])
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
        postHref={`/sessions/new?spot=${slug}`}
        sessions={sessions}
        riders={riders}
        crews={crewsNear(spot.lat, spot.lng, 25).filter(c => fits(c.disciplines, wheel))}
        nearbySpots={spotsNear(spot.lat, spot.lng, 40, slug).filter(s => fits(s.disciplines, wheel))}
        nearbyParks={parksNear(spot.lat, spot.lng, 20, 200).filter(p => p.id !== spot.osm && !isFeaturedPark(p) && p.distanceKm > 0.05 && parkFits(p.kind, wheel)).slice(0, 60)}
        wheelLabel={wheel?.lower}
        misfit={misfit}
        parkMap={park && lines ? (
          <ParkMapSection
            parkId={park.id} parkKind={park.kind} color={PARK_KIND_META[park.kind].color} name={spot.name}
            entry={lines}
            rideHref={rideable(park.id) ? `/ride/${park.id}` : null}
            rideLabel={wheel && park.kind !== 'pump' && wheel.id !== 'bike' ? 'Ride it in 3D (on a bike)' : undefined}
            editUrl={osmEditUrl(park.id)}
          />
        ) : undefined}
      />
    </>
  )
}
