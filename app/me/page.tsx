import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/ProfileForm'
import { getMe } from '@/lib/me'
import { CITIES, nearestCity } from '@/lib/cities'
import { SPOTS } from '@/lib/spots-index'
import { myFriendships } from '@/lib/friends'
import { myPlans, whenLabel } from '@/lib/plans'
import { sessionDate } from '@/lib/format'
import FriendButton from '@/components/FriendButton'
import { RemovePlan } from '@/components/PlanForm'
import { Avatar, riderName } from '@/components/bits'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Your rider profile', robots: { index: false } }

export default async function MePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : null
  const me = await getMe()
  if (!me) redirect(`/auth/login?next=${encodeURIComponent(next ? `/me?next=${next}` : '/me')}`)

  const cities = [...CITIES].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ slug: c.slug, name: c.name, region: c.region }))
  const spots = SPOTS.map(s => ({ slug: s.slug, name: s.name, city: s.city, hub: nearestCity(s.lat, s.lng)?.slug ?? null }))
  const setUp = me.isRider
  const [friends, plans] = setUp ? await Promise.all([myFriendships(me.id), myPlans(me.id)]) : [null, []]

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
      <h1 className="h-display text-[32px] sm:text-[44px]">{setUp ? 'Your rider profile' : 'Set up your rider profile'}</h1>
      <p className="mt-3 text-[17px] text-asphalt-2">
        {setUp
          ? <>This is what people see on <Link href={`/riders/${me.profile?.username}`} className="prose-link">your page</Link>, next to sessions you post or join.</>
          : 'A name, what you ride and where. Then you can post sessions and say you’re in.'}
      </p>
      {friends && friends.incoming.length > 0 && (
        <section className="mt-8 rounded-xl bg-curb/25 p-4 sm:p-5">
          <h2 className="h-section text-[20px]">Friend requests</h2>
          <ul className="mt-3 space-y-3">
            {friends.incoming.map(f => (
              <li key={f.id} className="flex flex-wrap items-center gap-3">
                <Avatar name={riderName(f)} url={f.avatar_url} size={32} />
                <Link href={`/riders/${f.username}`} className="font-semibold hover:underline">{riderName(f)}</Link>
                <FriendButton state="incoming" meId={me.id} otherId={f.id} isRider name="" next="/me" />
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-8">
        <ProfileForm userId={me.id} profile={me.profile} cities={cities} spots={spots} next={next} />
      </div>
      {setUp && (
        <>
          <section className="mt-14">
            <h2 className="h-section text-[22px]">Your plans</h2>
            <p className="mt-1 text-[15px] text-muted">Where you said you&apos;ll be. Only your friends see it&apos;s you.</p>
            {plans.length ? (
              <ul className="rows panel mt-3 px-4">
                {plans.map(p => {
                  const d = sessionDate(`${p.day}T12:00`, 0)
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-[15px]">
                      <span>
                        <Link href={p.spot_slug ? `/spots/${p.spot_slug}` : `/parks/${p.park_id}`} className="font-semibold hover:underline">{p.place_name}</Link>
                        <span className="text-muted"> · {d.weekdayLong} {d.day} {d.month}, {whenLabel(p.part, p.at_local)}</span>
                      </span>
                      <RemovePlan id={p.id} />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-3 text-[15px] text-asphalt-2">None yet. On any spot or park page, tap <b>I&apos;ll be here</b>.</p>
            )}
          </section>
          {friends && (
            <section className="mt-12">
              <h2 className="h-section text-[22px]">Friends</h2>
              <p className="mt-1 text-[15px] text-muted">Add friends from their rider pages. You see each other&apos;s plans; there are no private messages.</p>
              {friends.friends.length ? (
                <ul className="mt-3 flex flex-wrap gap-3">
                  {friends.friends.map(f => (
                    <li key={f.id}><Link href={`/riders/${f.username}`} className="chip inline-flex items-center gap-2"><Avatar name={riderName(f)} url={f.avatar_url} size={22} />{riderName(f)}</Link></li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[15px] text-asphalt-2">No friends yet. <Link href="/riders" className="prose-link font-semibold">Find riders</Link> near you.</p>
              )}
              {friends.outgoing.length > 0 && (
                <p className="mt-3 text-[14px] text-muted">Waiting on: {friends.outgoing.map(f => riderName(f)).join(', ')}</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
