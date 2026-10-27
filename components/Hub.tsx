// A place's page: sessions coming up, crews, spots on a map, riders. Used by /cities/<slug> and /near/<place>.

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
import { KIND_META } from '@/lib/sports'
import { plural } from '@/lib/format'

interface Props {
  title: string
  subtitle: string
  point: { lat: number; lng: number }
  citySlug?: string
  sessions: RideSession[]
  crews: Crew[]
  spots: (IndexedSpot & { distanceKm: number })[]
  parks: NearPark[]
  riders: RiderCard[]
  nearby?: { slug: string; name: string }[]
  radiusKm: number
}

export default function Hub({ title, subtitle, point, citySlug, sessions, crews, spots, parks, riders, nearby = [], radiusKm }: Props) {
  const realSessions = sessions.filter(s => !s.sample).length
  const postHref = citySlug ? `/sessions/new?city=${citySlug}` : '/sessions/new'
  const pins = [
    ...spots.map(s => ({ id: s.slug, lat: s.lat, lng: s.lng, title: s.name, sub: KIND_META[s.kind].label, href: `/spots/${s.slug}`, linkLabel: 'See the spot', color: KIND_META[s.kind].color, big: true, square: true })),
    ...parks.map(p => ({ id: p.id, lat: p.lat, lng: p.lng, title: parkName(p), sub: PARK_KIND_META[p.kind].label, href: `/parks/${p.id}`, linkLabel: 'See the park', color: PARK_KIND_META[p.kind].color })),
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-[15px] font-semibold text-muted"><Link href="/cities" className="hover:underline">Cities</Link> / {subtitle}</p>
        <h1 className="h-display mt-2 text-[34px] sm:text-[48px]">{title}</h1>
        <p className="mt-3 text-[17px] text-asphalt-2">
          {plural(spots.length, 'featured spot')} and {plural(parks.length, 'mapped park')} within {radiusKm} km.{' '}
          {crews.length ? `${plural(crews.length, 'crew')} to ride with.` : 'No crews listed yet.'}{' '}
          {realSessions ? `${plural(realSessions, 'session')} coming up.` : ''}
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-14">
          <section>
            <SectionHead title="Sessions coming up" />
            {sessions.length ? (
              <div className="rows panel px-4 sm:px-5">{sessions.map(s => <SessionRow key={s.id} s={s} />)}</div>
            ) : (
              <Empty>No sessions posted here yet. Going riding this week? <Link href={postHref} className="prose-link font-semibold">Post it</Link> and see who turns up.</Empty>
            )}
            <Link href={postHref} className="btn btn-curb mt-4">Post a session here</Link>
          </section>

          <section>
            <SectionHead title="Crews" href={citySlug ? `/crews?city=${citySlug}` : '/crews'} linkLabel="All crews" />
            {crews.length ? (
              <div className="rows panel px-4 sm:px-5">{crews.map(c => <CrewRow key={c.slug} c={c} showCity={false} />)}</div>
            ) : (
              <Empty>No crews listed here yet. Know one, or run one? <Link href={`/crews/add${citySlug ? `?city=${citySlug}` : ''}`} className="prose-link font-semibold">Add it</Link>.</Empty>
            )}
          </section>

          <section>
            <SectionHead title="Spots" href="/spots" linkLabel="Browse every spot" />
            <div className="panel h-[340px] overflow-hidden sm:h-[420px]">
              <HubMap pins={pins} center={point} label={`Map of spots near ${title}`} />
            </div>
            {spots.length > 0 && <div className="rows mt-4 panel px-4 sm:px-5">{spots.slice(0, 12).map(s => <SpotRow key={s.slug} s={s} distanceKm={s.distanceKm} />)}</div>}
            {parks.length > 0 && (
              <details className="mt-4 panel px-4 py-3 sm:px-5">
                <summary className="cursor-pointer text-[15px] font-bold">Every mapped park within {radiusKm} km ({parks.length})</summary>
                <div className="rows mt-2">{parks.map(p => <ParkRow key={p.id} p={p} />)}</div>
              </details>
            )}
          </section>
        </div>

        <aside className="space-y-10">
          <section>
            <h2 className="h-section text-[20px]">Riders here</h2>
            <p className="mt-1 text-[14px] text-muted">Open to riding with people.</p>
            {riders.length ? (
              <div className="rows mt-3">{riders.map(r => <RiderRow key={r.username} r={r} />)}</div>
            ) : (
              <p className="mt-3 text-[15px] text-asphalt-2">Nobody listed yet.</p>
            )}
            <Link href="/me" className="btn btn-ghost mt-3 w-full">List yourself</Link>
          </section>
          {nearby.length > 0 && (
            <section>
              <h2 className="h-section text-[20px]">Nearby</h2>
              <div className="mt-3 flex flex-wrap gap-2">{nearby.map(c => <Link key={c.slug} href={`/cities/${c.slug}`} className="chip">{c.name}</Link>)}</div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
