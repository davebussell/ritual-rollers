import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/ProfileForm'
import { getMe } from '@/lib/me'
import { CITIES, nearestCity } from '@/lib/cities'
import { SPOTS } from '@/lib/spots-index'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Your rider profile', robots: { index: false } }

export default async function MePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : null
  const me = await getMe()
  if (!me) redirect(`/auth/login?next=${encodeURIComponent(next ? `/me?next=${next}` : '/me')}`)

  const cities = [...CITIES].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ slug: c.slug, name: c.name, region: c.region }))
  const spots = SPOTS.map(s => ({ slug: s.slug, name: s.name, city: s.city, hub: nearestCity(s.lat, s.lng)?.slug ?? null }))
  const setUp = me.isRider

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
      <h1 className="h-display text-[32px] sm:text-[44px]">{setUp ? 'Your rider profile' : 'Set up your rider profile'}</h1>
      <p className="mt-3 text-[17px] text-asphalt-2">
        {setUp
          ? <>This is what people see on <Link href={`/riders/${me.profile?.username}`} className="prose-link">your page</Link>, next to sessions you post or join.</>
          : 'A name, what you ride and where. Then you can post sessions and say you’re in.'}
      </p>
      <div className="mt-8">
        <ProfileForm userId={me.id} profile={me.profile} cities={cities} spots={spots} next={next} />
      </div>
    </div>
  )
}
