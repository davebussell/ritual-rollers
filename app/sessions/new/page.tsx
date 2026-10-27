import type { Metadata } from 'next'
import Link from 'next/link'
import SessionForm, { type PlaceOption } from '@/components/SessionForm'
import { getMe } from '@/lib/me'
import { sessionsReady } from '@/lib/sessions'
import { SPOTS, spotBySlug, spotsNear } from '@/lib/spots-index'
import { parkById, parkName } from '@/lib/parks'
import { cityBySlug, nearestCity } from '@/lib/cities'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Post a session', robots: { index: false } }

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-14 sm:px-6">
      <h1 className="h-display text-[32px] sm:text-[40px]">{title}</h1>
      <div className="mt-4 space-y-4 text-[17px] text-asphalt-2">{children}</div>
    </div>
  )
}

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ spot?: string; park?: string; city?: string }> }) {
  const sp = await searchParams
  const here = sp.spot ? `?spot=${sp.spot}` : sp.park ? `?park=${sp.park}` : sp.city ? `?city=${sp.city}` : ''
  const next = `/sessions/new${here}`
  const [me, ready] = await Promise.all([getMe(), sessionsReady()])

  if (!ready) {
    return (
      <Gate title="Posting opens soon">
        <p>Sessions are being switched on. In the meantime, see what a session looks like, or find a crew that already rides near you.</p>
        <p className="flex flex-wrap gap-3"><Link href="/sessions" className="btn btn-dark">See sessions</Link><Link href="/crews" className="btn btn-ghost">Find a crew</Link></p>
      </Gate>
    )
  }
  if (!me) {
    return (
      <Gate title="Sign in to post a session">
        <p>It takes an email address, no password. Accounts are for riders 16 and over.</p>
        <p><Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="btn btn-curb">Sign in</Link></p>
      </Gate>
    )
  }
  if (!me.isRider) {
    return (
      <Gate title="Set up your rider profile first">
        <p>Pick a name people will see, say what you ride, and confirm you&apos;re 16 or older. It takes a minute.</p>
        <p><Link href={`/me?next=${encodeURIComponent(next)}`} className="btn btn-curb">Set up your profile</Link></p>
      </Gate>
    )
  }

  const toOption = (s: (typeof SPOTS)[number]): PlaceOption => ({
    key: `spot:${s.slug}`, name: s.name, where: `${s.city}, ${s.region}`, lat: s.lat, lng: s.lng,
    city: nearestCity(s.lat, s.lng)?.slug ?? null, disciplines: s.disciplines,
  })
  const places = SPOTS.map(toOption)

  let initial: PlaceOption | null = null
  if (sp.spot) { const s = spotBySlug(sp.spot); if (s) initial = toOption(s) }
  if (!initial && sp.park) {
    const p = parkById(sp.park)
    if (p) {
      const hub = nearestCity(p.lat, p.lng)
      initial = {
        key: `park:${p.id}`, name: parkName(p), where: [p.city ?? hub?.name, p.region ?? hub?.region].filter(Boolean).join(', '),
        lat: p.lat, lng: p.lng, city: hub?.slug ?? null,
        disciplines: p.kind === 'skate' ? ['skateboard', 'roller', 'inline', 'scooter', 'bmx'] : p.kind === 'bmx' ? ['bmx'] : ['bmx', 'mtb', 'skateboard', 'roller', 'inline', 'scooter'],
      }
    }
  }
  // From a city page: put that city's spots first in the search
  if (!initial && sp.city) {
    const c = cityBySlug(sp.city)
    if (c) {
      const first = new Set(spotsNear(c.lat, c.lng, 40).map(s => s.slug))
      places.sort((a, b) => Number(first.has(b.key.slice(5))) - Number(first.has(a.key.slice(5))))
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
      <h1 className="h-display text-[32px] sm:text-[44px]">Post a session</h1>
      <p className="mt-3 text-[17px] text-asphalt-2">Say where and when you&apos;re riding. Riders nearby see it on the spot and city pages and can tap I&apos;m in.</p>
      <div className="mt-8">
        <SessionForm userId={me.id} places={places} initial={initial} myDisciplines={me.profile?.disciplines ?? []} />
      </div>
    </div>
  )
}
