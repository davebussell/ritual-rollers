import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import RideGame from '@/components/ride/RideGame'
import { parkById, parkName, PARK_KIND_META, surfaceOfPark } from '@/lib/parks'
import { rideable, linesFor } from '@/lib/lines'
import { spotByOsm } from '@/lib/spots-index'
import { nearestCity } from '@/lib/cities'
import { getWheel } from '@/lib/wheel-server'

export const dynamic = 'force-dynamic'

const SITE = 'https://ritualrollers.com'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const park = parkById(id)
  if (!park || !rideable(id)) return { title: 'Not found' }
  const name = parkName(park)
  const hub = nearestCity(park.lat, park.lng)
  const where = park.city ?? hub?.name
  const title = `Ride ${name}${where ? `, ${where}` : ''} in 3D`
  const kind = PARK_KIND_META[park.kind].label.toLowerCase()
  const description = `Ride the real lines of this ${kind} in first person, on the real ground: pick a ${park.kind === 'bike' ? 'trail' : 'line'}, pedal, pump and chase your best time.`
  return {
    title, description,
    alternates: { canonical: `/ride/${id}` },
    robots: park.name ? undefined : { index: false, follow: true },
    openGraph: { title, description, url: `${SITE}/ride/${id}`, type: 'website' },
  }
}

export default async function RidePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ line?: string }> }) {
  const { id } = await params
  const { line } = await searchParams
  const park = parkById(id)
  if (!park || !rideable(id)) notFound()
  const { wheel } = await getWheel()
  const spot = spotByOsm(id)
  const backHref = spot ? `/spots/${spot.slug}` : `/parks/${id}`
  const name = spot?.name ?? parkName(park)
  const entry = linesFor(id)

  return (
    <div className="bg-asphalt">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-flyer sm:px-6">
        <p className="min-w-0 text-[14px]">
          <Link href={backHref} className="font-semibold text-curb hover:underline">← {name}</Link>
          <span className="ml-2 text-flyer/70">{PARK_KIND_META[park.kind].label}{entry?.n && entry.n > 1 ? ` · ${entry.n} ${park.kind === 'bike' ? 'trails' : 'lines'}` : ''}</span>
        </p>
        <h1 className="sr-only">Ride {name} in 3D</h1>
        <p className="text-[13px] text-flyer/70">Best on a computer. Works on phones too.</p>
      </div>
      <div className="bg-flyer pb-10">
        <RideGame
          parkId={id} parkName={name} parkKind={park.kind} parkSurface={surfaceOfPark(park)}
          wheel={wheel?.id ?? null} backHref={backHref} startLine={line}
        />
      </div>
    </div>
  )
}
