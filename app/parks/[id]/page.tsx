import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import RideReport from '@/components/RideReport'
import { parkById, parksNear, parkName, parkTraits, PARK_KIND_META } from '@/lib/parks'
import { spotsNear, COUNTRY_LABEL } from '@/lib/spots-index'
import { fetchSkateForecast } from '@/lib/forecast'
import { fetchStoriesNear } from '@/lib/stories-near'
import { nowRead, describe } from '@/lib/report'

export const dynamic = 'force-dynamic'

const SITE = 'https://ritualrollers.com'

function where(p: { city?: string; region?: string; cc: 'CA' | 'US' | 'MX' }): string {
  return [p.city, p.region, COUNTRY_LABEL[p.cc]].filter(Boolean).join(', ')
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const park = parkById(id)
  if (!park) return { title: 'Spot not found — Ritual Rollers' }
  const name = parkName(park)
  const forecast = await fetchSkateForecast(park.lat, park.lng)
  const description = describe(nowRead(forecast, parkTraits(park)), `${PARK_KIND_META[park.kind].label} conditions, the week's dry windows and what's nearby.`)
  const title = `${name}${park.city ? `, ${park.city}` : ''} — is it dry? · Ritual Rollers`
  return {
    title,
    description,
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
  const name = parkName(park)
  const point = { lat: park.lat, lng: park.lng, label: name, countryCode: park.cc }
  const [forecast, stories] = await Promise.all([fetchSkateForecast(park.lat, park.lng), fetchStoriesNear(point)])
  const nearbyParks = parksNear(park.lat, park.lng, 25, 60).filter(p => p.id !== park.id)
  const nearbyFeatured = spotsNear(park.lat, park.lng, 60)
  const place = where(park)

  return (
    <RideReport
      mode="park"
      title={name}
      subtitle={`${PARK_KIND_META[park.kind].label}${park.indoor ? ' · indoor' : ''}${place ? ` · ${place}` : ''}`}
      kicker="Ride report"
      countryCode={park.cc}
      shareUrl={`${SITE}/parks/${id}`}
      point={point}
      forecast={forecast}
      traits={parkTraits(park)}
      park={park}
      nearbyFeatured={nearbyFeatured}
      nearbyParks={nearbyParks}
      stories={stories}
    />
  )
}
