import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eventBySlug, athletesFor, DISCIPLINE_LABEL } from '@/lib/events'
import { COUNTRY_LABEL } from '@/lib/spots-index'
import { parksNear, parkName, PARK_KIND_META, parkById } from '@/lib/parks'
import { cityBySlug } from '@/lib/cities'
import ParkMapSection from '@/components/ParkMapSection'
import { linesFor } from '@/lib/lines'
import { AthleteCard } from '@/components/EventBits'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const e = eventBySlug(slug)
  if (!e) return { title: 'Event not found' }
  const title = `${e.name}, ${e.city}: results and course`
  const description = `${e.disciplines.map(d => DISCIPLINE_LABEL[d]).join(', ')} in ${e.city}, ${e.region}. ${e.about}`.slice(0, 300)
  return { title, description, alternates: { canonical: `/events/${slug}` }, openGraph: { title, description, url: `https://ritualrollers.com/events/${slug}`, type: 'website' } }
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const e = eventBySlug(slug)
  if (!e) notFound()
  const riders = athletesFor(slug)
  const hub = e.hub ? cityBySlug(e.hub) : null
  const park = e.park_id ? parkById(e.park_id) : undefined
  const nearby = parksNear(e.lat, e.lng, 15, 30).filter(p => p.id !== e.park_id).slice(0, 8)
  const years = [...new Set(e.results.map(r => r.year))]
  const linkLabel: Record<string, string> = { website: 'Website', results: 'Results', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube' }
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <p className="text-[15px] font-semibold text-muted"><Link href="/events" className="hover:underline">Races and contests</Link> / {hub ? <Link href={`/cities/${hub.slug}`} className="hover:underline">{e.city}</Link> : e.city}, {COUNTRY_LABEL[e.country]}</p>
      <h1 className="h-display mt-2 text-[32px] sm:text-[46px]">{e.name}</h1>
      <p className="mt-2 text-[17px] text-asphalt-2">{e.disciplines.map(d => DISCIPLINE_LABEL[d]).join(', ')}{e.place ? ` · ${e.place}` : ''}{e.years.length ? ` · ${e.years.join(', ')}` : ''}</p>
      {e.about && <p className="mt-5 max-w-3xl text-[18px] leading-relaxed">{e.about}</p>}

      <div className="mt-10 grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-14">
          <ParkMapSection
            parkId={park?.id ?? ''} parkKind={park?.kind ?? 'skate'} color={park ? PARK_KIND_META[park.kind].color : '#D4402A'}
            name={e.place || e.name} lat={e.lat} lng={e.lng} country={e.country} entry={park ? linesFor(park.id) : null}
            editUrl={`https://www.openstreetmap.org/edit#map=18/${e.lat}/${e.lng}`}
          />
          <section>
            <h2 className="h-section text-[22px] sm:text-[26px]">Results</h2>
            {e.results.length ? years.map(y => (
              <div key={y} className="mt-4">
                <h3 className="text-[17px] font-extrabold">{y}</h3>
                <div className="rows panel mt-2 px-4 sm:px-5">
                  {e.results.filter(r => r.year === y).map(r => (
                    <div key={r.class} className="py-3 text-[15px]">
                      <p className="font-bold">{r.class}</p>
                      <ol className="mt-1 text-asphalt-2">{r.podium.map((n, i) => <li key={n + i}>{i + 1}. {n}</li>)}</ol>
                      <a href={r.source} className="text-[12px] text-muted underline underline-offset-2" rel="noopener">source</a>
                    </div>
                  ))}
                </div>
              </div>
            )) : <p className="mt-3 text-[15px] text-muted">No results we could source yet.</p>}
          </section>
          {riders.length > 0 && (
            <section>
              <h2 className="h-section text-[22px] sm:text-[26px]">Riders who&apos;ve raced it</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{riders.map(a => <AthleteCard key={a.slug} a={a} />)}</div>
            </section>
          )}
        </div>
        <aside className="space-y-8">
          <dl className="rows panel px-4">
            {e.organiser && <div className="flex justify-between gap-4 py-2.5 text-[15px]"><dt className="text-muted">Run by</dt><dd className="text-right font-semibold">{e.organiser}</dd></div>}
            {Object.entries(e.links).map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2.5 text-[15px]"><dt className="text-muted">{linkLabel[k] ?? k}</dt><dd><a href={v} className="prose-link" rel="noopener">Visit</a></dd></div>)}
            <div className="flex justify-between gap-4 py-2.5 text-[15px]"><dt className="text-muted">Source</dt><dd><a href={e.source} className="prose-link" rel="noopener">{new URL(e.source).hostname.replace(/^www\./, '')}</a></dd></div>
          </dl>
          {nearby.length > 0 && (
            <section>
              <h2 className="h-section text-[18px]">Parks nearby</h2>
              <ul className="rows mt-2">{nearby.map(p => <li key={p.id}><Link href={`/parks/${p.id}`} className="flex justify-between gap-3 py-2.5 text-[15px] hover:underline"><span>{parkName(p)}</span><span className="text-[13px] text-muted">{Math.round(p.distanceKm)} km</span></Link></li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
