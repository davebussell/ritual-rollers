import Link from 'next/link'
import { ChevronUp, Plus, Compass, Wrench, Users } from 'lucide-react'
import ScoutSearch from '@/components/ScoutSearch'
import { FEATURED_SPOTS, type FeaturedSpot } from '@/lib/featured-spots'
import { countryFlag, type SportVerdict } from '@/lib/sports'

export interface StripItem {
  spot: FeaturedSpot
  top: SportVerdict | null
  tempC: number | null
  sstC: number | null
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
    <div className="min-h-[calc(100vh-57px)] bg-zinc-950">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-14 sm:px-8">

        {/* Hero */}
        <div className="text-center">
          <p className="font-expedition text-[10px] uppercase tracking-[0.35em] text-orange-400">Roll with your buddies</p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-black leading-tight text-white sm:text-6xl">
            What&apos;s rideable where you&apos;re headed?
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-zinc-400 sm:text-lg">
            Wind, water, mountain, river. Type any place on Earth and get the live read: what&apos;s on right now,
            the best windows this week, and what to pack.
          </p>
          <div className="mt-8"><ScoutSearch size="hero" /></div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <Link href="/trips/new" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-zinc-400 transition-colors hover:text-white">
              <Plus className="h-3.5 w-3.5" /> Log a ride
            </Link>
            <Link href="/explore" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-zinc-400 transition-colors hover:text-white">
              <Compass className="h-3.5 w-3.5" /> Read the stories
            </Link>
          </div>
        </div>

        {/* Firing now */}
        <section className="mt-16">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-expedition text-[9px] uppercase tracking-[0.3em] text-zinc-600">Right now around the world</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">
                {firing > 0 ? `${firing} of ${strip.length} iconic spots are firing` : 'Live reads from iconic spots'}
              </h2>
            </div>
            <Link href="/scout" className="text-xs text-orange-400 hover:underline">Scout anywhere →</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {strip.map(({ spot, top, tempC, sstC }) => (
              <Link key={spot.slug} href={`/scout/${spot.slug}`}
                className={`group rounded-2xl border p-4 transition-all hover:border-zinc-600 ${
                  top?.status === 'firing' ? 'border-orange-500/40 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900/50'
                }`}>
                <div className="flex items-center justify-between">
                  <p className="font-display font-bold text-white">{countryFlag(spot.countryCode)} {spot.name}</p>
                  {top?.status === 'firing' && (
                    <span className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 font-expedition text-[9px] tracking-widest text-white">FIRING</span>
                  )}
                  {top?.status === 'rideable' && (
                    <span className="rounded-full border border-emerald-500/50 px-2 py-0.5 font-expedition text-[9px] tracking-widest text-emerald-400">RIDEABLE</span>
                  )}
                </div>
                <p className="font-expedition text-[9px] uppercase tracking-widest text-zinc-600">{spot.tagline}</p>
                {top ? (
                  <p className="mt-3 text-sm text-zinc-300"><span className="mr-1">{top.sport.emoji}</span>{top.sport.label} — {top.line}</p>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">{tempC != null ? `quiet · ${Math.round(tempC)} °C` : 'no read right now'}</p>
                )}
                {sstC != null && <p className="mt-1 text-xs text-zinc-500">sea {sstC.toFixed(1)} °C</p>}
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-16 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
            <Compass className="h-5 w-5 text-orange-400" />
            <h3 className="mt-3 font-display text-lg font-bold text-white">Scout</h3>
            <p className="mt-1 text-sm text-zinc-400">Live wind, waves, snow and sun for any place. Sixteen sports, each with its own read, the best windows this week, and what to pack.</p>
            <p className="mt-3 font-expedition text-[9px] uppercase tracking-widest text-orange-400">Live now</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <Wrench className="h-5 w-5 text-zinc-400" />
            <h3 className="mt-3 font-display text-lg font-bold text-white">Gear</h3>
            <p className="mt-1 text-sm text-zinc-400">Where to rent, buy or learn near the spot — seeded from map data, confirmed by riders who&apos;ve been.</p>
            <p className="mt-3 font-expedition text-[9px] uppercase tracking-widest text-zinc-600">Rolling out next</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <Users className="h-5 w-5 text-zinc-400" />
            <h3 className="mt-3 font-display text-lg font-bold text-white">Crew</h3>
            <p className="mt-1 text-sm text-zinc-400">Who&apos;s ridden here, who&apos;s going, and roll calls so you never ride a new spot alone.</p>
            <p className="mt-3 font-expedition text-[9px] uppercase tracking-widest text-zinc-600">After that</p>
          </div>
        </section>

        {/* Stories */}
        {teasers.length > 0 && (
          <section className="mt-16">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-expedition text-[9px] uppercase tracking-[0.3em] text-zinc-600">Fresh from the crews</p>
              <Link href="/explore" className="text-xs text-orange-400 hover:underline">All stories →</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {teasers.map(t => (
                <Link key={t.id} href={`/trips/${t.id}`}
                  className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 transition-all hover:border-zinc-600">
                  <div className="relative aspect-video overflow-hidden">
                    <img src={t.cover} alt={t.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {t.sample && (
                      <span className="absolute left-2 top-2 rounded-full bg-zinc-950/80 px-2 py-0.5 font-expedition text-[9px] uppercase tracking-widest text-amber-400 backdrop-blur">Sample</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{t.title}</p>
                      <p className="text-[11px] text-zinc-500">@{t.username}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-zinc-500"><ChevronUp className="h-3 w-3" />{t.upvotes}</span>
                  </div>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-zinc-600">
              Every ride you log pins its photos to the spot for the next rider.{' '}
              <Link href="/trips/new" className="text-orange-400 hover:underline">Log yours →</Link>
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
