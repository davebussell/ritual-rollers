import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Hub from '@/components/Hub'
import { CITIES, nearestCity } from '@/lib/cities'
import { crewsNear } from '@/lib/crews'
import { spotsNear, isFeaturedPark, isNorthAmerica } from '@/lib/spots-index'
import { parksNear } from '@/lib/parks'
import { upcomingSessions } from '@/lib/sessions'
import { geocodePlace, fromSlug, haversineKm } from '@/lib/geo'

export const dynamic = 'force-dynamic'

const RADIUS = 30

// Any town: if it sits inside a city hub, go there; otherwise show what's around it.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { title: `Riding near ${fromSlug(slug)}`, robots: { index: false } }
}

export default async function NearPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const place = await geocodePlace(fromSlug(slug))
  if (!place || !isNorthAmerica(place.countryCode)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <h1 className="h-display text-[32px]">We couldn&apos;t find that place</h1>
        <p className="mt-4 text-[17px] text-asphalt-2">
          {place ? 'Ritual Rollers covers Canada, the US and Mexico for now.' : `Nothing came up for “${fromSlug(slug)}”. Try the town’s name, or a zip or postal code.`}
        </p>
        <p className="mt-6"><Link href="/cities" className="btn btn-dark">Browse cities</Link></p>
      </div>
    )
  }
  const hub = nearestCity(place.lat, place.lng, 35)
  if (hub) redirect(`/cities/${hub.slug}`)

  const sessions = await upcomingSessions({ near: { lat: place.lat, lng: place.lng, km: RADIUS }, limit: 10 })
  const nearby = CITIES.map(c => ({ c, d: haversineKm(place.lat, place.lng, c.lat, c.lng) }))
    .filter(x => x.d < 200).sort((a, b) => a.d - b.d).slice(0, 6).map(x => ({ slug: x.c.slug, name: x.c.name }))

  return (
    <Hub
      title={`Riding near ${place.label.split(',')[0]}`}
      subtitle={place.label}
      point={place}
      sessions={sessions}
      crews={crewsNear(place.lat, place.lng, RADIUS)}
      spots={spotsNear(place.lat, place.lng, RADIUS)}
      parks={parksNear(place.lat, place.lng, RADIUS, 120).filter(p => !isFeaturedPark(p))}
      riders={[]}
      nearby={nearby}
      radiusKm={RADIUS}
    />
  )
}
