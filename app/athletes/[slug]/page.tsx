import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { athleteBySlug, eventBySlug, DISCIPLINE_LABEL, placeLabel } from '@/lib/events'
import { COUNTRY_LABEL } from '@/lib/spots-index'
import { EventRow } from '@/components/EventBits'
import ReportLink from '@/components/ReportLink'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = athleteBySlug(slug)
  if (!a) return { title: 'Rider not found' }
  const title = `${a.name}: ${a.disciplines.map(d => DISCIPLINE_LABEL[d]).join(', ')} results`
  return { title, description: a.about.slice(0, 300), alternates: { canonical: `/athletes/${slug}` } }
}

export default async function AthletePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const a = athleteBySlug(slug)
  if (!a) notFound()
  const events = [...new Set(a.results.map(r => r.event_slug).filter((s): s is string => !!s))].map(eventBySlug).filter(Boolean)
  const linkLabel: Record<string, string> = { website: 'Website', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', federation: 'Federation profile' }
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <p className="text-[15px] font-semibold text-muted"><Link href="/events" className="hover:underline">Races and contests</Link> / Riders</p>
      <h1 className="h-display mt-2 text-[32px] sm:text-[46px]">{a.name}</h1>
      <p className="mt-2 text-[17px] text-asphalt-2">{a.disciplines.map(d => DISCIPLINE_LABEL[d]).join(', ')} · {a.home}, {COUNTRY_LABEL[a.country]}</p>
      {a.about && <p className="mt-5 text-[18px] leading-relaxed">{a.about}</p>}
      <section className="mt-10">
        <h2 className="h-section text-[22px]">Results</h2>
        <ul className="rows panel mt-3 px-4 sm:px-5">
          {a.results.map((r, i) => (
            <li key={i} className="flex items-start justify-between gap-4 py-3 text-[15px]">
              <span>
                <b>{placeLabel(r.place) || '—'}</b>{r.class ? ` · ${r.class}` : ''}
                <span className="block text-[14px] text-asphalt-2">{r.event_slug ? <Link href={`/events/${r.event_slug}`} className="prose-link">{r.event}</Link> : r.event}, {r.year}</span>
              </span>
              <a href={r.source} className="shrink-0 text-[12px] text-muted underline underline-offset-2" rel="noopener">source</a>
            </li>
          ))}
        </ul>
      </section>
      {events.length > 0 && (
        <section className="mt-10">
          <h2 className="h-section text-[22px]">Where they race</h2>
          <div className="rows panel mt-3 px-4 sm:px-5">{events.map(e => e && <EventRow key={e.slug} e={e} />)}</div>
        </section>
      )}
      {Object.keys(a.links).length > 0 && (
        <p className="mt-8 text-[15px]">{Object.entries(a.links).map(([k, v], i) => <span key={k}>{i > 0 && ' · '}<a href={v} className="prose-link" rel="noopener">{linkLabel[k] ?? k}</a></span>)}</p>
      )}
      <p className="mt-6 text-[13px] text-muted">From competition results and news coverage; every result links to where it was published.</p>
      <div className="mt-2"><ReportLink what="rider page" url={`https://ritualrollers.com/athletes/${a.slug}`} /></div>
    </div>
  )
}
