import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sessionById, sessionComments, sessionsReady } from '@/lib/sessions'
import { getMe } from '@/lib/me'
import { createClient } from '@/lib/supabase/server'
import { sessionDate, sessionWhen } from '@/lib/format'
import { spotBySlug } from '@/lib/spots-index'
import { parkById } from '@/lib/parks'
import { cityBySlug } from '@/lib/cities'
import { LEVEL_LABEL, disciplineList } from '@/lib/sports'
import { Avatar, SampleTag, riderName } from '@/components/bits'
import { ImIn, Comments, CancelSession } from '@/components/SessionActions'
import ShareButton from '@/components/ShareButton'
import ReportLink from '@/components/ReportLink'
import HubMap from '@/components/HubMap'

export const dynamic = 'force-dynamic'

const SITE = 'https://ritualrollers.com'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const s = await sessionById(id)
  if (!s) return { title: 'Session not found' }
  const title = `${s.title} at ${s.place_name}`
  const description = `${sessionWhen(s.starts_local, s.lng)}. ${s.notes ?? 'A session on Ritual Rollers. Tap I’m in if you’re coming.'}`.slice(0, 280)
  return { title, description, robots: { index: false }, openGraph: { title, description, url: `${SITE}/sessions/${id}`, type: 'website' } }
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await sessionById(id)
  if (!s) notFound()
  const [me, ready, comments] = await Promise.all([getMe(), s.sample ? Promise.resolve(true) : sessionsReady(), sessionComments(id)])

  let amIn = false
  if (me && !s.sample) {
    try {
      const supabase = await createClient()
      const { data } = await supabase.from('ride_session_riders').select('rider_id').eq('session_id', id).eq('rider_id', me.id).maybeSingle()
      amIn = !!data
    } catch { /* not in */ }
  }
  const gate = s.sample ? 'sample' : !ready ? 'closed' : !me ? 'signin' : !me.isRider ? 'setup' : 'ok'
  const myUsername = me?.profile?.username ?? null
  const isHost = !!myUsername && myUsername === s.host.username

  const d = sessionDate(s.starts_local, s.lng)
  const spot = s.spot_slug ? spotBySlug(s.spot_slug) : null
  const park = s.park_id ? parkById(s.park_id) : null
  const placeHref = spot ? `/spots/${spot.slug}` : park ? `/parks/${park.id}` : null
  const city = s.city ? cityBySlug(s.city) : null
  const going = [s.host, ...s.riders]
  const others = s.riders_count - going.length

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <p className="text-[15px] font-semibold text-muted">
        <Link href="/sessions" className="hover:underline">Sessions</Link>
        {city && <> / <Link href={`/cities/${city.slug}`} className="hover:underline">{city.name}</Link></>}
      </p>

      {s.sample && (
        <div className="mt-4 rounded-xl bg-asphalt px-5 py-4 text-flyer">
          <p className="font-bold">This is a sample session</p>
          <p className="mt-1 text-[15px] text-flyer/80">It shows how sessions work. The riders are made up. <Link href="/sessions/new" className="font-bold text-curb underline underline-offset-2">Post a real one</Link>.</p>
        </div>
      )}
      {s.cancelled && <p className="mt-4 rounded-xl bg-fire px-5 py-3 font-bold text-flyer">The host cancelled this session.</p>}

      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="flex items-start gap-5">
            <div className="flyer w-[92px] shrink-0 px-3 pb-3 pt-4 text-center leading-none" style={{ ['--tilt' as string]: '-2deg' }}>
              <span className="block text-[13px] font-extrabold text-fire">{d.relative ?? d.weekday}</span>
              <span className="mt-1 block font-display text-[38px] font-bold tracking-tight">{d.day}</span>
              <span className="mt-1 block text-[14px] font-semibold text-muted">{d.month}</span>
            </div>
            <div className="min-w-0">
              <h1 className="h-display text-[28px] sm:text-[40px]">{s.title}</h1>
              <p className="mt-3 text-[18px]">
                {placeHref ? <Link href={placeHref} className="prose-link font-semibold">{s.place_name}</Link> : <span className="font-semibold">{s.place_name}</span>}
                {city ? `, ${city.name}` : ''}
              </p>
              <p className="mt-1 text-[18px] font-bold">{d.weekdayLong} {d.day} {d.month}, {d.time}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {s.beginners_welcome && <span className="tag tag-welcome !text-[13px]">Beginners welcome</span>}
            <span className="tag tag-line !text-[13px]">{LEVEL_LABEL[s.level]}</span>
            <span className="tag tag-line !text-[13px]">{disciplineList(s.disciplines, 'label')}</span>
            {s.sample && <SampleTag />}
          </div>

          {s.notes && <p className="mt-6 max-w-2xl whitespace-pre-line text-[17px] leading-relaxed">{s.notes}</p>}

          <section className="mt-12">
            <h2 className="h-section text-[22px]">Who&apos;s going ({s.riders_count})</h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-4">
              {going.map((r, i) => (
                <li key={r.username}>
                  <Link href={`/riders/${r.username}`} className="flex items-center gap-2.5 hover:underline">
                    <Avatar name={riderName(r)} url={r.avatar_url} size={38} />
                    <span className="text-[15px] font-bold">{riderName(r)}{i === 0 && <span className="ml-1.5 font-semibold text-muted">host</span>}</span>
                  </Link>
                </li>
              ))}
              {others > 0 && <li className="self-center text-[15px] text-muted">and {others} more</li>}
            </ul>
          </section>

          <section className="mt-12 max-w-2xl">
            <h2 className="h-section text-[22px]">Comments</h2>
            <div className="mt-4">
              <Comments sessionId={id} userId={me?.id ?? null} comments={comments} gate={gate} hostUsername={s.host.username} myUsername={myUsername} />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {!s.cancelled && <div className="panel p-5"><ImIn sessionId={id} userId={me?.id ?? null} initialIn={amIn} gate={gate} isHost={isHost} /></div>}
          <div className="panel overflow-hidden">
            <div className="h-[240px]">
              <HubMap pins={[{ id: 'here', lat: s.lat, lng: s.lng, title: s.place_name, color: '#D4402A', big: true, square: true }]} center={{ lat: s.lat, lng: s.lng }} zoom={14} fitPins={false} label={`Map of ${s.place_name}`} />
            </div>
            <div className="space-y-2 p-4">
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} className="btn btn-dark w-full" rel="noopener">Directions</a>
              <ShareButton url={`${SITE}/sessions/${id}`} title={`${s.title} at ${s.place_name}`} label="Share this session" />
            </div>
          </div>
          <div className="space-y-2 px-1 text-[14px] text-muted">
            <p>Sessions are public and happen at public spots. Meet at the spot, not someone&apos;s home. <Link href="/guidelines" className="prose-link">How it works</Link></p>
            {isHost && !s.cancelled && <CancelSession sessionId={id} />}
            {!s.sample && <ReportLink what="session" url={`${SITE}/sessions/${id}`} />}
          </div>
        </aside>
      </div>
    </div>
  )
}
