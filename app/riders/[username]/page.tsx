import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { riderByUsername } from '@/lib/riders'
import { realSessions } from '@/lib/sessions'
import { sampleSessions } from '@/lib/sample'
import { cityBySlug } from '@/lib/cities'
import { spotBySlug } from '@/lib/spots-index'
import { LEVEL_LABEL, disciplineList } from '@/lib/sports'
import { Avatar, SampleTag, riderName } from '@/components/bits'
import { SessionRow } from '@/components/SessionBits'
import ReportLink from '@/components/ReportLink'
import FriendButton from '@/components/FriendButton'
import { getMe } from '@/lib/me'
import { friendStateWith } from '@/lib/friends'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  const r = await riderByUsername(decodeURIComponent(username))
  // Rider pages stay out of search engines: people come here from sessions and city pages
  return { title: r ? riderName(r) : 'Rider not found', robots: { index: false, follow: false } }
}

export default async function RiderPage({ params }: { params: Promise<{ username: string }> }) {
  const { username: raw } = await params
  const username = decodeURIComponent(raw)
  const r = await riderByUsername(username)
  if (!r) notFound()
  const city = r.home_city ? cityBySlug(r.home_city) : null
  const spots = r.home_spots.map(spotBySlug).filter(Boolean)
  const me = await getMe()
  const friend = r.sample ? null : await friendStateWith(me?.id ?? null, username)
  const sessions = r.sample
    ? sampleSessions().filter(s => s.host.username === username || s.riders.some(x => x.username === username))
    : (await realSessions({})).filter(s => s.host.username === username || s.riders.some(x => x.username === username))

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <p className="text-[15px] font-semibold text-muted"><Link href="/riders" className="hover:underline">Riders</Link></p>
      <div className="mt-4 flex items-center gap-5">
        <Avatar name={riderName(r)} url={r.avatar_url} size={76} />
        <div>
          <h1 className="h-display flex flex-wrap items-center gap-3 text-[30px] sm:text-[40px]">{riderName(r)} {r.sample && <SampleTag className="!text-[13px]" />}</h1>
          <p className="mt-1 text-[16px] text-muted">@{r.username}</p>
        </div>
      </div>
      {r.sample && <p className="mt-5 rounded-xl bg-asphalt px-5 py-3 text-[15px] text-flyer">A made-up rider, to show what a profile looks like.</p>}
      {friend && friend.state !== 'self' && (
        <div className="mt-5">
          <FriendButton state={friend.state} meId={me?.id ?? null} otherId={friend.otherId} isRider={!!me?.isRider} name={riderName(r)} next={`/riders/${r.username}`} />
          {friend.state === 'friends' && <p className="mt-1 text-[13px] text-muted">You see each other&apos;s plans on spot pages.</p>}
        </div>
      )}
      {r.bio && <p className="mt-6 text-[18px] leading-relaxed">{r.bio}</p>}
      <dl className="rows mt-6 panel px-4">
        {r.disciplines.length > 0 && <div className="flex justify-between gap-4 py-2.5 text-[15px]"><dt className="text-muted">Rides</dt><dd className="text-right font-semibold">{disciplineList(r.disciplines, 'label')}</dd></div>}
        {r.level && <div className="flex justify-between gap-4 py-2.5 text-[15px]"><dt className="text-muted">Level</dt><dd className="text-right font-semibold">{LEVEL_LABEL[r.level]}</dd></div>}
        {city && <div className="flex justify-between gap-4 py-2.5 text-[15px]"><dt className="text-muted">Rides in</dt><dd className="text-right font-semibold"><Link href={`/cities/${city.slug}`} className="prose-link">{city.name}</Link></dd></div>}
        {spots.length > 0 && (
          <div className="flex justify-between gap-4 py-2.5 text-[15px]"><dt className="text-muted">Usually at</dt>
            <dd className="text-right font-semibold">{spots.map((s, i) => s && <span key={s.slug}>{i > 0 && ', '}<Link href={`/spots/${s.slug}`} className="prose-link">{s.name}</Link></span>)}</dd></div>
        )}
      </dl>
      {!r.open_to_ride && !r.sample && <p className="mt-4 text-[15px] text-muted">Not listed as looking for people right now.</p>}

      <section className="mt-12">
        <h2 className="h-section text-[22px]">Sessions</h2>
        {sessions.length ? (
          <div className="rows mt-3 panel px-4 sm:px-5">{sessions.map(s => <SessionRow key={s.id} s={s} />)}</div>
        ) : (
          <p className="mt-3 text-[15px] text-muted">Nothing coming up.</p>
        )}
      </section>
      <p className="mt-10 text-[14px] text-muted">
        To ride with {riderName(r)}, join a session they&apos;re going to, or add them as a friend to see where they plan to ride.
        There are no private messages here, on purpose.
      </p>
      {!r.sample && <div className="mt-3"><ReportLink what="profile" url={`https://ritualrollers.com/riders/${r.username}`} /></div>}
    </div>
  )
}
