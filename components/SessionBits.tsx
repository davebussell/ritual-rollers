// Sessions on the page: the flyer (loud, for the hero and "this week") and the row (quiet, for lists).

import Link from 'next/link'
import type { RideSession, RiderLite } from '@/lib/types'
import { sessionDate } from '@/lib/format'
import { cityBySlug } from '@/lib/cities'
import { LEVEL_LABEL } from '@/lib/sports'
import { Avatar, Disciplines, SampleTag, riderName } from '@/components/bits'

export function placeLine(s: Pick<RideSession, 'place_name' | 'city'>): string {
  const c = s.city ? cityBySlug(s.city) : null
  return c && !s.place_name.includes(c.name) ? `${s.place_name}, ${c.name}` : s.place_name
}

function Faces({ riders, max = 4, size = 26 }: { riders: RiderLite[]; max?: number; size?: number }) {
  return (
    <span className="flex -space-x-2">
      {riders.slice(0, max).map(r => (
        <span key={r.username} className="rounded-full ring-2 ring-flyer"><Avatar name={riderName(r)} url={r.avatar_url} size={size} /></span>
      ))}
    </span>
  )
}

export function goingLine(s: Pick<RideSession, 'riders_count' | 'host' | 'riders'>): string {
  const n = s.riders_count
  if (n <= 1) return `${riderName(s.host)} is going`
  return `${riderName(s.host)} and ${n - 1} more ${n - 1 === 1 ? 'is' : 'are'} going`
}

const TILTS = ['-1.6deg', '1.1deg', '-0.6deg', '1.7deg', '-1.1deg']

export function SessionFlyer({ s, i = 0 }: { s: RideSession; i?: number }) {
  const d = sessionDate(s.starts_local, s.lng)
  return (
    <Link href={`/sessions/${s.id}`} className="flyer block px-5 pb-5 pt-6" style={{ ['--tilt' as string]: TILTS[i % TILTS.length] }}>
      <div className="flex items-start justify-between gap-3">
        <p className="leading-none">
          <span className="block text-[13px] font-extrabold text-fire">{d.relative ?? d.weekdayLong}</span>
          <span className="mt-1 block font-display text-[34px] font-bold leading-none tracking-tight">{d.day} <span className="text-[18px] font-semibold">{d.month}</span></span>
        </p>
        <span className="pt-1 text-right text-[15px] font-bold">{d.time}</span>
      </div>
      <h3 className="mt-3 text-[19px] font-extrabold leading-snug">{s.title}</h3>
      <p className="mt-1 text-[15px] text-asphalt-2">{placeLine(s)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {s.beginners_welcome && <span className="tag tag-welcome">Beginners welcome</span>}
        {!s.beginners_welcome && s.level !== 'all' && <span className="tag tag-line">{LEVEL_LABEL[s.level]}</span>}
        <span className="tag tag-line"><Disciplines ids={s.disciplines} /></span>
        {s.sample && <SampleTag />}
      </div>
      <div className="mt-4 flex items-center gap-2.5 border-t-2 border-dashed border-concrete-2 pt-3">
        <Faces riders={[s.host, ...s.riders]} />
        <span className="text-[14px] text-asphalt-2">{goingLine(s)}</span>
      </div>
    </Link>
  )
}

export function SessionRow({ s, showPlace = true }: { s: RideSession; showPlace?: boolean }) {
  const d = sessionDate(s.starts_local, s.lng)
  return (
    <Link href={`/sessions/${s.id}`} className="group flex gap-4 py-4 sm:gap-5">
      <div className="w-[58px] shrink-0 text-center leading-none">
        <span className="block text-[12px] font-extrabold text-fire">{d.relative ?? d.weekday}</span>
        <span className="mt-1 block font-display text-[26px] font-bold tracking-tight">{d.day}</span>
        <span className="mt-0.5 block text-[12px] font-semibold text-muted">{d.month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-extrabold leading-snug group-hover:underline group-hover:underline-offset-4">{s.title}</p>
        <p className="mt-0.5 text-[15px] text-asphalt-2">{showPlace ? `${placeLine(s)}, ` : ''}{d.time}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {s.beginners_welcome && <span className="tag tag-welcome">Beginners welcome</span>}
          {!s.beginners_welcome && s.level !== 'all' && <span className="tag tag-line">{LEVEL_LABEL[s.level]}</span>}
          <span className="tag tag-line"><Disciplines ids={s.disciplines} /></span>
          {s.sample && <SampleTag />}
        </div>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <Faces riders={[s.host, ...s.riders]} max={3} />
        <span className="text-[13px] text-muted">{s.riders_count} going</span>
      </div>
    </Link>
  )
}
