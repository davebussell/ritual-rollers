import type { Metadata } from 'next'
import Link from 'next/link'
import ScoutSearch from '@/components/ScoutSearch'
import { toSlug } from '@/lib/geo'
import { countryFlag } from '@/lib/format'
import { KIND_META, KINDS } from '@/lib/sports'

export const metadata: Metadata = {
  title: 'Is it dry? Check any town — Ritual Rollers',
  description: 'Type a town, zip or postal code in Canada, the US or Mexico: is the concrete dry, is the dirt rideable, when the next dry window is, and every skatepark, pump track and bike park nearby.',
  alternates: { canonical: '/scout' },
}

const CITIES: [string, string][] = [
  ['Portland, Oregon', 'US'], ['Vancouver, BC', 'CA'], ['Montreal, Quebec', 'CA'], ['Los Angeles', 'US'],
  ['Mexico City', 'MX'], ['Denver', 'US'], ['Toronto', 'CA'], ['Austin, Texas', 'US'], ['Guadalajara', 'MX'], ['Seattle', 'US'],
]

export default function ScoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8">
      <div className="text-center">
        <p className="tag inline-block px-3 py-1 text-[11px] tracking-[0.18em]">Check a place</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-5xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-7xl">
          Is it dry where you are?
        </h1>
        <p className="mx-auto mt-5 max-w-xl font-body text-lg text-zinc-500">
          A town, a zip or a postal code. You get the ground right now — concrete and dirt — when the next dry window is,
          and every skatepark, pump track, BMX track and bike park around it.
        </p>
        <div className="mt-8">
          <ScoutSearch size="hero" autoFocus />
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {CITIES.map(([name, cc]) => (
            <Link key={name} href={`/scout/${toSlug(name)}`}
              className="tag px-3 py-1 text-[11px] tracking-[0.14em] transition-colors hover:border-zinc-700 hover:bg-zinc-800">
              {countryFlag(cc)} {name}
            </Link>
          ))}
        </div>
      </div>

      <div className="rule-plaid mt-16" />
      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {KINDS.map(k => (
          <div key={k} className="tx-stitch relative rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="font-display text-2xl font-bold uppercase tracking-[0.02em]" style={{ color: KIND_META[k].color }}>{KIND_META[k].plural}</p>
            <p className="mt-1 font-body text-xs text-zinc-500">{KIND_META[k].blurb}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center font-expedition text-[11px] uppercase tracking-[0.18em] text-zinc-600">
        anything on wheels · skateboards, roller and inline skates, scooters, BMX and mountain bikes
      </p>
    </div>
  )
}
