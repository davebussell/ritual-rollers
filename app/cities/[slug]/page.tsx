import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Hub from '@/components/Hub'
import { CITIES, HUB_KM, cityBySlug } from '@/lib/cities'
import { crewsNear } from '@/lib/crews'
import { spotsNear, isFeaturedPark, COUNTRY_LABEL } from '@/lib/spots-index'
import { parksNear } from '@/lib/parks'
import { shopsNear } from '@/lib/shops'
import { companiesNear } from '@/lib/companies'
import { ridingNear } from '@/lib/riding'
import { eventsNear } from '@/lib/events'
import { getMe } from '@/lib/me'
import { ridersFor } from '@/lib/riders'
import { getWheel } from '@/lib/wheel-server'
import { fits, parkFits } from '@/lib/wheels'
import { haversineKm } from '@/lib/geo'

export const dynamic = 'force-dynamic'

// Companies within 80 km, or the three nearest within 400 km when there are none
function companiesFor(lat: number, lng: number, wheel: Parameters<typeof companiesNear>[3]) {
  const near = companiesNear(lat, lng, 80, wheel)
  return near.length ? { list: near, nearest: false } : { list: companiesNear(lat, lng, 400, wheel).slice(0, 3), nearest: true }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const c = cityBySlug(slug)
  if (!c) return { title: 'City not found' }
  const title = `Skateparks, pump tracks and bike parks in ${c.name}`
  const description = `Where to ride in ${c.name}, ${c.region}: skateparks, pump tracks and bike parks in 3D, who's riding them this week, crews, shops and riders.`
  return {
    title, description,
    alternates: { canonical: `/cities/${slug}` },
    openGraph: { title, description, url: `https://ritualrollers.com/cities/${slug}`, type: 'website' },
  }
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const city = cityBySlug(slug)
  if (!city) notFound()
  const { wheel } = await getWheel()
  const disciplines = wheel?.disciplines
  const me = await getMe()
  const [riding, riders] = await Promise.all([
    ridingNear(city.lat, city.lng, HUB_KM, wheel, me?.id ?? null, 10),
    ridersFor({ city: slug, disciplines }, 8),
  ])
  const nearby = CITIES.filter(c => c.slug !== slug)
    .map(c => ({ c, d: haversineKm(city.lat, city.lng, c.lat, c.lng) }))
    .filter(x => x.d < 160).sort((a, b) => a.d - b.d).slice(0, 8).map(x => ({ slug: x.c.slug, name: x.c.name }))

  return (
    <Hub
      title={`${wheel?.doing ?? 'Riding'} in ${city.name}`}
      subtitle={`${city.region}, ${COUNTRY_LABEL[city.country]}`}
      point={city}
      citySlug={slug}
      riding={riding}
      events={eventsNear(city.lat, city.lng, 80, wheel)}
      crews={crewsNear(city.lat, city.lng, HUB_KM).filter(c => fits(c.disciplines, wheel))}
      spots={spotsNear(city.lat, city.lng, HUB_KM).filter(s => fits(s.disciplines, wheel))}
      parks={parksNear(city.lat, city.lng, HUB_KM, 400).filter(p => !isFeaturedPark(p) && parkFits(p.kind, wheel)).slice(0, 150)}
      shops={shopsNear(city.lat, city.lng, HUB_KM, wheel, 60)}
      companies={companiesFor(city.lat, city.lng, wheel)}
      riders={riders}
      nearby={nearby}
      wheelLabel={wheel?.lower}
      radiusKm={HUB_KM}
    />
  )
}
