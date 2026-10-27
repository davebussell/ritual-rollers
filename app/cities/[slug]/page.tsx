import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Hub from '@/components/Hub'
import { CITIES, HUB_KM, cityBySlug } from '@/lib/cities'
import { crewsNear } from '@/lib/crews'
import { spotsNear, isFeaturedPark, COUNTRY_LABEL } from '@/lib/spots-index'
import { parksNear } from '@/lib/parks'
import { upcomingSessions } from '@/lib/sessions'
import { ridersFor } from '@/lib/riders'
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
  const [sessions, riders] = await Promise.all([
    upcomingSessions({ near: { lat: city.lat, lng: city.lng, km: HUB_KM }, limit: 10 }),
    ridersFor({ city: slug }, 8),
  ])
  const nearby = CITIES.filter(c => c.slug !== slug)
    .map(c => ({ c, d: haversineKm(city.lat, city.lng, c.lat, c.lng) }))
    .filter(x => x.d < 160).sort((a, b) => a.d - b.d).slice(0, 8).map(x => ({ slug: x.c.slug, name: x.c.name }))

  return (
    <Hub
      title={`Riding in ${city.name}`}
      subtitle={`${city.region}, ${COUNTRY_LABEL[city.country]}`}
      point={city}
      citySlug={slug}
      sessions={sessions}
      crews={crewsNear(city.lat, city.lng, HUB_KM)}
      spots={spotsNear(city.lat, city.lng, HUB_KM)}
      parks={parksNear(city.lat, city.lng, HUB_KM, 150).filter(p => !isFeaturedPark(p))}
      riders={riders}
      nearby={nearby}
      radiusKm={HUB_KM}
    />
  )
}
