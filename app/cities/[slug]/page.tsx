import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Hub from '@/components/Hub'
import { CITIES, HUB_KM, cityBySlug } from '@/lib/cities'
import { crewsNear } from '@/lib/crews'
import { spotsNear, isFeaturedPark, COUNTRY_LABEL } from '@/lib/spots-index'
import { parksNear } from '@/lib/parks'
import { upcomingSessions } from '@/lib/sessions'
import { ridersFor } from '@/lib/riders'
import { getWheel } from '@/lib/wheel-server'
import { fits, parkFits } from '@/lib/wheels'
import { haversineKm } from '@/lib/geo'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const c = cityBySlug(slug)
  if (!c) return { title: 'City not found' }
  const title = `Skate, roller and BMX in ${c.name}: spots, sessions and crews`
  const description = `Where to ride in ${c.name}, ${c.region}: skateparks, pump tracks and bike parks, sessions coming up, and the crews and riders who ride them.`
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
  const [sessions, riders] = await Promise.all([
    upcomingSessions({ near: { lat: city.lat, lng: city.lng, km: HUB_KM }, disciplines, limit: 10 }),
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
      sessions={sessions}
      crews={crewsNear(city.lat, city.lng, HUB_KM).filter(c => fits(c.disciplines, wheel))}
      spots={spotsNear(city.lat, city.lng, HUB_KM).filter(s => fits(s.disciplines, wheel))}
      parks={parksNear(city.lat, city.lng, HUB_KM, 400).filter(p => !isFeaturedPark(p) && parkFits(p.kind, wheel)).slice(0, 150)}
      riders={riders}
      nearby={nearby}
      wheelLabel={wheel?.lower}
      radiusKm={HUB_KM}
    />
  )
}
