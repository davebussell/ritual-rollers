import type { Metadata } from 'next'
import { Suspense } from 'react'
import SpotFinder from '@/components/SpotFinder'
import { SPOTS } from '@/lib/spots-index'
import { SPORTS } from '@/lib/sports'

export const metadata: Metadata = {
  title: 'Find your spot — Ritual Rollers',
  description: 'Four quick questions — what you ride, when, where you\'re starting from, your level — matched against every established spot in North America.',
  alternates: { canonical: '/finder' },
}

export default function FinderPage() {
  const sportCount = SPORTS.filter(s => SPOTS.some(x => x.sports.includes(s.id))).length
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      <div className="mb-8 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {SPOTS.length} established spots · {sportCount} sports · North America
        </p>
        <h1 className="mt-4 font-display text-5xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-6xl">
          Where should <span className="text-orange-500">the crew</span> roll next?
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-body text-lg text-zinc-500">
          Four quick questions, matched against spots that are genuinely established for your sport — nothing padded.
        </p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-900" />}>
        <SpotFinder />
      </Suspense>
    </div>
  )
}
