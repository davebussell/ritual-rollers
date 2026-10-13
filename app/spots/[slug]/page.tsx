import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SpotReport from '@/components/SpotReport'
import { spotBySlug } from '@/lib/spots-index'
import { fetchSpotForecast } from '@/lib/forecast'
import { fetchStoriesNear } from '@/lib/stories-near'
import { allVerdicts, SPORT_BY_ID, type Status } from '@/lib/sports'
import type { GeoPoint } from '@/lib/local-sports'

export const dynamic = 'force-dynamic'

const STATUS_RANK: Record<Status, number> = { firing: 2, rideable: 1, quiet: 0 }

function pointOf(slug: string): { spot: NonNullable<ReturnType<typeof spotBySlug>>; point: GeoPoint } | null {
  const spot = spotBySlug(slug)
  if (!spot) return null
  return { spot, point: { lat: spot.lat, lng: spot.lng, label: `${spot.name}, ${spot.region}`, countryCode: spot.country } }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const hit = pointOf(slug)
  if (!hit) return { title: 'Spot not found — Ritual Rollers' }
  const { spot, point } = hit
  const sports = spot.sports.map(id => SPORT_BY_ID[id]?.label).filter(Boolean).join(', ')
  let description = `${spot.why} Established for ${sports}. Live conditions, best windows this week and what to pack.`
  try {
    const forecast = await fetchSpotForecast(point.lat, point.lng)
    if (forecast) {
      const top = [...allVerdicts(forecast.current)]
        .filter(v => spot.sports.includes(v.sport.id))
        .sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || b.score - a.score)[0]
      if (top && top.status !== 'quiet') description = `${top.sport.label} ${top.status.toUpperCase()} · ${top.line}. ${spot.why}`.slice(0, 157) + '…'
    }
  } catch {}
  const title = `${spot.name}, ${spot.region} — ${sports} · Ritual Rollers`
  return {
    title,
    description,
    alternates: { canonical: `/spots/${slug}` },
    openGraph: { title, description, url: `https://ritualrollers.com/spots/${slug}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function IndexedSpotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hit = pointOf(slug)
  if (!hit) notFound()
  const { spot, point } = hit
  const [forecast, stories] = await Promise.all([fetchSpotForecast(point.lat, point.lng), fetchStoriesNear(point)])
  return <SpotReport slug={slug} point={point} forecast={forecast} stories={stories} index={spot} basePath="/spots" />
}
