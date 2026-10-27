import type { Metadata } from 'next'
import Link from 'next/link'
import { CrewRow } from '@/components/Rows'
import { Empty } from '@/components/bits'
import { CREWS } from '@/lib/crews'
import { CITIES, cityBySlug } from '@/lib/cities'
import { AUDIENCES, DISCIPLINES } from '@/lib/sports'
import { COUNTRY_LABEL, type Country } from '@/lib/spots-index'

export const metadata: Metadata = {
  title: 'Crews: skate nights, roller groups and bike clubs to ride with',
  description: 'Real groups you can show up to: skate crews, roller and inline nights, women’s and queer sessions, BMX and mountain bike clubs, across Canada, the US and Mexico.',
  alternates: { canonical: '/crews' },
}

function href(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][])
  const s = q.toString()
  return s ? `/crews?${s}` : '/crews'
}

export default async function CrewsPage({ searchParams }: { searchParams: Promise<{ city?: string; ride?: string; who?: string }> }) {
  const sp = await searchParams
  const city = sp.city ? cityBySlug(sp.city) : undefined
  const ride = DISCIPLINES.some(d => d.id === sp.ride) ? sp.ride : undefined
  const who = AUDIENCES.some(a => a.id === sp.who) ? sp.who : undefined
  const list = CREWS.filter(c =>
    (!city || c.hub === city.slug) && (!ride || c.disciplines.includes(ride)) && (!who || c.audience.includes(who)))
  const base = { city: city?.slug, ride, who }
  const hubsWithCrews = CITIES.filter(c => CREWS.some(x => x.hub === c.slug)).sort((a, b) => a.name.localeCompare(b.name))
  const countries: Country[] = ['CA', 'US', 'MX']

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="h-display text-[34px] sm:text-[48px]">Crews</h1>
          <p className="mt-3 text-[17px] text-asphalt-2">
            Groups that ride together and welcome new people: skate nights, roller and inline groups, women&apos;s and queer sessions,
            BMX and bike clubs. Each one links to the group&apos;s own page.
          </p>
        </div>
        <Link href="/crews/add" className="btn btn-ghost shrink-0">Add your crew</Link>
      </div>

      <form action="/crews" className="mt-8 flex flex-wrap items-center gap-2">
        <label htmlFor="city" className="sr-only">City</label>
        <select id="city" name="city" defaultValue={city?.slug ?? ''} className="field !w-auto !rounded-full !py-2 !text-[15px] font-semibold">
          <option value="">Every city</option>
          {hubsWithCrews.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        {ride && <input type="hidden" name="ride" value={ride} />}
        {who && <input type="hidden" name="who" value={who} />}
        <button type="submit" className="btn btn-dark !py-2.5">Show</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={href({ ...base, ride: undefined })} className="chip" aria-current={!ride ? 'page' : undefined}>Any wheels</Link>
        {DISCIPLINES.map(d => <Link key={d.id} href={href({ ...base, ride: d.id })} className="chip" aria-current={ride === d.id ? 'page' : undefined}>{d.label}</Link>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link href={href({ ...base, who: undefined })} className="chip" aria-current={!who ? 'page' : undefined}>Anyone</Link>
        {AUDIENCES.filter(a => a.id !== 'all').map(a => <Link key={a.id} href={href({ ...base, who: a.id })} className="chip" aria-current={who === a.id ? 'page' : undefined}>{a.label}</Link>)}
      </div>

      <div className="mt-10 space-y-12">
        {list.length === 0 && (
          <Empty>No crews match that yet. Run one, or know one? <Link href={`/crews/add${city ? `?city=${city.slug}` : ''}`} className="prose-link font-semibold">Add it</Link>.</Empty>
        )}
        {countries.map(cc => {
          const inCountry = list.filter(c => c.country === cc)
          if (!inCountry.length) return null
          const cities = [...new Set(inCountry.map(c => c.city))].sort()
          return (
            <section key={cc}>
              <h2 className="h-section text-[24px]">{COUNTRY_LABEL[cc]}</h2>
              <div className="mt-5 grid gap-x-10 gap-y-8 md:grid-cols-2">
                {cities.map(name => (
                  <div key={name}>
                    <h3 className="text-[15px] font-extrabold text-muted">{name}</h3>
                    <div className="rows">{inCountry.filter(c => c.city === name).map(c => <CrewRow key={c.slug} c={c} showCity={false} />)}</div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
