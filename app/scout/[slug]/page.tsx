import type { Metadata } from 'next'
import ScoutSearch from '@/components/ScoutSearch'
import SpotReport from '@/components/SpotReport'
import { featuredBySlug } from '@/lib/featured-spots'
import { fromSlug, geocodePlace, type GeoPoint } from '@/lib/local-sports'
import { fetchSpotForecast } from '@/lib/forecast'
import { fetchStoriesNear } from '@/lib/stories-near'
import { allVerdicts, type Status } from '@/lib/sports'
import { isNorthAmerica } from '@/lib/spots-index'

export const dynamic = 'force-dynamic'

const STATUS_RANK: Record<Status, number> = { firing: 2, rideable: 1, quiet: 0 }

async function resolvePlace(slug: string): Promise<GeoPoint | null> {
  const featured = featuredBySlug(slug)
  if (featured) {
    return { lat: featured.lat, lng: featured.lng, label: `${featured.name}, ${featured.region}`, countryCode: featured.countryCode }
  }
  return geocodePlace(fromSlug(slug))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const point = await resolvePlace(slug)
  if (!point) return { title: 'Spot not found — Ritual Rollers' }
  const forecast = await fetchSpotForecast(point.lat, point.lng)
  let description = `Live conditions, what's rideable, best windows this week and what to pack for ${point.label}.`
  if (forecast) {
    const top = [...allVerdicts(forecast.current)]
      .sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || b.score - a.score)
      .filter(v => v.status !== 'quiet')
      .slice(0, 2)
    const bits = top.map(v => `${v.sport.label} ${v.status.toUpperCase()} · ${v.line}`)
    const sea = forecast.current.sstC != null ? ` Sea ${forecast.current.sstC.toFixed(1)} °C.` : ''
    if (bits.length) {
      const full = `${bits.join(' / ')}.${sea} Full 7-day spot report on Ritual Rollers.`
      description = full.length <= 160 ? full : full.slice(0, 157).replace(/\s+\S*$/, '') + '…'
    }
  }
  const title = `${point.label} — Spot Report · Ritual Rollers`
  return {
    title,
    description,
    alternates: { canonical: `/scout/${slug}` },
    openGraph: { title, description, url: `https://ritualrollers.com/scout/${slug}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SpotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const point = await resolvePlace(slug)

  if (!point) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="tag inline-block px-3 py-1 text-[11px] tracking-[0.18em]">Spot report</p>
        <h1 className="mt-4 font-display text-4xl font-bold uppercase tracking-[0.02em] text-white">Can&apos;t place &ldquo;{fromSlug(slug)}&rdquo;</h1>
        <p className="mt-3 font-body text-zinc-500">Try the town name with its state or province, a US zip, or a Canadian postal code.</p>
        <div className="mt-6 flex justify-center"><ScoutSearch size="hero" initial={fromSlug(slug)} autoFocus /></div>
      </div>
    )
  }

  // North America only for now — the index is curated continent by continent
  if (!isNorthAmerica(point.countryCode)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="tag inline-block px-3 py-1 text-[11px] tracking-[0.18em]">Spot report</p>
        <h1 className="mt-4 font-display text-4xl font-bold uppercase tracking-[0.02em] text-white">{point.label} is off the map for now</h1>
        <p className="mt-3 font-body text-zinc-500">
          We&apos;re scouting North America first — the US, Canada and Mexico — and adding spots only where a sport is truly established. Other continents follow.
        </p>
        <div className="mt-6 flex justify-center"><ScoutSearch size="hero" autoFocus /></div>
      </div>
    )
  }

  const [forecast, stories] = await Promise.all([
    fetchSpotForecast(point.lat, point.lng),
    fetchStoriesNear(point),
  ])

  return <SpotReport slug={slug} point={point} forecast={forecast} stories={stories} />
}
