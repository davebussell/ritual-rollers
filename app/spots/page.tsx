import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import SpotsBrowser from '@/components/SpotsBrowser'
import { SPOTS } from '@/lib/spots-index'
import { PARKS } from '@/lib/parks'
import { getWheel } from '@/lib/wheel-server'
import { fits, parkFits } from '@/lib/wheels'
import { WheelNote } from '@/components/WheelPicker'

export const metadata: Metadata = {
  title: 'Skateparks, pump tracks and bike parks across North America',
  description: 'The best-known skateparks, plazas, DIYs, street spots, pump tracks, BMX tracks and bike parks in Canada, the US and Mexico, each in 3D, with photos of people riding them and who’s riding them this week.',
  alternates: { canonical: '/spots' },
}

export default async function SpotsPage() {
  const { wheel } = await getWheel()
  const spots = SPOTS.filter(s => fits(s.disciplines, wheel))
  const parks = PARKS.filter(p => parkFits(p.kind, wheel))
  const countries = { US: 0, CA: 0, MX: 0 }
  for (const s of spots) countries[s.country] += 1
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="h-display text-[34px] sm:text-[48px]">Spots</h1>
          <p className="mt-3 text-[17px] text-asphalt-2">
            {spots.length} spots worth the trip: {countries.CA} in Canada, {countries.US} in the US and {countries.MX} in Mexico, each researched
            with a source. Every city page also shows the {parks.length.toLocaleString('en-US')} parks and tracks mapped on OpenStreetMap.
          </p>
          {wheel && <div className="mt-3"><WheelNote label={wheel.lower} /></div>}
        </div>
        <Link href="/cities" className="btn btn-ghost shrink-0">Find a city</Link>
      </div>
      <div className="mt-8">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-concrete-2" />}>
          <SpotsBrowser wheelDisciplines={wheel?.disciplines} />
        </Suspense>
      </div>
    </div>
  )
}
