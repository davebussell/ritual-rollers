// Quiet list rows for crews, riders and spots.

import Link from 'next/link'
import type { Crew } from '@/lib/crews'
import { CREW_KIND_LABEL } from '@/lib/crews'
import type { RiderCard } from '@/lib/types'
import type { IndexedSpot } from '@/lib/spots-index'
import type { NearPark } from '@/lib/parks'
import { PARK_KIND_META, parkName } from '@/lib/parks'
import { AUDIENCE_LABEL, KIND_META, LEVEL_LABEL, FEATURE_LABEL } from '@/lib/sports'
import { cityBySlug } from '@/lib/cities'
import { spotBySlug } from '@/lib/spots-index'
import { Avatar, Disciplines, SampleTag, riderName } from '@/components/bits'

export function CrewRow({ c, showCity = true }: { c: Crew; showCity?: boolean }) {
  const who = c.audience.filter(a => a !== 'all').map(a => AUDIENCE_LABEL[a]).join(', ')
  return (
    <Link href={`/crews/${c.slug}`} className="group block py-4">
      <p className="text-[17px] font-extrabold leading-snug group-hover:underline group-hover:underline-offset-4">{c.name}</p>
      <p className="mt-0.5 text-[15px] text-asphalt-2">
        {CREW_KIND_LABEL[c.kind]}{showCity ? ` in ${c.city}` : ''}{c.meets ? `. ${c.meets}` : ''}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="tag tag-line"><Disciplines ids={c.disciplines} /></span>
        {who && <span className="tag tag-line">{who}</span>}
      </div>
    </Link>
  )
}

export function RiderRow({ r }: { r: RiderCard }) {
  const city = r.home_city ? cityBySlug(r.home_city) : null
  const spot = r.home_spots[0] ? spotBySlug(r.home_spots[0]) : null
  return (
    <Link href={`/riders/${r.username}`} className="group flex gap-3.5 py-4">
      <Avatar name={riderName(r)} url={r.avatar_url} size={44} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[17px] font-extrabold leading-snug">
          <span className="group-hover:underline group-hover:underline-offset-4">{riderName(r)}</span>
          {r.sample && <SampleTag />}
        </p>
        <p className="text-[14px] text-muted">
          <Disciplines ids={r.disciplines} />{r.level ? `, ${LEVEL_LABEL[r.level].toLowerCase()}` : ''}
          {city ? ` in ${city.name}` : ''}{spot ? `. Usually at ${spot.name}` : ''}
        </p>
        {r.bio && <p className="mt-1 line-clamp-2 text-[15px] text-asphalt-2">{r.bio}</p>}
      </div>
    </Link>
  )
}

export function SpotRow({ s, distanceKm }: { s: IndexedSpot; distanceKm?: number }) {
  return (
    <Link href={`/spots/${s.slug}`} className="group flex gap-3.5 py-3.5">
      <span aria-hidden="true" className="mt-1.5 h-3 w-3 shrink-0 rounded-[3px]" style={{ background: KIND_META[s.kind].color }} />
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-extrabold leading-snug group-hover:underline group-hover:underline-offset-4">{s.name}</p>
        <p className="text-[14px] text-muted">
          {KIND_META[s.kind].label}{s.indoor ? ', indoor' : ''} in {s.city}
          {s.features.length ? `. ${s.features.slice(0, 3).map(f => FEATURE_LABEL[f] ?? f).join(', ')}` : ''}
        </p>
      </div>
      {distanceKm !== undefined && <span className="shrink-0 pt-0.5 text-[14px] text-muted">{distanceKm < 1 ? '<1' : Math.round(distanceKm)} km</span>}
    </Link>
  )
}

export function ParkRow({ p }: { p: NearPark }) {
  const extra = [p.indoor ? 'indoor' : null, p.lit ? 'lit' : null, p.fee ? 'paid' : null].filter(Boolean).join(', ')
  return (
    <Link href={`/parks/${p.id}`} className="group flex gap-3.5 py-3">
      <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PARK_KIND_META[p.kind].color }} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold leading-snug group-hover:underline group-hover:underline-offset-4">{parkName(p)}</p>
        <p className="text-[13px] text-muted">{p.name ? PARK_KIND_META[p.kind].label : 'Unnamed on the map'}{extra ? `, ${extra}` : ''}</p>
      </div>
      <span className="shrink-0 pt-0.5 text-[13px] text-muted">{p.distanceKm < 1 ? '<1' : Math.round(p.distanceKm)} km</span>
    </Link>
  )
}
