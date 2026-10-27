import type { Metadata } from 'next'
import Link from 'next/link'
import CitySearch from '@/components/CitySearch'
import { CITIES } from '@/lib/cities'
import { COUNTRY_LABEL, type Country } from '@/lib/spots-index'

export const metadata: Metadata = {
  title: 'Cities: where to skate, roll and ride',
  description: 'Spots, sessions and crews in every city we cover across Canada, the US and Mexico.',
  alternates: { canonical: '/cities' },
}

export default function CitiesPage() {
  const options = CITIES.map(c => ({ slug: c.slug, name: c.name, region: c.region }))
  const countries: Country[] = ['CA', 'US', 'MX']
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h1 className="h-display text-[34px] sm:text-[48px]">Cities</h1>
      <p className="mt-3 max-w-2xl text-[17px] text-asphalt-2">
        Every city has its spots, its crews and the sessions people post. Not listed? Search your town and we&apos;ll show what&apos;s around it.
      </p>
      <div className="mt-6 max-w-xl"><CitySearch cities={options} /></div>

      {countries.map(cc => {
        const list = CITIES.filter(c => c.country === cc)
        const regions = [...new Set(list.map(c => c.region))].sort()
        return (
          <section key={cc} className="mt-14">
            <h2 className="h-section text-[24px]">{COUNTRY_LABEL[cc]}</h2>
            <div className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {regions.map(r => (
                <div key={r}>
                  <h3 className="text-[15px] font-extrabold">{r}</h3>
                  <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    {list.filter(c => c.region === r).sort((a, b) => Number(b.metro) - Number(a.metro) || a.name.localeCompare(b.name)).map(c => (
                      <li key={c.slug}><Link href={`/cities/${c.slug}`} className={`text-[15px] hover:underline ${c.metro ? 'font-semibold text-pool' : 'text-asphalt-2'}`}>{c.name}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
