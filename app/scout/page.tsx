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
        <p className="font-expedition text-[10px] uppercase tracking-[0.35em] text-orange-500">Scout</p>
        <h1 className="mx-auto mt-3 max-w-2xl font-display text-4xl font-black leading-tight text-white sm:text-5xl">
          Where are you headed?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-zinc-400">
          A town, a break, a zip or a postal code. You get live conditions, what&apos;s rideable, the best windows this week, and what to pack.
        </p>
        <div className="mt-8">
          <ScoutSearch size="hero" autoFocus />
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {FEATURED_SPOTS.map(s => (
            <Link key={s.slug} href={`/scout/${s.slug}`}
              className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs text-zinc-400 transition-all hover:border-zinc-600 hover:text-white">
              {countryFlag(s.countryCode)} {s.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FAMILY_ORDER.map(fam => {
          const meta = FAMILY_META[fam]
          return (
            <div key={fam} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="font-display font-bold" style={{ color: meta.color }}>{meta.label}</p>
              <ul className="mt-2 space-y-1">
                {SPORTS.filter(s => s.family === fam).map(s => (
                  <li key={s.id} className="text-xs text-zinc-400"><span className="mr-1.5">{s.emoji}</span>{s.label}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-center font-expedition text-[9px] uppercase tracking-widest text-zinc-600">
        sixteen sports · each with its own read of the forecast
      </p>
    </div>
  )
}
