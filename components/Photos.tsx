// Photos of people riding this park: openly licensed ones (credited), then riders' own. Riders can add theirs.

import Link from 'next/link'
import { getMe } from '@/lib/me'
import { photosFor, riderPhotos, vintage, type LicensedPhoto } from '@/lib/photos'
import PhotoUpload, { RemovePhoto } from '@/components/PhotoUpload'
import ReportLink from '@/components/ReportLink'

export function Credit({ p, className = '' }: { p: LicensedPhoto; className?: string }) {
  return (
    <p className={`text-[12px] leading-snug text-muted ${className}`}>
      {p.year ? `${p.year} · ` : ''}Photo: {p.author} · <a href={p.licence_url} className="underline underline-offset-2" rel="noopener license">{p.licence}</a> ·{' '}
      <a href={p.page} className="underline underline-offset-2" rel="noopener">source</a>
    </p>
  )
}

// except: the photo already shown as the page banner, so the gallery doesn't repeat it
export default async function Photos({ place, name, next, except }: { place: { park?: string | null; spot?: string | null; lat: number; lng: number; city?: string | null }; name: string; next: string; except?: string }) {
  const me = await getMe()
  const licensed = photosFor(place).filter(p => p.id !== except)
  const mine = await riderPhotos(place, me?.id ?? null)
  const riders = mine ?? []
  if (!licensed.length && !riders.length && mine === null) return null
  const fromBanner = !!except && !licensed.length && !riders.length

  return (
    <section id="photos" className="scroll-mt-24">
      <h2 className="h-section text-[22px] sm:text-[26px]">Riding {name}</h2>
      {licensed.length + riders.length === 0 && (
        <p className="mt-2 text-[15px] text-asphalt-2">{fromBanner ? 'The photo at the top is the only one so far. Got one you took? Add it.' : 'No photos of people riding here yet. Got one you took? Add it.'}</p>
      )}
      {licensed.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {licensed.map((p, i) => (
            <figure key={p.id} className={i === 0 && licensed.length % 2 === 1 ? 'sm:col-span-2' : ''}>
              <a href={p.src} className="block overflow-hidden rounded-lg bg-concrete-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i === 0 ? p.src : p.thumb} alt={p.caption || p.title} width={p.width} height={p.height} loading={i === 0 ? 'eager' : 'lazy'}
                  className="h-auto w-full object-cover" style={{ aspectRatio: `${p.width} / ${p.height}` }} />
              </a>
              <figcaption className="mt-1.5">
                <p className="text-[14px] text-asphalt-2">{p.caption}{vintage(p) ? <span className="ml-1.5 rounded bg-asphalt px-1.5 py-0.5 text-[11px] font-bold uppercase text-flyer">Vintage</span> : null}</p>
                <Credit p={p} />
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {riders.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {riders.map(p => (
            <figure key={p.id}>
              <a href={p.url} className="block overflow-hidden rounded-lg bg-concrete-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption ?? `A rider at ${name}`} loading="lazy" className="aspect-[4/3] h-auto w-full object-cover" />
              </a>
              <figcaption className="mt-1 text-[12px] text-muted">
                {p.caption && <span className="block text-[13px] text-asphalt-2">{p.caption}</span>}
                by <Link href={`/riders/${p.rider.username}`} className="underline underline-offset-2">{p.rider.display_name ?? p.rider.username}</Link>
                {p.mine ? <> · <RemovePhoto id={p.id} /></> : <> · <ReportLink what="photo" url={`https://ritualrollers.com${next}#photos`} compact /></>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {mine !== null && (
        <div className="mt-5">
          {me?.isRider ? (
            <PhotoUpload meId={me.id} place={{ spot: place.spot ?? null, park: place.park ?? null, name }} />
          ) : me ? (
            <p className="text-[15px]"><Link href={`/me?next=${encodeURIComponent(next)}`} className="prose-link font-semibold">Finish your rider profile</Link> (16+) to add a photo.</p>
          ) : (
            <p className="text-[15px]"><Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="prose-link font-semibold">Sign in</Link> to add a photo you took here.</p>
          )}
        </div>
      )}
    </section>
  )
}
