import type { Metadata } from 'next'
import Link from 'next/link'
import { RiderRow } from '@/components/Rows'
import { Empty } from '@/components/bits'
import { ridersFor } from '@/lib/riders'
import { CITIES, cityBySlug } from '@/lib/cities'
import { DISCIPLINES } from '@/lib/sports'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Riders looking for people to ride with',
  description: 'Skaters, roller skaters, BMX and bike riders who want company: new in town, starting late, or looking for a crew.',
  alternates: { canonical: '/riders' },
  robots: { index: false, follow: true },
}

function href(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][])
  const s = q.toString()
  return s ? `/riders?${s}` : '/riders'
}

export default async function RidersPage({ searchParams }: { searchParams: Promise<{ city?: string; ride?: string }> }) {
  const sp = await searchParams
  const city = sp.city ? cityBySlug(sp.city) : undefined
  const ride = DISCIPLINES.some(d => d.id === sp.ride) ? sp.ride : undefined
  const riders = await ridersFor({ city: city?.slug, discipline: ride }, 60)
  const base = { city: city?.slug, ride }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="h-display text-[34px] sm:text-[48px]">Riders</h1>
          <p className="mt-3 text-[17px] text-asphalt-2">
            People who&apos;d like company: new in town, starting late, or looking for a crew. Find someone who rides what you ride, then catch them at a session.
          </p>
        </div>
        <Link href="/me" className="btn btn-curb shrink-0">List yourself</Link>
      </div>

      <form action="/riders" className="mt-8 flex flex-wrap items-center gap-2">
        <label htmlFor="city" className="sr-only">City</label>
        <select id="city" name="city" defaultValue={city?.slug ?? ''} className="field !w-auto !rounded-full !py-2 !text-[15px] font-semibold">
          <option value="">Everywhere</option>
          {CITIES.filter(c => c.metro).sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        {ride && <input type="hidden" name="ride" value={ride} />}
        <button type="submit" className="btn btn-dark !py-2.5">Show</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={href({ ...base, ride: undefined })} className="chip" aria-current={!ride ? 'page' : undefined}>Any wheels</Link>
        {DISCIPLINES.map(d => <Link key={d.id} href={href({ ...base, ride: d.id })} className="chip" aria-current={ride === d.id ? 'page' : undefined}>{d.label}</Link>)}
      </div>

      <div className="mt-8">
        {riders.length ? (
          <div className="rows panel px-4 sm:px-5 md:columns-2 md:gap-10 md:[&>*]:break-inside-avoid">{riders.map(r => <RiderRow key={r.username} r={r} />)}</div>
        ) : (
          <Empty>Nobody listed{city ? ` in ${city.name}` : ''} yet. <Link href="/me" className="prose-link font-semibold">Be the first</Link>.</Empty>
        )}
        {riders.some(r => r.sample) && <p className="mt-4 text-[14px] text-muted">Riders tagged Sample are made up, to show how this works. They give way as real riders list themselves.</p>}
      </div>
    </div>
  )
}
