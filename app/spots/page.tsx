import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import SpotsBrowser from '@/components/SpotsBrowser'
import { SPOTS } from '@/lib/spots-index'
import { parkCounts } from '@/lib/parks'
import { KIND_GROUPS } from '@/lib/sports'

export const metadata: Metadata = {
  title: 'Skateparks, pump tracks & bike parks across North America — Ritual Rollers',
  description: 'The best-known skateparks, plazas, DIYs, street spots, pump tracks, BMX tracks and bike parks in Canada, the US and Mexico — each with a live read of whether the ground is dry.',
  alternates: { canonical: '/spots' },
}

export default function SpotsPage() {
  const countries = { US: 0, CA: 0, MX: 0 }
  for (const s of SPOTS) countries[s.country] += 1
  const skate = SPOTS.filter(s => KIND_GROUPS[0].kinds.includes(s.kind)).length
  const bike = SPOTS.length - skate
  const mapped = parkCounts()
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="tag inline-block px-3 py-1 text-[11px] tracking-[0.18em]">The spots</p>
          <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-white">Spots worth the trip</h1>
          <p className="mt-2 max-w-2xl font-body text-zinc-500">
            {SPOTS.length} featured spots — {skate} to skate, {bike} to ride — across 🇨🇦 {countries.CA} · 🇺🇸 {countries.US} · 🇲🇽 {countries.MX}.
            Each one researched, with a source. Plus {mapped.total.toLocaleString('en-US')} more mapped parks and tracks that show up around any town you check.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/finder" className="tx-stitch relative inline-flex items-center rounded-md bg-orange-500 px-4 py-2 font-display text-lg font-bold uppercase tracking-wide text-white transition-all hover:bg-orange-400 active:scale-95">
            Find your spot
          </Link>
          <Link href="/scout" className="inline-flex items-center rounded-md border border-zinc-700 px-4 py-2 font-display text-lg font-bold uppercase tracking-wide text-zinc-400 transition-all hover:text-white">
            Check a town
          </Link>
        </div>
      </div>
      <div className="rule-plaid mb-6" aria-hidden />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-zinc-900" />}>
        <SpotsBrowser />
      </Suspense>
    </div>
  )
}
