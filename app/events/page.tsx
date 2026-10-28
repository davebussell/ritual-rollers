import type { Metadata } from 'next'
import { EVENTS, ATHLETES, eventFits } from '@/lib/events'
import { COUNTRY_LABEL } from '@/lib/spots-index'
import { getWheel } from '@/lib/wheel-server'
import { WheelNote } from '@/components/WheelPicker'
import { EventRow, AthleteCard } from '@/components/EventBits'
import { Empty } from '@/components/bits'
import HubMap from '@/components/HubMap'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Races and contests, by place: downhill, street luge, skate, BMX',
  description: 'Downhill and street luge races, skate contests, BMX and bike park events across Canada, the US and Mexico, with sourced results and the riders who won them.',
  alternates: { canonical: '/events' },
}

export default async function EventsPage() {
  const { wheel } = await getWheel()
  const events = EVENTS.filter(e => eventFits(e.disciplines, wheel))
  const riders = ATHLETES.filter(a => eventFits(a.disciplines, wheel)).sort((a, b) => b.results.length - a.results.length)
  const pins = events.map(e => ({ id: e.slug, lat: e.lat, lng: e.lng, title: e.name, sub: e.city, href: `/events/${e.slug}`, linkLabel: 'See the event', color: '#D4402A', big: true }))
  const groups = (['CA', 'US', 'MX'] as const).map(cc => ({ cc, list: events.filter(e => e.country === cc).sort((a, b) => a.region.localeCompare(b.region) || a.city.localeCompare(b.city)) })).filter(g => g.list.length)
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h1 className="h-display text-[34px] sm:text-[48px]">Races and contests</h1>
      <p className="mt-3 max-w-2xl text-[17px] text-asphalt-2">
        Where people race down streets and compete at parks: downhill and street luge, skate contests, BMX and bike park events,
        each with the results we could source and the riders who won them.
      </p>
      {wheel && <div className="mt-3"><WheelNote label={wheel.lower} /></div>}
      {riders.length > 0 && (
        <section className="mt-10">
          <h2 className="h-section text-[22px] sm:text-[26px]">Riders to know</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{riders.slice(0, 9).map(a => <AthleteCard key={a.slug} a={a} />)}</div>
        </section>
      )}
      {events.length ? (
        <>
          <div className="panel mt-10 h-[320px] overflow-hidden sm:h-[420px]"><HubMap pins={pins} fitPins label="Map of races and contests" /></div>
          {groups.map(g => (
            <section key={g.cc} className="mt-10">
              <h2 className="h-section text-[22px] sm:text-[26px]">{COUNTRY_LABEL[g.cc]}</h2>
              <div className="rows panel mt-3 px-4 sm:px-5">{g.list.map(e => <EventRow key={e.slug} e={e} />)}</div>
            </section>
          ))}
        </>
      ) : (
        <div className="mt-10"><Empty>The race and contest list is being researched. Check back soon.</Empty></div>
      )}
    </div>
  )
}
