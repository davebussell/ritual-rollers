// "Who's riding": places riders have tagged, with how many plan to be there on which days. Friends' names show for
// signed-in riders; everyone else sees counts.

import Link from 'next/link'
import type { PlacePlans } from '@/lib/plans'
import { whenLabel } from '@/lib/plans-shared'
import { sessionDate } from '@/lib/format'
import { cityBySlug } from '@/lib/cities'
import { spotBySlug } from '@/lib/spots-index'
import { parkById, PARK_KIND_META } from '@/lib/parks'
import { KIND_META } from '@/lib/sports'
import { Avatar, SampleTag, riderName } from '@/components/bits'

function dayShort(day: string, lng: number): string {
  const d = sessionDate(`${day}T12:00`, lng)
  return d.relative ?? `${d.weekday} ${d.day}`
}

export function placeHref(p: Pick<PlacePlans, 'spot_slug' | 'park_id'>): string {
  return p.spot_slug ? `/spots/${p.spot_slug}` : `/parks/${p.park_id}`
}

function kindOf(p: PlacePlans): { label: string; color: string } {
  const s = p.spot_slug ? spotBySlug(p.spot_slug) : null
  if (s) return { label: KIND_META[s.kind].label, color: KIND_META[s.kind].color }
  const k = p.park_id ? parkById(p.park_id) : null
  return k ? { label: PARK_KIND_META[k.kind].label, color: PARK_KIND_META[k.kind].color } : { label: 'Spot', color: '#5E5F59' }
}

export function RidingRow({ p, distanceKm }: { p: PlacePlans; distanceKm?: number }) {
  const k = kindOf(p)
  const when = p.days.slice(0, 3).map(d => `${dayShort(d.day, p.lng)} ${whenLabel(d.part, d.at_local)}: ${d.riders}`)
  const city = p.city ? cityBySlug(p.city)?.name : null
  return (
    <div className="flex gap-3.5 py-3">
      <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: k.color }} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold leading-snug">
          <Link href={`${placeHref(p)}#plans`} className="hover:underline hover:underline-offset-4">{p.name}</Link>
          {p.sample && <SampleTag />}
        </p>
        <p className="text-[13px] text-muted">{k.label}{city ? ` · ${city}` : ''}</p>
        <p className="text-[13px] text-asphalt-2">{when.join(' · ')}{p.days.length > 3 ? ' · …' : ''}</p>
        {p.friends.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {p.friends.slice(0, 6).map(f => (
              <span key={f.id} className="inline-flex items-center gap-1.5 text-[13px]">
                <Avatar name={f.mine ? 'You' : riderName(f.rider)} url={f.mine ? null : f.rider.avatar_url} size={20} />
                <b>{f.mine ? 'You' : riderName(f.rider)}</b>
                <span className="text-muted">{dayShort(f.day, p.lng)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-display text-[22px] leading-none">{p.total}</p>
        <p className="text-[12px] text-muted">{p.total === 1 ? 'rider' : 'riders'}</p>
        {distanceKm !== undefined && distanceKm > 0 && <p className="mt-1 text-[12px] text-muted">{distanceKm < 1 ? '<1' : Math.round(distanceKm)} km</p>}
      </div>
    </div>
  )
}
