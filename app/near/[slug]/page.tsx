import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Hub from '@/components/Hub'
import { CITIES, nearestCity } from '@/lib/cities'
import { crewsNear } from '@/lib/crews'
import { spotsNear, isFeaturedPark, isNorthAmerica } from '@/lib/spots-index'
import { parksNear } from '@/lib/parks'
import { shopsNear } from '@/lib/shops'
import { companiesNear } from '@/lib/companies'
import { ridingNear } from '@/lib/riding'
import { getMe } from '@/lib/me'
import { geocodePlace, fromSlug, haversineKm } from '@/lib/geo'
import { getWheel } from '@/lib/wheel-server'
import { fits, parkFits } from '@/lib/wheels'

export const dynamic = 'force-dynamic'

// Companies within 80 km, or the three nearest within 400 km when there are none
function companiesFor(lat: number, lng: number, wheel: Parameters<typeof companiesNear>[3]) {
  const near = companiesNear(lat, lng, 80, wheel)
  return near.length ? { list: near, nearest: false } : { list: companiesNear(lat, lng, 400, wheel).slice(0, 3), nearest: true }
}

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

  const { wheel } = await getWheel()
  const me = await getMe()
  const riding = await ridingNear(place.lat, place.lng, RADIUS, wheel, me?.id ?? null, 10)
  const nearby = CITIES.map(c => ({ c, d: haversineKm(place.lat, place.lng, c.lat, c.lng) }))
    .filter(x => x.d < 200).sort((a, b) => a.d - b.d).slice(0, 6).map(x => ({ slug: x.c.slug, name: x.c.name }))

  return (
    <Hub
      title={`${wheel?.doing ?? 'Riding'} near ${place.label.split(',')[0]}`}
      subtitle={place.label}
      point={place}
      riding={riding}
      crews={crewsNear(place.lat, place.lng, RADIUS).filter(c => fits(c.disciplines, wheel))}
      spots={spotsNear(place.lat, place.lng, RADIUS).filter(s => fits(s.disciplines, wheel))}
      parks={parksNear(place.lat, place.lng, RADIUS, 400).filter(p => !isFeaturedPark(p) && parkFits(p.kind, wheel)).slice(0, 120)}
      shops={shopsNear(place.lat, place.lng, RADIUS, wheel, 60)}
      companies={companiesFor(place.lat, place.lng, wheel)}
      riders={[]}
      nearby={nearby}
      wheelLabel={wheel?.lower}
      radiusKm={RADIUS}
    />
  )
}
