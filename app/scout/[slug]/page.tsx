import type { Metadata } from 'next'
import ScoutSearch from '@/components/ScoutSearch'
import RideReport from '@/components/RideReport'
import { fromSlug, geocodePlace, type GeoPoint } from '@/lib/geo'
import { fetchSkateForecast } from '@/lib/forecast'
import { fetchStoriesNear } from '@/lib/stories-near'
import { isNorthAmerica, spotsNear, isFeaturedPark } from '@/lib/spots-index'
import { parksNear } from '@/lib/parks'
import { nowRead, describe } from '@/lib/report'

export const dynamic = 'force-dynamic'

const SITE = 'https://ritualrollers.com'

async function resolvePlace(slug: string): Promise<GeoPoint | null> {
  return geocodePlace(fromSlug(slug))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const point = await resolvePlace(slug)
  if (!point) return { title: 'Place not found — Ritual Rollers' }
  const forecast = await fetchSkateForecast(point.lat, point.lng)
  const description = describe(nowRead(forecast, { surface: 'hard' }), `Is it dry enough to skate or ride in ${point.label}? The week's dry windows and every park nearby.`)
  const title = `${point.label} — is it dry? Skate & bike conditions · Ritual Rollers`
  return {
    title,
    description,
    alternates: { canonical: `/scout/${slug}` },
    openGraph: { title, description, url: `${SITE}/scout/${slug}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function ScoutPlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const point = await resolvePlace(slug)

  if (!point) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="tag inline-block px-3 py-1 text-[11px] tracking-[0.18em]">Ride report</p>
        <h1 className="mt-4 font-display text-4xl font-bold uppercase tracking-[0.02em] text-white">Can&apos;t place &ldquo;{fromSlug(slug)}&rdquo;</h1>
        <p className="mt-3 font-body text-zinc-500">Try the town with its state or province, a US zip, or a Canadian postal code.</p>
        <div className="mt-6 flex justify-center"><ScoutSearch size="hero" initial={fromSlug(slug)} autoFocus /></div>
      </div>
    )
  }

  if (!isNorthAmerica(point.countryCode)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="tag inline-block px-3 py-1 text-[11px] tracking-[0.18em]">Ride report</p>
        <h1 className="mt-4 font-display text-4xl font-bold uppercase tracking-[0.02em] text-white">{point.label} is off the map for now</h1>
        <p className="mt-3 font-body text-zinc-500">
          Ritual Rollers covers Canada, the United States and Mexico to start. Other countries follow.
        </p>
        <div className="mt-6 flex justify-center"><ScoutSearch size="hero" autoFocus /></div>
      </div>
    )
  }

  const [forecast, stories] = await Promise.all([fetchSkateForecast(point.lat, point.lng), fetchStoriesNear(point)])

  return (
    <RideReport
      mode="place"
      title={point.label}
      subtitle="Skate, scooter and bike conditions for the area, and every spot around it"
      kicker="Ride report"
      countryCode={point.countryCode ?? null}
      shareUrl={`${SITE}/scout/${slug}`}
      point={{ lat: point.lat, lng: point.lng }}
      forecast={forecast}
      traits={{ surface: 'hard', lit: null }}
      nearbyFeatured={spotsNear(point.lat, point.lng, 60)}
      nearbyParks={parksNear(point.lat, point.lng, 25, 80).filter(p => !isFeaturedPark(p))}
      stories={stories}
    />
  )
}
