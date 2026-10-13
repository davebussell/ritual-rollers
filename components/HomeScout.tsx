import Link from 'next/link'
import { ChevronUp, Plus, Compass, Wrench, Users, Map } from 'lucide-react'
import ScoutSearch from '@/components/ScoutSearch'
import { WaveAnim, WindAnim } from '@/components/ConditionAnimations'
import { FEATURED_SPOTS, type FeaturedSpot } from '@/lib/featured-spots'
import { countryFlag, type SportVerdict } from '@/lib/sports'

export interface StripItem {
  spot: FeaturedSpot
  top: SportVerdict | null
  tempC: number | null
  sstC: number | null
  windKph: number | null
  waveM: number | null
  periodS: number | null
  coastal: boolean
}

export interface Teaser {
  id: string
  title: string
  username: string
  upvotes: number
  cover: string
  sample: boolean
}

interface Props {
  strip: StripItem[]
  teasers: Teaser[]
}

export default function HomeScout({ strip, teasers }: Props) {
  const firing = strip.filter(s => s.top?.status === 'firing').length

  return (
    <div className="min-h-[calc(100vh-57px)] bg-zinc-950 tx-canvas">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-14 sm:px-8">

        {/* Hero */}
        <div className="text-center">
          <p className="tag inline-flex items-center gap-2 px-3 py-1 text-[11px] tracking-[0.18em]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Every adventure needs a crew
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-6xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-8xl">
            What&apos;s rideable <span className="text-orange-500">where you&apos;re headed?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl font-body text-lg text-zinc-500">
            Every established wind, water, mountain and river spot in North America — matched to what you ride,
            when you&apos;re going and who you&apos;re going with.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/finder"
              className="tx-stitch relative flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-7 py-3.5 font-display text-xl font-bold uppercase tracking-wide text-white transition-all hover:bg-orange-400 active:scale-95 sm:w-auto">
              <Compass className="h-5 w-5" strokeWidth={2.5} /> Find a ride
            </Link>
            <Link href="/crew"
              className="tx-stitch relative flex w-full items-center justify-center gap-2 rounded-md bg-forest px-7 py-3.5 font-display text-xl font-bold uppercase tracking-wide text-white transition-all hover:brightness-110 active:scale-95 sm:w-auto">
              <Users className="h-5 w-5" strokeWidth={2.5} /> Find your crew
            </Link>
          </div>
          <div className="mx-auto mt-6 max-w-xl">
            <p className="mb-2 font-expedition text-[11px] uppercase tracking-[0.18em] text-zinc-500">or scout any place in North America</p>
            <ScoutSearch size="compact" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <Link href="/spots" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-body font-medium text-zinc-500 transition-colors hover:text-white">
              <Map className="h-3.5 w-3.5" /> Browse the index
            </Link>
            <Link href="/trips/new" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-body font-medium text-zinc-500 transition-colors hover:text-white">
              <Plus className="h-3.5 w-3.5" /> Log a ride
            </Link>
          </div>
        </div>

        {/* Firing now */}
        <section className="mt-16">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Right now across North America</p>
              <h2 className="mt-1 font-display text-3xl font-bold uppercase tracking-[0.02em] text-white">
                {firing > 0 ? `${firing} of ${strip.length} iconic spots are firing` : 'Live reads from iconic spots'}
              </h2>
            </div>
            <Link href="/scout" className="font-expedition text-xs uppercase tracking-[0.18em] text-teal-700 hover:underline">Scout anywhere →</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {strip.map(({ spot, top, tempC, sstC, windKph, waveM, periodS, coastal }) => (
              <Link key={spot.slug} href={`/scout/${spot.slug}`}
                className={`tx-stitch group relative overflow-hidden rounded-xl border bg-zinc-900 transition-all hover:border-zinc-700 ${
                  top?.status === 'firing' ? 'border-orange-500' : 'border-zinc-800'
                }`}>
                <div className="h-9 text-blue-500">
                  {coastal
                    ? <WaveAnim heightM={waveM} periodS={periodS} coastal />
                    : <div className="text-cyan-500"><WindAnim kph={windKph ?? 0} /></div>}
                </div>
                <div className="p-4 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-2xl font-bold uppercase tracking-[0.02em] text-white">{countryFlag(spot.countryCode)} {spot.name}</p>
                  {top?.status === 'firing' && (
                    <span className="rounded-md bg-orange-500 px-2 py-0.5 font-expedition text-[10px] uppercase tracking-[0.18em] text-white">FIRING</span>
                  )}
                  {top?.status === 'rideable' && (
                    <span className="rounded-md bg-emerald-500/30 px-2 py-0.5 font-expedition text-[10px] uppercase tracking-[0.18em] text-[#2E4631]">RIDEABLE</span>
                  )}
                </div>
                <p className="font-expedition text-[10px] uppercase tracking-[0.18em] text-zinc-600">{spot.tagline}</p>
                {top ? (
                  <p className="mt-3 font-body text-sm text-zinc-300"><span className="mr-1">{top.sport.emoji}</span>{top.sport.label} — {top.line}</p>
                ) : (
                  <p className="mt-3 font-body text-sm text-zinc-500">{tempC != null ? `quiet · ${Math.round(tempC)} °C` : 'no read right now'}</p>
                )}
                {sstC != null && <p className="mt-1 font-body text-xs text-zinc-500">sea {sstC.toFixed(1)} °C</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <div className="rule-plaid mt-16" />
        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="tx-stitch relative rounded-xl border border-orange-500 bg-zinc-900 p-5">
            <Compass className="h-5 w-5 text-orange-600" />
            <h3 className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.02em] text-white">Scout</h3>
            <p className="mt-1 font-body text-sm text-zinc-500">Live wind, waves, snow and sun for any place. Sixteen sports, each with its own read, the best windows this week, and what to pack.</p>
            <p className="tag mt-4 inline-block px-2 py-0.5 text-[10px] tracking-[0.18em]">Live now</p>
          </div>
          <div className="tx-stitch relative rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <Wrench className="h-5 w-5 text-zinc-500" />
            <h3 className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.02em] text-white">Gear</h3>
            <p className="mt-1 font-body text-sm text-zinc-500">Where to rent, buy or learn near the spot — seeded from map data, confirmed by riders who&apos;ve been.</p>
            <p className="tag mt-4 inline-block px-2 py-0.5 text-[10px] tracking-[0.18em]">Rolling out next</p>
          </div>
          <div className="tx-stitch relative rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <Users className="h-5 w-5 text-zinc-500" />
            <h3 className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.02em] text-white">Crew</h3>
            <p className="mt-1 font-body text-sm text-zinc-500">Who&apos;s ridden here, who&apos;s going, and roll calls so you never ride a new spot alone.</p>
            <p className="tag mt-4 inline-block px-2 py-0.5 text-[10px] tracking-[0.18em]">After that</p>
          </div>
        </section>

        {/* Stories */}
        {teasers.length > 0 && (
          <>
            <div className="rule-plaid mt-16" />
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Fresh from the crews</p>
                <Link href="/explore" className="font-expedition text-xs uppercase tracking-[0.18em] text-teal-700 hover:underline">All stories →</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {teasers.map(t => (
                  <Link key={t.id} href={`/trips/${t.id}`}
                    className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700">
                    <div className="relative aspect-video overflow-hidden">
                      <img src={t.cover} alt={t.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      {t.sample && (
                        <span className="tag absolute left-2 top-2 px-2 py-0.5 text-[10px] tracking-[0.18em]">Sample</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-bold uppercase tracking-[0.02em] text-white">{t.title}</p>
                        <p className="font-body text-[11px] text-zinc-500">@{t.username}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-0.5 font-body text-[11px] text-zinc-500"><ChevronUp className="h-3 w-3" />{t.upvotes}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <p className="mt-8 text-center font-display text-2xl font-bold uppercase tracking-[0.02em] text-white sm:text-3xl">
                Roll out. Share the story.{' '}
                <Link href="/trips/new" className="text-orange-500 hover:underline">Log yours →</Link>
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
