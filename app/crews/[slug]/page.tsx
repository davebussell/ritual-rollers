import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CREW_KIND_LABEL, LINK_LABEL, crewBySlug, crewsNear } from '@/lib/crews'
import { cityBySlug } from '@/lib/cities'
import { SPOTS, spotsNear } from '@/lib/spots-index'
import { AUDIENCE_LABEL, KIND_META, disciplineList } from '@/lib/sports'
import { CrewRow, SpotRow } from '@/components/Rows'
import HubMap from '@/components/HubMap'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const c = crewBySlug(slug)
  if (!c) return { title: 'Crew not found' }
  const title = `${c.name}, ${c.city}`
  return { title, description: c.about.slice(0, 280), alternates: { canonical: `/crews/${slug}` } }
}

export default async function CrewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = crewBySlug(slug)
  if (!c) notFound()
  const hub = c.hub ? cityBySlug(c.hub) : null
  const home = c.home_spot ? SPOTS.find(s => s.name.toLowerCase() === c.home_spot!.toLowerCase() || (c.home_spot!.toLowerCase().includes(s.name.toLowerCase()) && s.city === c.city)) : undefined
  const who = c.audience.filter(a => a !== 'all').map(a => AUDIENCE_LABEL[a])
  const links = Object.entries(c.links).filter(([, url]) => url) as [string, string][]
  const nearbySpots = spotsNear(c.lat, c.lng, 25).slice(0, 6)
  const others = crewsNear(c.lat, c.lng, 40).filter(x => x.slug !== c.slug).slice(0, 5)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <p className="text-[15px] font-semibold text-muted">
        <Link href="/crews" className="hover:underline">Crews</Link>
        {hub && <> / <Link href={`/cities/${hub.slug}`} className="hover:underline">{hub.name}</Link></>}
      </p>
      <h1 className="h-display mt-2 max-w-3xl text-[32px] sm:text-[46px]">{c.name}</h1>
      <p className="mt-3 text-[17px] text-asphalt-2">{CREW_KIND_LABEL[c.kind]} in {c.city}, {c.region}</p>

      <div className="mt-10 grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          <section className="max-w-2xl">
            <p className="text-[18px] leading-relaxed">{c.about}</p>
            <dl className="rows mt-6 panel px-4">
              <div className="flex justify-between gap-4 py-2.5 text-[15px]"><dt className="text-muted">Rides</dt><dd className="text-right font-semibold">{disciplineList(c.disciplines, 'label')}</dd></div>
              <div className="flex justify-between gap-4 py-2.5 text-[15px]"><dt className="text-muted">For</dt><dd className="text-right font-semibold">{who.length ? who.join(', ') : 'Everyone'}</dd></div>
              {c.meets && <div className="flex justify-between gap-4 py-2.5 text-[15px]"><dt className="text-muted">When</dt><dd className="text-right font-semibold">{c.meets}</dd></div>}
              {c.home_spot && (
                <div className="flex justify-between gap-4 py-2.5 text-[15px]"><dt className="text-muted">Where</dt>
                  <dd className="text-right font-semibold">{home ? <Link href={`/spots/${home.slug}`} className="prose-link">{c.home_spot}</Link> : c.home_spot}</dd></div>
              )}
            </dl>
            <p className="mt-3 text-[14px] text-muted">
              Times and places change. Check the group&apos;s own page before you go. Last seen active: {c.active}. <a href={c.source} className="prose-link" rel="noopener">Source</a>.
            </p>
          </section>

          {others.length > 0 && (
            <section>
              <h2 className="h-section text-[22px]">Other crews nearby</h2>
              <div className="rows mt-3 panel px-4 sm:px-5">{others.map(o => <CrewRow key={o.slug} c={o} />)}</div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="panel p-5">
            <h2 className="text-[17px] font-extrabold">Find them</h2>
            <div className="mt-3 space-y-2">
              {links.map(([k, url], i) => (
                <a key={k} href={url} rel="noopener" className={`btn w-full ${i === 0 ? 'btn-curb' : 'btn-ghost'}`}>{LINK_LABEL[k] ?? k}</a>
              ))}
            </div>
          </div>
          <div className="panel h-[220px] overflow-hidden">
            <HubMap pins={[{ id: c.slug, lat: c.lat, lng: c.lng, title: c.home_spot ?? c.city, color: '#D4402A', big: true, square: true },
              ...nearbySpots.map(s => ({ id: s.slug, lat: s.lat, lng: s.lng, title: s.name, sub: KIND_META[s.kind].label, href: `/spots/${s.slug}`, linkLabel: 'See the spot', color: KIND_META[s.kind].color }))]}
              center={{ lat: c.lat, lng: c.lng }} zoom={c.coords === 'spot' ? 13 : 11} fitPins={false} label={`Map near ${c.name}`} />
          </div>
          {nearbySpots.length > 0 && (
            <section>
              <h2 className="h-section text-[18px]">Spots nearby</h2>
              <div className="rows mt-2">{nearbySpots.map(s => <SpotRow key={s.slug} s={s} distanceKm={s.distanceKm} />)}</div>
            </section>
          )}
          <p className="text-[14px] text-muted">Run this crew? <Link href={`/crews/add?update=${c.slug}`} className="prose-link font-semibold">Send us an update</Link>.</p>
        </aside>
      </div>
    </div>
  )
}
