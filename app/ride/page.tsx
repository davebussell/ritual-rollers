import type { Metadata } from 'next'
import Link from 'next/link'
import { PARKS, PARK_KIND_META, parkName, surfaceOfPark, type OsmPark } from '@/lib/parks'
import { linesFor, rideableIds, metres } from '@/lib/lines'
import { nearestCity } from '@/lib/cities'
import { spotByOsm, COUNTRY_LABEL } from '@/lib/spots-index'
import { getWheel } from '@/lib/wheel-server'
import { parkFits } from '@/lib/wheels'
import { WheelNote } from '@/components/WheelPicker'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ride real bike parks, pump tracks and BMX tracks in 3D',
  description: 'Hundreds of real trails and tracks across Canada, the US and Mexico, from OpenStreetMap, on the real ground. Pick one, pedal, pump and chase your best time.',
  alternates: { canonical: '/ride' },
}

interface Row { park: OsmPark; name: string; city: string; country: 'CA' | 'US' | 'MX'; n: number; m: number; named: number }

export default async function RideIndex() {
  const { wheel } = await getWheel()
  const byId = new Map(PARKS.map(p => [p.id, p]))
  const rows: Row[] = []
  for (const id of rideableIds()) {
    const park = byId.get(id)
    if (!park || !parkFits(park.kind, wheel)) continue
    // boards and skates ride hard pump tracks only
    if (wheel && wheel.id !== 'bike' && (park.kind !== 'pump' || surfaceOfPark(park) === 'dirt')) continue
    const e = linesFor(id)!
    const hub = nearestCity(park.lat, park.lng)
    rows.push({ park, name: spotByOsm(id)?.name ?? parkName(park), city: park.city ?? hub?.name ?? '', country: park.cc, n: e.n ?? 0, m: e.m ?? 0, named: e.t?.length ?? 0 })
  }
  // the best to start with: named parks with the most named trails
  const best = [...rows].filter(r => r.park.name).sort((a, b) => b.named - a.named || b.m - a.m).slice(0, 6)
  const countries = (['CA', 'US', 'MX'] as const).map(cc => ({
    cc, rows: rows.filter(r => r.country === cc).sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name)),
  })).filter(c => c.rows.length)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-[15px] font-semibold uppercase tracking-wide text-fire">New</p>
        <h1 className="h-display mt-1 text-[34px] sm:text-[48px]">Ride it in 3D</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-asphalt-2">
          {rows.length} real {wheel && wheel.id !== 'bike' ? 'pump tracks' : 'bike parks, pump tracks and BMX tracks'}, ridden first person on the ground they sit on.
          The lines are the ones mapped on OpenStreetMap and the hills come from elevation data. Pedal, pump the rollers, brake for the corners, and chase your best time.
        </p>
        {wheel && <div className="mt-3"><WheelNote label={wheel.lower} /></div>}
      </header>

      {best.length > 0 && (
        <section className="mt-10">
          <h2 className="h-section text-[22px] sm:text-[26px]">Start with these</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {best.map(r => (
              <Link key={r.park.id} href={`/ride/${r.park.id}`} className="panel group block p-4 hover:border-asphalt/30">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: PARK_KIND_META[r.park.kind].color }} aria-hidden="true" />
                  {PARK_KIND_META[r.park.kind].label} · {r.city}, {COUNTRY_LABEL[r.country]}
                </p>
                <p className="mt-1 text-[19px] font-bold group-hover:underline">{r.name}</p>
                <p className="mt-1 text-[14px] text-muted">{r.n} {r.park.kind === 'bike' ? 'trails' : r.n === 1 ? 'line' : 'lines'}, {metres(r.m)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {countries.map(c => (
        <section key={c.cc} className="mt-12">
          <h2 className="h-section text-[22px] sm:text-[26px]">{COUNTRY_LABEL[c.cc]} <span className="text-[16px] font-normal text-muted">({c.rows.length})</span></h2>
          <ul className="rows mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {c.rows.map(r => (
              <li key={r.park.id} className="py-0">
                <Link href={`/ride/${r.park.id}`} className="flex items-center gap-3 py-2.5 text-[15px] hover:underline">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: PARK_KIND_META[r.park.kind].color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate"><b>{r.name}</b>{r.city ? <span className="text-muted">, {r.city}</span> : null}</span>
                  <span className="shrink-0 text-[13px] text-muted">{metres(r.m)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-10 text-[13px] text-muted">
        Lines © <a href="https://www.openstreetmap.org/copyright" className="prose-link" rel="noopener">OpenStreetMap</a> contributors. Missing your local park?
        If its trails or track are drawn on OpenStreetMap, it shows up here after the next map refresh.
      </p>
    </div>
  )
}
