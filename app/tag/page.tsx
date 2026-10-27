import type { Metadata } from 'next'
import Link from 'next/link'
import CitySearch from '@/components/CitySearch'
import { CITIES, POPULAR, cityBySlug, nearestCity } from '@/lib/cities'
import { spotsNear, isFeaturedPark } from '@/lib/spots-index'
import { parksNear, parkName, PARK_KIND_META } from '@/lib/parks'
import { KIND_META } from '@/lib/sports'
import { geocodePlace, fromSlug } from '@/lib/geo'
import { getWheel } from '@/lib/wheel-server'
import { fits, parkFits } from '@/lib/wheels'
import { WheelNote } from '@/components/WheelPicker'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Tag a spot you’re riding', robots: { index: false } }

// Tag a spot: pick where you are, then the spot; its page opens with the "when" form ready.
export default async function TagPage({ searchParams }: { searchParams: Promise<{ city?: string; near?: string }> }) {
  const sp = await searchParams
  const { wheel } = await getWheel()
  let point: { lat: number; lng: number; label: string } | null = null
  if (sp.city) { const c = cityBySlug(sp.city); if (c) point = { lat: c.lat, lng: c.lng, label: c.name } }
  else if (sp.near) { const g = await geocodePlace(fromSlug(sp.near)); if (g) point = { lat: g.lat, lng: g.lng, label: g.label.split(',')[0] } }

  const cityOptions = CITIES.map(c => ({ slug: c.slug, name: c.name, region: c.region }))
  const spots = point ? spotsNear(point.lat, point.lng, 40).filter(s => fits(s.disciplines, wheel)).slice(0, 30) : []
  const parks = point ? parksNear(point.lat, point.lng, 40, 400).filter(p => !isFeaturedPark(p) && p.name && parkFits(p.kind, wheel)).slice(0, 60) : []
  const hub = point ? nearestCity(point.lat, point.lng) : null

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <h1 className="h-display text-[32px] sm:text-[44px]">Tag a spot you&apos;re riding</h1>
      <p className="mt-3 text-[17px] text-asphalt-2">
        Pick the spot and when. Everyone sees how many riders are heading there; only your friends see it&apos;s you.
      </p>
      {wheel && <div className="mt-3"><WheelNote label={wheel.lower} /></div>}
      <div className="mt-6"><CitySearch cities={cityOptions} big target="tag" /></div>
      {!point && (
        <div className="mt-4 flex flex-wrap gap-2">
          {POPULAR.map(cityBySlug).filter(Boolean).slice(0, 10).map(c => c && <Link key={c.slug} href={`/tag?city=${c.slug}`} className="chip">{c.name}</Link>)}
        </div>
      )}
      {(sp.city || sp.near) && !point && <p className="mt-6 text-[15px]">That place didn&apos;t come up. Try a city or town name.</p>}
      {point && (
        <section className="mt-10">
          <h2 className="h-section text-[22px]">Spots near {point.label}</h2>
          {spots.length + parks.length === 0 ? (
            <p className="mt-3 text-[15px]">Nothing mapped within 40 km for what you ride. {hub && <Link href={`/cities/${hub.slug}`} className="prose-link font-semibold">See {hub.name}</Link>}</p>
          ) : (
            <ul className="rows panel mt-3 px-4 sm:px-5">
              {spots.map(s => (
                <li key={s.slug}>
                  <Link href={`/spots/${s.slug}?plan=1#plans`} className="group flex items-center gap-3 py-3">
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: KIND_META[s.kind].color }} />
                    <span className="min-w-0 flex-1"><b className="group-hover:underline">{s.name}</b> <span className="text-[13px] text-muted">{KIND_META[s.kind].label}</span></span>
                    <span className="shrink-0 text-[13px] text-muted">{s.distanceKm < 1 ? '<1' : Math.round(s.distanceKm)} km</span>
                  </Link>
                </li>
              ))}
              {parks.map(p => (
                <li key={p.id}>
                  <Link href={`/parks/${p.id}?plan=1#plans`} className="group flex items-center gap-3 py-3">
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PARK_KIND_META[p.kind].color }} />
                    <span className="min-w-0 flex-1"><b className="group-hover:underline">{parkName(p)}</b> <span className="text-[13px] text-muted">{PARK_KIND_META[p.kind].label}</span></span>
                    <span className="shrink-0 text-[13px] text-muted">{p.distanceKm < 1 ? '<1' : Math.round(p.distanceKm)} km</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className="mt-8 text-[14px] text-muted">You need an account (16+) to tag a spot. <Link href="/guidelines" className="prose-link">How plans and friends work</Link></p>
    </div>
  )
}
