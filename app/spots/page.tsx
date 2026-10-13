import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import SpotsBrowser from '@/components/SpotsBrowser'
import { SPOTS } from '@/lib/spots-index'

export const metadata: Metadata = {
  title: 'The spot index — Ritual Rollers',
  description: 'Every established wind, water, mountain and river spot in North America, filterable by sport, region, month and level, on a list or a map.',
  alternates: { canonical: '/spots' },
}

export default function SpotsPage() {
  const countries = { US: 0, CA: 0, MX: 0 }
  for (const s of SPOTS) countries[s.country] += 1
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="tag inline-block px-3 py-1 text-[11px] tracking-[0.18em]">The index</p>
          <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-white">Every established spot</h1>
          <p className="mt-2 font-body text-zinc-500">
            {SPOTS.length} in North America — 🇺🇸 {countries.US} · 🇨🇦 {countries.CA} · 🇲🇽 {countries.MX}. Listed per sport only where the sport is genuinely established.
          </p>
        </div>
        <Link href="/finder" className="tx-stitch relative inline-flex items-center rounded-md bg-orange-500 px-4 py-2 font-display text-lg font-bold uppercase tracking-wide text-white transition-all hover:bg-orange-400 active:scale-95">
          Find your spot
        </Link>
      </div>
      <div className="rule-plaid mb-6" aria-hidden />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-zinc-900" />}>
        <SpotsBrowser />
      </Suspense>
    </div>
  )
}
