// Small pieces for races and riders: an event row and a rider card.

import Link from 'next/link'
import type { RideEvent, Athlete } from '@/lib/events'
import { DISCIPLINE_LABEL, placeLabel } from '@/lib/events'

export function EventRow({ e, distanceKm }: { e: RideEvent; distanceKm?: number }) {
  const latest = e.results[0]
  const span = e.years.length ? (e.years.length > 1 ? `${e.years[0]}–${e.years[e.years.length - 1]}` : `${e.years[0]}`) : ''
  return (
    <Link href={`/events/${e.slug}`} className="group flex gap-3.5 py-3">
      <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rotate-45 bg-fire" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold leading-snug group-hover:underline group-hover:underline-offset-4">{e.name}</p>
        <p className="text-[13px] text-muted">{e.disciplines.map(d => DISCIPLINE_LABEL[d]).join(', ')} · {e.place ? `${e.place}, ` : ''}{e.city}{span ? ` · ${span}` : ''}</p>
        {latest && <p className="text-[13px] text-asphalt-2">{latest.year} {latest.class}: {latest.podium[0]} won</p>}
      </div>
      {distanceKm !== undefined && <span className="shrink-0 pt-0.5 text-[13px] text-muted">{distanceKm < 1 ? '<1' : Math.round(distanceKm)} km</span>}
    </Link>
  )
}

export function AthleteCard({ a }: { a: Athlete }) {
  const best = [...a.results].sort((x, y) => (x.place ?? 99) - (y.place ?? 99) || y.year - x.year)[0]
  return (
    <Link href={`/athletes/${a.slug}`} className="panel group block p-4 hover:border-asphalt/30">
      <p className="text-[13px] font-semibold text-muted">{a.disciplines.map(d => DISCIPLINE_LABEL[d]).join(', ')} · {a.home}</p>
      <p className="mt-1 text-[19px] font-bold group-hover:underline">{a.name}</p>
      {best && <p className="mt-1 text-[14px] text-asphalt-2">{placeLabel(best.place)} {best.class ? `${best.class}, ` : ''}{best.event} {best.year}</p>}
      <p className="mt-1 text-[13px] text-muted">{a.results.length} sourced result{a.results.length === 1 ? '' : 's'}</p>
    </Link>
  )
}
