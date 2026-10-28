import type { Metadata } from 'next'
import Link from 'next/link'
import CitySearch from '@/components/CitySearch'
import { RidingRow } from '@/components/Riding'
import { CITIES } from '@/lib/cities'
import { ridingEverywhere } from '@/lib/riding'
import { getMe } from '@/lib/me'
import { getWheel } from '@/lib/wheel-server'
import { WheelNote } from '@/components/WheelPicker'
import { Empty } from '@/components/bits'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Who’s riding where this week',
  description: 'The skateparks, pump tracks and bike parks riders have tagged for the coming days, across Canada, the US and Mexico.',
  alternates: { canonical: '/riding' },
}

export default async function RidingPage() {
  const { wheel } = await getWheel()
  const me = await getMe()
  const { places, on } = await ridingEverywhere(wheel, me?.id ?? null, 30)
  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6">
      <h1 className="h-display text-[34px] sm:text-[48px]">Who&apos;s riding where</h1>
      <p className="mt-3 max-w-2xl text-[17px] text-asphalt-2">
        Spots riders have tagged for the coming days. Everyone sees how many are heading there; your friends&apos; names show when you&apos;re signed in.
      </p>
      {wheel && <div className="mt-3"><WheelNote label={wheel.lower} /></div>}
      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <CitySearch cities={CITIES.map(c => ({ slug: c.slug, name: c.name, region: c.region }))} />
        <Link href="/tag" className="btn btn-curb">Tag a spot</Link>
      </div>
      <section className="mt-10">
        {places.length ? (
          <div className="rows panel px-4 sm:px-5">{places.map(p => <RidingRow key={p.key} p={p} />)}</div>
        ) : (
          <Empty>Nobody has tagged a spot yet this week. <Link href="/tag" className="prose-link font-semibold">Be the first</Link>.</Empty>
        )}
        {!on && <p className="mt-3 text-[13px] text-muted">Tagging opens soon; until then these are samples.</p>}
      </section>
    </div>
  )
}
