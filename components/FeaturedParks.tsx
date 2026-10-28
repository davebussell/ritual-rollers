// Cards for parks we have photos of people riding: the photo, the park, the city.

import Link from 'next/link'
import type { FeaturedPlace } from '@/lib/photos'
import { vintage } from '@/lib/photos'
import { COUNTRY_LABEL } from '@/lib/spots-index'

export default function FeaturedParks({ places }: { places: FeaturedPlace[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {places.map(f => (
        <Link key={f.key} href={f.href} className="group block">
          <div className="relative overflow-hidden rounded-xl bg-concrete-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.photo.thumb} alt={f.photo.caption || f.photo.title} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
            {vintage(f.photo) && <span className="absolute left-2 top-2 rounded bg-asphalt/85 px-1.5 py-0.5 text-[11px] font-bold uppercase text-flyer">{f.photo.year}</span>}
          </div>
          <p className="mt-2 text-[17px] font-bold leading-snug group-hover:underline">{f.name}</p>
          <p className="text-[14px] text-muted">{f.city}, {COUNTRY_LABEL[f.country]}{f.count > 1 ? ` · ${f.count} photos` : ''}</p>
          <p className="mt-0.5 text-[11px] text-muted">Photo: {f.photo.author} · {f.photo.licence}</p>
        </Link>
      ))}
    </div>
  )
}
