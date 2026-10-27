import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import SpotsBrowser from '@/components/SpotsBrowser'
import { SPOTS } from '@/lib/spots-index'
import { PARKS } from '@/lib/parks'

export const metadata: Metadata = {
  title: 'Skateparks, pump tracks and bike parks across North America',
  description: 'The best-known skateparks, plazas, DIYs, street spots, pump tracks, BMX tracks and bike parks in Canada, the US and Mexico, with the sessions and riders at each.',
  alternates: { canonical: '/spots' },
}

export default function SpotsPage() {
  const countries = { US: 0, CA: 0, MX: 0 }
  for (const s of SPOTS) countries[s.country] += 1
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="h-display text-[34px] sm:text-[48px]">Spots</h1>
          <p className="mt-3 text-[17px] text-asphalt-2">
            {SPOTS.length} spots worth the trip: {countries.CA} in Canada, {countries.US} in the US and {countries.MX} in Mexico, each researched
            with a source. Every city page also shows the {PARKS.length.toLocaleString('en-US')} parks and tracks mapped on OpenStreetMap.
          </p>
        </div>
        <Link href="/cities" className="btn btn-ghost shrink-0">Find a city</Link>
      </div>
      <div className="mt-8">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-concrete-2" />}>
          <SpotsBrowser />
        </Suspense>
      </div>
    </div>
  )
}
