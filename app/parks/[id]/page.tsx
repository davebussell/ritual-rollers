import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SpotView from '@/components/SpotView'
import { parkById, parksNear, parkName, PARK_KIND_META, osmUrl, osmEditUrl } from '@/lib/parks'
import { linesFor } from '@/lib/lines'
import ParkMapSection from '@/components/ParkMapSection'
import { shopsNear } from '@/lib/shops'
import Plans from '@/components/Plans'
import Photos, { Credit } from '@/components/Photos'
import { photosFor } from '@/lib/photos'
import { spotsNear, COUNTRY_LABEL, isFeaturedPark } from '@/lib/spots-index'
import { crewsNear } from '@/lib/crews'
import { nearestCity } from '@/lib/cities'
import { getWheel } from '@/lib/wheel-server'
import { fits, parkFits } from '@/lib/wheels'

export const dynamic = 'force-dynamic'

// The first photo of someone riding it, as the page's banner
function heroFor(list: ReturnType<typeof photosFor>) {
  const p = list.find(x => x.width >= x.height) ?? list[0]
  return p ? { src: p.src, alt: p.caption || p.title, credit: <Credit p={p} /> } : null
}

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

export default async function ParkPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams
  const { id } = await params
  const park = parkById(id)
  if (!park) notFound()
  const hub = nearestCity(park.lat, park.lng)
  const { wheel } = await getWheel()
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
      riders={[]}
      crews={crewsNear(park.lat, park.lng, 25).filter(c => fits(c.disciplines, wheel))}
      nearbySpots={spotsNear(park.lat, park.lng, 40).filter(s => fits(s.disciplines, wheel))}
      nearbyParks={parksNear(park.lat, park.lng, 20, 200).filter(p => p.id !== park.id && !isFeaturedPark(p) && parkFits(p.kind, wheel)).slice(0, 60)}
      shops={shopsNear(park.lat, park.lng, 25, wheel, 4)}
      photos={<Photos place={{ park: park.id, lat: park.lat, lng: park.lng }} name={parkName(park)} next={`/parks/${id}`} />}
      hero={heroFor(photosFor({ park: park.id }))}
      plans={<Plans place={{ park: park.id, name: parkName(park), city: hub?.slug ?? null, lat: park.lat, lng: park.lng }} next={`/parks/${id}`} open={plan === '1'} />}
      wheelLabel={wheel?.lower}
      misfit={misfit}
      parkMap={
        <ParkMapSection
          parkId={park.id} parkKind={park.kind} color={PARK_KIND_META[park.kind].color} name={parkName(park)}
          lat={park.lat} lng={park.lng} country={park.cc}
          entry={linesFor(park.id)}
          editUrl={osmEditUrl(park.id)}
        />
      }
    />
  )
}
