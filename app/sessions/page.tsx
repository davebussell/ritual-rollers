import type { Metadata } from 'next'
import Link from 'next/link'
import { SessionRow } from '@/components/SessionBits'
import { Empty } from '@/components/bits'
import { upcomingSessions } from '@/lib/sessions'
import { CITIES, HUB_KM, cityBySlug } from '@/lib/cities'
import { DISCIPLINES } from '@/lib/sports'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Sessions: who’s riding where, and when',
  description: 'Upcoming skate, roller, scooter, BMX and bike sessions across Canada, the US and Mexico. Tap I’m in and show up.',
  alternates: { canonical: '/sessions' },
}

function href(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][])
  const s = q.toString()
  return s ? `/sessions?${s}` : '/sessions'
}

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ city?: string; ride?: string; beginners?: string }> }) {
  const sp = await searchParams
  const city = sp.city ? cityBySlug(sp.city) : undefined
  const ride = DISCIPLINES.some(d => d.id === sp.ride) ? sp.ride : undefined
  const beginners = sp.beginners === '1'
  const sessions = await upcomingSessions({
    near: city ? { lat: city.lat, lng: city.lng, km: HUB_KM } : undefined,
    discipline: ride, beginners, limit: 40,
  })
  const anySample = sessions.some(s => s.sample)
  const base = { city: city?.slug, ride, beginners: beginners ? '1' : undefined }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="h-display text-[34px] sm:text-[48px]">Sessions</h1>
          <p className="mt-3 text-[17px] text-asphalt-2">Someone posts where and when they&apos;re riding. You tap I&apos;m in and show up. Public spots, public sessions.</p>
        </div>
        <Link href="/sessions/new" className="btn btn-curb shrink-0">Post a session</Link>
      </div>

      <form action="/sessions" className="mt-8 flex flex-wrap items-center gap-2">
        <label htmlFor="city" className="sr-only">City</label>
        <select id="city" name="city" defaultValue={city?.slug ?? ''} className="field !w-auto !rounded-full !py-2 !text-[15px] font-semibold">
          <option value="">Everywhere</option>
          {CITIES.filter(c => c.metro).sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        {ride && <input type="hidden" name="ride" value={ride} />}
        {beginners && <input type="hidden" name="beginners" value="1" />}
        <button type="submit" className="btn btn-dark !py-2.5">Show</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={href({ ...base, ride: undefined })} className="chip" aria-current={!ride ? 'page' : undefined}>Any wheels</Link>
        {DISCIPLINES.map(d => <Link key={d.id} href={href({ ...base, ride: d.id })} className="chip" aria-current={ride === d.id ? 'page' : undefined}>{d.label}</Link>)}
        <Link href={href({ ...base, beginners: beginners ? undefined : '1' })} className="chip" aria-current={beginners ? 'page' : undefined}>Beginners welcome</Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {sessions.length ? (
            <div className="rows panel px-4 sm:px-5">{sessions.map(s => <SessionRow key={s.id} s={s} />)}</div>
          ) : (
            <Empty>No sessions match that yet{city ? ` in ${city.name}` : ''}. <Link href={`/sessions/new${city ? `?city=${city.slug}` : ''}`} className="prose-link font-semibold">Post the first one</Link>.</Empty>
          )}
          {anySample && <p className="mt-4 text-[14px] text-muted">Sessions tagged Sample show how it works. They give way as riders post real ones.</p>}
        </div>
        <aside className="panel h-fit space-y-3 p-5 text-[15px]">
          <h2 className="text-[17px] font-extrabold">How sessions work</h2>
          <p>Post the spot, the day and the time. Say who it&apos;s for and whether beginners are welcome.</p>
          <p>Riders tap I&apos;m in, ask questions in the comments, and meet you at the spot. No private messages.</p>
          <p>Accounts are for riders 16 and over. <Link href="/guidelines" className="prose-link">Read the guidelines</Link>.</p>
        </aside>
      </div>
    </div>
  )
}
