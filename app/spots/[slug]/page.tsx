import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import legacy from '@/data/legacy-spot-slugs.json'
import RideReport from '@/components/RideReport'
import { spotBySlug, spotsNear, traitsOf, COUNTRY_LABEL, isFeaturedPark } from '@/lib/spots-index'
import { parksNear } from '@/lib/parks'
import { fetchSkateForecast } from '@/lib/forecast'
import { fetchStoriesNear } from '@/lib/stories-near'
import { nowRead, describe } from '@/lib/report'
import { KIND_META } from '@/lib/sports'

export const dynamic = 'force-dynamic'

const SITE = 'https://ritualrollers.com'

// The outdoor-sports index (kite, surf, ski…) that lived here until the wheels-only relaunch
const LEGACY = new Set(legacy as string[])

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const spot = spotBySlug(slug)
  if (!spot) return { title: 'Spot not found — Ritual Rollers' }
  const forecast = await fetchSkateForecast(spot.lat, spot.lng)
  const description = describe(nowRead(forecast, traitsOf(spot)), spot.why)
  const title = `${spot.name}, ${spot.city} — is it dry? · Ritual Rollers`
  return {
    title,
    description,
    alternates: { canonical: `/spots/${slug}` },
    openGraph: { title, description, url: `${SITE}/spots/${slug}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SpotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const spot = spotBySlug(slug)
  if (!spot) {
    if (LEGACY.has(slug)) permanentRedirect('/spots')
    notFound()
  }
  const point = { lat: spot.lat, lng: spot.lng, label: `${spot.name}, ${spot.city}`, countryCode: spot.country }
  const [forecast, stories] = await Promise.all([fetchSkateForecast(spot.lat, spot.lng), fetchStoriesNear(point)])
  const nearbyParks = parksNear(spot.lat, spot.lng, 25, 60).filter(p => p.id !== spot.osm && !isFeaturedPark(p) && p.distanceKm > 0.05)
  const nearbyFeatured = spotsNear(spot.lat, spot.lng, 60, spot.slug)

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
      <RideReport
        mode="spot"
        title={spot.name}
        subtitle={`${KIND_META[spot.kind].label}${spot.indoor ? ' · indoor' : ''} · ${spot.city}, ${spot.region}, ${COUNTRY_LABEL[spot.country]}`}
        kicker="Ride report"
        countryCode={spot.country}
        shareUrl={`${SITE}/spots/${slug}`}
        point={point}
        forecast={forecast}
        traits={traitsOf(spot)}
        index={spot}
        nearbyFeatured={nearbyFeatured}
        nearbyParks={nearbyParks}
        stories={stories}
      />
    </>
  )
}
