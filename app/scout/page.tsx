import type { Metadata } from 'next'
import Link from 'next/link'
import ScoutSearch from '@/components/ScoutSearch'
import { FEATURED_SPOTS } from '@/lib/featured-spots'
import { SPORTS, FAMILY_META, FAMILY_ORDER, countryFlag } from '@/lib/sports'

export const metadata: Metadata = {
  title: 'Scout a spot — Ritual Rollers',
  description: 'Type any place on Earth and get a spot report: live wind, waves, snow and sun, what\'s rideable now, the best windows this week, and what to pack.',
  alternates: { canonical: '/scout' },
}

export default function ScoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8">
      <div className="text-center">
        <p className="tag inline-block px-3 py-1 text-[11px] tracking-[0.18em]">Scout</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-5xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-7xl">
          Where are you headed?
        </h1>
        <p className="mx-auto mt-5 max-w-xl font-body text-lg text-zinc-500">
          A town, a break, a zip or a postal code. You get live conditions, what&apos;s rideable, the best windows this week, and what to pack.
        </p>
        <div className="mt-8">
          <ScoutSearch size="hero" autoFocus />
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {FEATURED_SPOTS.map(s => (
            <Link key={s.slug} href={`/scout/${s.slug}`}
              className="tag px-3 py-1 text-[11px] tracking-[0.14em] transition-colors hover:border-zinc-700 hover:bg-zinc-800">
              {countryFlag(s.countryCode)} {s.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="rule-plaid mt-16" />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FAMILY_ORDER.map(fam => {
          const meta = FAMILY_META[fam]
          return (
            <div key={fam} className="tx-stitch relative rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="font-display text-2xl font-bold uppercase tracking-[0.02em]" style={{ color: meta.color }}>{meta.label}</p>
              <ul className="mt-2 space-y-1">
                {SPORTS.filter(s => s.family === fam).map(s => (
                  <li key={s.id} className="font-body text-xs text-zinc-500"><span className="mr-1.5">{s.emoji}</span>{s.label}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-center font-expedition text-[11px] uppercase tracking-[0.18em] text-zinc-600">
        sixteen sports · each with its own read of the forecast
      </p>
    </div>
  )
}
