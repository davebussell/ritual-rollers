import Link from 'next/link'
import { ChevronUp, Plus, Compass, Droplets, Users, Map } from 'lucide-react'
import ScoutSearch from '@/components/ScoutSearch'
import { GroundAnim } from '@/components/ConditionAnimations'
import { countryFlag } from '@/lib/format'
import { KIND_META, type Kind } from '@/lib/sports'
import type { Ground, Status } from '@/lib/skate'

export interface StripItem {
  slug: string
  name: string
  city: string
  country: string
  kind: Kind
  indoor: boolean
  ground: string | null      // label: Dry, Drying, Wet, Muddy, Snow, Ice, Indoor
  groundKey: Ground | null
  status: Status | null
  line: string | null
  dryAt: string | null
  dirt: boolean
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
  featuredCount: number
  mapped: { total: number; skate: number; pump: number; bmx: number; bike: number }
}

const BADGE: Record<Status, { label: string; cls: string }> = {
  prime: { label: 'PRIME', cls: 'bg-orange-500 text-white' },
  skateable: { label: 'RIDEABLE', cls: 'bg-emerald-500/30 text-[#2E4631]' },
  no: { label: 'SIT IT OUT', cls: 'bg-zinc-800 text-zinc-500' },
}

export default function HomeScout({ strip, teasers, featuredCount, mapped }: Props) {
  const rolling = strip.filter(s => s.status && s.status !== 'no').length
  const fmt = (n: number) => n.toLocaleString('en-US')

  return (
    <div className="min-h-[calc(100vh-57px)] bg-zinc-950 tx-canvas">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-14 sm:px-8">

        {/* Hero */}
        <div className="text-center">
          <p className="tag inline-flex items-center gap-2 px-3 py-1 text-[11px] tracking-[0.18em]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Anything on wheels · Canada, US, Mexico
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-6xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-8xl">
            Dry enough <span className="text-orange-500">to roll?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl font-body text-lg text-zinc-500">
            Skateparks, plazas, DIYs, pump tracks, BMX tracks and bike parks — with a live read of whether the ground
            is dry right now, and when it will be.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <ScoutSearch size="hero" />
          </div>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/finder"
              className="tx-stitch relative flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-7 py-3.5 font-display text-xl font-bold uppercase tracking-wide text-white transition-all hover:bg-orange-400 active:scale-95 sm:w-auto">
              <Compass className="h-5 w-5" strokeWidth={2.5} /> Find a spot
            </Link>
            <Link href="/crew"
              className="tx-stitch relative flex w-full items-center justify-center gap-2 rounded-md bg-forest px-7 py-3.5 font-display text-xl font-bold uppercase tracking-wide text-white transition-all hover:brightness-110 active:scale-95 sm:w-auto">
              <Users className="h-5 w-5" strokeWidth={2.5} /> Find your crew
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <Link href="/spots" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-body font-medium text-zinc-500 transition-colors hover:text-white">
              <Map className="h-3.5 w-3.5" /> Browse {featuredCount} featured spots
            </Link>
            <Link href="/trips/new" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-body font-medium text-zinc-500 transition-colors hover:text-white">
              <Plus className="h-3.5 w-3.5" /> Log a session
            </Link>
          </div>
        </div>

        {/* Right now */}
        <section className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Right now across North America</p>
              <h2 className="mt-1 font-display text-3xl font-bold uppercase tracking-[0.02em] text-white">
                {strip.some(s => s.status) ? `${rolling} of ${strip.length} spots are rideable` : 'Live reads from famous spots'}
              </h2>
            </div>
            <Link href="/spots" className="font-expedition text-xs uppercase tracking-[0.18em] text-teal-700 hover:underline">Every spot →</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {strip.map(s => (
              <Link key={s.slug} href={`/spots/${s.slug}`}
                className={`tx-stitch group relative overflow-hidden rounded-xl border bg-zinc-900 transition-all hover:border-zinc-700 ${s.status === 'prime' ? 'border-orange-500' : 'border-zinc-800'}`}>
                <div className="h-9">{s.groundKey && <GroundAnim ground={s.groundKey} dirt={s.dirt} />}</div>
                <div className="p-4 pt-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-xl font-bold uppercase leading-tight tracking-[0.02em] text-white">{countryFlag(s.country)} {s.name}</p>
                    {s.status && <span className={`shrink-0 rounded-md px-2 py-0.5 font-expedition text-[10px] uppercase tracking-[0.18em] ${BADGE[s.status].cls}`}>{BADGE[s.status].label}</span>}
                  </div>
                  <p className="font-expedition text-[10px] uppercase tracking-[0.18em]" style={{ color: KIND_META[s.kind].color }}>{KIND_META[s.kind].label} · {s.city}</p>
                  {s.line ? (
                    <p className="mt-3 font-body text-sm text-zinc-300"><span className="font-semibold text-white">{s.ground}</span> — {s.line}</p>
                  ) : (
                    <p className="mt-3 font-body text-sm text-zinc-500">no read right now</p>
                  )}
                  {s.dryAt && <p className="mt-1 font-body text-xs text-zinc-500">rideable {s.dryAt}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <div className="rule-plaid mt-16" />
        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="tx-stitch relative rounded-xl border border-orange-500 bg-zinc-900 p-5">
            <Droplets className="h-5 w-5 text-orange-600" />
            <h3 className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.02em] text-white">Read the ground</h3>
            <p className="mt-1 font-body text-sm text-zinc-500">Rain in, sun and wind out, hour by hour from two days back. Concrete and dirt each get their own read, plus snow, ice, heat and daylight.</p>
          </div>
          <div className="tx-stitch relative rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <Map className="h-5 w-5 text-zinc-500" />
            <h3 className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.02em] text-white">Every park on the map</h3>
            <p className="mt-1 font-body text-sm text-zinc-500">
              {fmt(mapped.skate)} skateparks, {fmt(mapped.pump)} pump tracks, {fmt(mapped.bmx)} BMX tracks and {fmt(mapped.bike)} bike parks from OpenStreetMap — around any town you check.
            </p>
          </div>
          <div className="tx-stitch relative rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <Users className="h-5 w-5 text-zinc-500" />
            <h3 className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.02em] text-white">Roll with a crew</h3>
            <p className="mt-1 font-body text-sm text-zinc-500">Who&apos;s skated or ridden there, and roll calls for who&apos;s going when — so you never session a new spot alone.</p>
          </div>
        </section>

        {/* Stories */}
        {teasers.length > 0 && (
          <>
            <div className="rule-plaid mt-16" />
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-expedition text-[11px] uppercase tracking-[0.18em] text-teal-700">Fresh sessions</p>
                <Link href="/explore" className="font-expedition text-xs uppercase tracking-[0.18em] text-teal-700 hover:underline">All sessions →</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {teasers.map(t => (
                  <Link key={t.id} href={`/trips/${t.id}`}
                    className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700">
                    <div className="relative aspect-video overflow-hidden">
                      <img src={t.cover} alt={t.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      {t.sample && <span className="tag absolute left-2 top-2 px-2 py-0.5 text-[10px] tracking-[0.18em]">Sample</span>}
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
            </section>
          </>
        )}
        <p className="mt-12 text-center font-display text-2xl font-bold uppercase tracking-[0.02em] text-white sm:text-3xl">
          Roll out. Share the session.{' '}
          <Link href="/trips/new" className="text-orange-500 hover:underline">Log yours →</Link>
        </p>
      </div>
    </div>
  )
}
