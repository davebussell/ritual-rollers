// "Who's coming": how many riders plan to be at a spot, by day, for everyone; who, for the rider's friends.
// Server component; the form to add a plan is the client part below.

import Link from 'next/link'
import { getMe } from '@/lib/me'
import { planCounts, visiblePlans, whenLabel, type PlanCount, type VisiblePlan, type PlanPlace } from '@/lib/plans'
import { sessionDate, plural } from '@/lib/format'
import { Avatar, riderName } from '@/components/bits'
import { PlanForm, RemovePlan } from '@/components/PlanForm'

export interface PlanSpot extends PlanPlace { name: string; city?: string | null; lat: number; lng: number }

function dayLabel(day: string, lng: number): string {
  const d = sessionDate(`${day}T12:00`, lng)
  return d.relative ?? `${d.weekdayLong} ${d.day} ${d.month}`
}

export default async function Plans({ place, next }: { place: PlanSpot; next: string }) {
  const me = await getMe()
  const [counts, visible] = await Promise.all([planCounts(place), visiblePlans(place, me?.id ?? null)])
  if (counts === null) return null   // plans aren't switched on yet

  const days = new Map<string, { counts: PlanCount[]; people: VisiblePlan[] }>()
  for (const c of counts) {
    if (!days.has(c.day)) days.set(c.day, { counts: [], people: [] })
    days.get(c.day)!.counts.push(c)
  }
  for (const p of visible) days.get(p.day)?.people.push(p)
  const gate = !me ? 'signin' : !me.isRider ? 'setup' : 'ok'
  const mine = visible.filter(p => p.mine)
  const friendsNamed = visible.some(p => !p.mine)

  return (
    <section>
      <h2 className="h-section text-[22px] sm:text-[26px]">Who&apos;s coming</h2>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">
        Riders who plan to be here. Everyone sees how many; only their friends see who.
      </p>
      {days.size ? (
        <ul className="rows panel mt-4 px-4 sm:px-5">
          {[...days].map(([day, { counts: cs, people }]) => {
            const total = cs.reduce((n, c) => n + c.riders, 0)
            return (
              <li key={day} className="py-3">
                <p className="text-[16px]"><b>{dayLabel(day, place.lng)}</b> · {plural(total, 'rider')}</p>
                <p className="text-[14px] text-muted">{cs.map(c => `${c.riders} ${c.part === 'time' ? 'at' : 'in the'} ${whenLabel(c.part, c.at_local)}`).join(', ')}</p>
                {people.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                    {people.map(p => (
                      <span key={p.id} className="inline-flex items-center gap-2 text-[14px]">
                        <Avatar name={p.mine ? 'You' : riderName(p.rider)} url={p.mine ? null : p.rider.avatar_url} size={24} />
                        {p.mine ? <b>You</b> : <Link href={`/riders/${p.rider.username}`} className="font-semibold hover:underline">{riderName(p.rider)}</Link>}
                        <span className="text-muted">{whenLabel(p.part, p.at_local)}{p.note ? `: ${p.note}` : ''}</span>
                        {p.mine && <RemovePlan id={p.id} />}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-4 text-[15px] text-asphalt-2">Nobody has said they&apos;ll be here yet.</p>
      )}
      {gate === 'ok' && days.size > 0 && !friendsNamed && (
        <p className="mt-2 text-[13px] text-muted">None of these are your friends yet. Add friends from their rider pages to see who&apos;s who.</p>
      )}
      <div className="mt-5">
        {gate === 'ok' && me ? (
          <PlanForm
            meId={me.id} hasPlans={mine.length > 0}
            place={{ spot: place.spot ?? null, park: place.park ?? null, name: place.name, city: place.city ?? null, lat: place.lat, lng: place.lng }}
          />
        ) : gate === 'setup' ? (
          <p className="text-[15px]"><Link href={`/me?next=${encodeURIComponent(next)}`} className="prose-link font-semibold">Finish your rider profile</Link> (16+) to say you&apos;ll be here.</p>
        ) : (
          <p className="text-[15px]"><Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="prose-link font-semibold">Sign in</Link> to say you&apos;ll be here, and to see which of your friends are coming.</p>
        )}
      </div>
    </section>
  )
}
