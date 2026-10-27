// A spot's page (featured spot or mapped park): what's there, who's going when, who rides it, crews nearby.

import Link from 'next/link'
import { SessionRow } from '@/components/SessionBits'
import { CrewRow, RiderRow, SpotRow, ParkRow } from '@/components/Rows'
import { Empty, SectionHead } from '@/components/bits'
import HubMap from '@/components/HubMap'
import type { RideSession, RiderCard } from '@/lib/types'
import type { Crew } from '@/lib/crews'
import type { IndexedSpot } from '@/lib/spots-index'
import type { NearPark } from '@/lib/parks'
import { PARK_KIND_META, parkName } from '@/lib/parks'
import { KIND_META, LEVEL_LABEL, type Level } from '@/lib/sports'
import { disciplineList } from '@/lib/sports'

export interface SpotFacts {
  name: string
  kindLabel: string
  color: string
  place: string                 // "Ottawa, Ontario"
  cityHref?: string
  lat: number
  lng: number
  about?: string
  headsUp?: string
  features: string[]            // labels
  disciplines: string[]
  level?: Level | 'all' | null
  cost?: 'free' | 'paid' | 'unknown'
  lit?: boolean | null
  indoor?: boolean
  hours?: string
  web?: string
  source?: { url: string; label: string }
}

interface Props {
  facts: SpotFacts
  postHref: string
  sessions: RideSession[]
  riders: RiderCard[]
  crews: (Crew & { distanceKm: number })[]
  nearbySpots: (IndexedSpot & { distanceKm: number })[]
  nearbyParks: NearPark[]
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-[15px]">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  )
}

export default function SpotView({ facts, postHref, sessions, riders, crews, nearbySpots, nearbyParks }: Props) {
  const f = facts
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`
  const pins = [
    { id: '_here', lat: f.lat, lng: f.lng, title: f.name, sub: f.kindLabel, color: f.color, big: true, square: true },
    ...nearbySpots.slice(0, 20).map(s => ({ id: s.slug, lat: s.lat, lng: s.lng, title: s.name, sub: KIND_META[s.kind].label, href: `/spots/${s.slug}`, linkLabel: 'See the spot', color: KIND_META[s.kind].color, big: true, square: true })),
    ...nearbyParks.slice(0, 40).map(p => ({ id: p.id, lat: p.lat, lng: p.lng, title: parkName(p), sub: PARK_KIND_META[p.kind].label, href: `/parks/${p.id}`, linkLabel: 'See the park', color: PARK_KIND_META[p.kind].color })),
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-[15px] font-semibold text-muted">
          <Link href="/spots" className="hover:underline">Spots</Link> / {f.cityHref ? <Link href={f.cityHref} className="hover:underline">{f.place}</Link> : f.place}
        </p>
        <h1 className="h-display mt-2 text-[32px] sm:text-[46px]">{f.name}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[17px] text-asphalt-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-[3px]" style={{ background: f.color }} />
          {f.kindLabel}{f.indoor ? ', indoor' : ''}
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-14">
          {(f.about || f.features.length > 0) && (
            <section className="max-w-2xl">
              {f.about && <p className="text-[18px] leading-relaxed">{f.about}</p>}
              {f.headsUp && <p className="mt-4 border-l-4 border-curb pl-4 text-[16px] leading-relaxed text-asphalt-2">{f.headsUp}</p>}
              {f.features.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">{f.features.map(x => <span key={x} className="tag tag-line !text-[13px]">{x}</span>)}</div>
              )}
            </section>
          )}

          <section>
            <SectionHead title="Sessions here" />
            {sessions.length ? (
              <div className="rows panel px-4 sm:px-5">{sessions.map(s => <SessionRow key={s.id} s={s} showPlace={false} />)}</div>
            ) : (
              <Empty>Nobody has posted a session here yet. Riding here soon? Post it and see who comes.</Empty>
            )}
            <Link href={postHref} className="btn btn-curb mt-4">Post a session here</Link>
          </section>

          <section>
            <SectionHead title="Riders who ride here" />
            {riders.length ? (
              <div className="rows panel px-4 sm:px-5">{riders.map(r => <RiderRow key={r.username} r={r} />)}</div>
            ) : (
              <Empty>Is this your spot? <Link href="/me" className="prose-link font-semibold">Add it to your profile</Link> so people who ride here can find you.</Empty>
            )}
          </section>

          {crews.length > 0 && (
            <section>
              <SectionHead title="Crews nearby" />
              <div className="rows panel px-4 sm:px-5">{crews.slice(0, 6).map(c => <CrewRow key={c.slug} c={c} />)}</div>
            </section>
          )}
        </div>

        <aside className="space-y-8">
          <div className="panel overflow-hidden">
            <div className="h-[260px]"><HubMap pins={pins} center={{ lat: f.lat, lng: f.lng }} zoom={13} fitPins={false} label={`Map of ${f.name}`} /></div>
            <div className="p-4">
              <a href={directions} className="btn btn-dark w-full" rel="noopener">Directions</a>
            </div>
          </div>
          <dl className="rows panel px-4">
            {f.disciplines.length > 0 && <Fact label="Who rides it">{disciplineList(f.disciplines)}</Fact>}
            {f.level && <Fact label="Level">{LEVEL_LABEL[f.level]}</Fact>}
            {f.cost && f.cost !== 'unknown' && <Fact label="Cost">{f.cost === 'free' ? 'Free' : 'Paid'}</Fact>}
            {f.lit !== undefined && f.lit !== null && <Fact label="Lights">{f.lit ? 'Lit after dark' : 'No lights'}</Fact>}
            {f.hours && <Fact label="Hours">{f.hours}</Fact>}
            {f.web && <Fact label="Website"><a href={f.web} className="prose-link" rel="noopener">Visit</a></Fact>}
            {f.source && <Fact label="Source"><a href={f.source.url} className="prose-link" rel="noopener">{f.source.label}</a></Fact>}
          </dl>
          {nearbySpots.length > 0 && (
            <section>
              <h2 className="h-section text-[18px]">Spots nearby</h2>
              <div className="rows mt-2">{nearbySpots.slice(0, 6).map(s => <SpotRow key={s.slug} s={s} distanceKm={s.distanceKm} />)}</div>
            </section>
          )}
          {nearbyParks.length > 0 && (
            <details className="panel px-4 py-3">
              <summary className="cursor-pointer text-[15px] font-bold">More mapped parks nearby ({nearbyParks.length})</summary>
              <div className="rows mt-2">{nearbyParks.slice(0, 30).map(p => <ParkRow key={p.id} p={p} />)}</div>
            </details>
          )}
        </aside>
      </div>
    </div>
  )
}
