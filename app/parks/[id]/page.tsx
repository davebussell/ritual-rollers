import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SpotView from '@/components/SpotView'
import { parkById, parksNear, parkName, PARK_KIND_META, osmUrl, osmEditUrl } from '@/lib/parks'
import { linesFor, rideable } from '@/lib/lines'
import ParkMapSection from '@/components/ParkMapSection'
import { shopsNear } from '@/lib/shops'
import Plans from '@/components/Plans'
import { spotsNear, COUNTRY_LABEL, isFeaturedPark } from '@/lib/spots-index'
import { crewsNear } from '@/lib/crews'
import { nearestCity } from '@/lib/cities'
import { upcomingSessions } from '@/lib/sessions'
import { getWheel } from '@/lib/wheel-server'
import { fits, parkFits } from '@/lib/wheels'

export const dynamic = 'force-dynamic'

const SITE = 'https://ritualrollers.com'

function where(p: { city?: string; region?: string; cc: 'CA' | 'US' | 'MX' }, hubName?: string): string {
  return [p.city ?? hubName, p.region, COUNTRY_LABEL[p.cc]].filter(Boolean).join(', ')
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const park = parkById(id)
  if (!park) return { title: 'Spot not found' }
  const hub = nearestCity(park.lat, park.lng)
  const name = parkName(park)
  const title = `${name}${park.city ?? hub?.name ? `, ${park.city ?? hub?.name}` : ''}: sessions and riders`
  const description = `${PARK_KIND_META[park.kind].label} in ${where(park, hub?.name)}. Sessions people are posting, and the spots and crews nearby.`
  return {
    title, description,
    alternates: { canonical: `/parks/${id}` },
    // Unnamed parks are useful on the map but too thin to index
    robots: park.name ? undefined : { index: false, follow: true },
    openGraph: { title, description, url: `${SITE}/parks/${id}`, type: 'website' },
  }
}

export default async function ParkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const park = parkById(id)
  if (!park) notFound()
  const hub = nearestCity(park.lat, park.lng)
  const { wheel } = await getWheel()
  const sessions = await upcomingSessions({ park: id, disciplines: wheel?.disciplines, limit: 8 })
  const misfit = wheel && !parkFits(park.kind, wheel) ? `This ${PARK_KIND_META[park.kind].label.toLowerCase()} isn't one for ${wheel.lower}.` : undefined
  // Who rides it, by kind of park (OSM's sport tags are too sparse to go on)
  const disciplines = { skate: ['skateboard', 'roller', 'inline', 'scooter', 'bmx'], pump: ['skateboard', 'roller', 'inline', 'scooter', 'bmx', 'mtb'], bmx: ['bmx'], bike: ['mtb', 'bmx'] }[park.kind]

  return (
    <SpotView
      facts={{
        name: parkName(park),
        kindLabel: PARK_KIND_META[park.kind].label,
        color: PARK_KIND_META[park.kind].color,
        place: where(park, hub?.name),
        cityHref: hub ? `/cities/${hub.slug}` : undefined,
        lat: park.lat, lng: park.lng,
        about: park.name ? undefined : 'This one is on the map without a name. If you know it, tell people in a session, or fix it on OpenStreetMap.',
        features: [],
        disciplines,
        cost: park.fee === true ? 'paid' : park.fee === false ? 'free' : 'unknown',
        lit: park.lit ?? null,
        indoor: !!park.indoor,
        hours: park.hours,
        web: park.web,
        source: { url: osmUrl(park.id), label: 'OpenStreetMap' },
      }}
      postHref={`/sessions/new?park=${id}`}
      sessions={sessions}
      riders={[]}
      crews={crewsNear(park.lat, park.lng, 25).filter(c => fits(c.disciplines, wheel))}
      nearbySpots={spotsNear(park.lat, park.lng, 40).filter(s => fits(s.disciplines, wheel))}
      nearbyParks={parksNear(park.lat, park.lng, 20, 200).filter(p => p.id !== park.id && !isFeaturedPark(p) && parkFits(p.kind, wheel)).slice(0, 60)}
      shops={shopsNear(park.lat, park.lng, 25, wheel, 4)}
      plans={<Plans place={{ park: park.id, name: parkName(park), city: hub?.slug ?? null, lat: park.lat, lng: park.lng }} next={`/parks/${id}`} />}
      wheelLabel={wheel?.lower}
      misfit={misfit}
      parkMap={
        <ParkMapSection
          parkId={park.id} parkKind={park.kind} color={PARK_KIND_META[park.kind].color} name={parkName(park)}
          entry={linesFor(park.id)}
          rideHref={rideable(park.id) ? `/ride/${park.id}` : null}
          rideLabel={wheel && park.kind !== 'pump' && wheel.id !== 'bike' ? 'Ride it in 3D (on a bike)' : undefined}
          editUrl={osmEditUrl(park.id)}
        />
      }
    />
  )
}
