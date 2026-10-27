// Races and contests by place, and the riders who've won them (data/events.json, data/athletes.json, built by
// scripts/build-events.mjs from research/events/). Every result links to its source. Dave, 2026-10-27: feature riders
// like Kolby Parks (street luge) and the races down streets, organised by the fixed spots and past events in each place.

import ev from '@/data/events.json'
import ath from '@/data/athletes.json'
import { haversineKm } from '@/lib/geo'
import type { Wheel } from '@/lib/wheels'

export type EventDiscipline = 'downhill' | 'street-luge' | 'skateboard' | 'bmx' | 'inline' | 'roller' | 'scooter' | 'mtb'

export interface EventResult { year: number; class: string; podium: string[]; source: string }
export interface RideEvent {
  slug: string; name: string; disciplines: EventDiscipline[]; kind: string; place: string; city: string; region: string
  country: 'CA' | 'US' | 'MX'; lat: number; lng: number; coords: string; park_id: string | null; spot_slug: string | null
  years: number[]; organiser: string; about: string; results: EventResult[]; links: Record<string, string>; source: string; hub: string | null
}
export interface AthleteResult { year: number; event: string; event_slug: string | null; class: string; place: number | null; source: string }
export interface Athlete {
  slug: string; name: string; disciplines: EventDiscipline[]; home: string; country: 'CA' | 'US' | 'MX'
  lat?: number; lng?: number; hub?: string | null; about: string; results: AthleteResult[]; links: Record<string, string>; sources: string[]
}

export const EVENTS = (ev as unknown as { events: RideEvent[] }).events
export const ATHLETES = (ath as unknown as { athletes: Athlete[] }).athletes

export const DISCIPLINE_LABEL: Record<EventDiscipline, string> = {
  downhill: 'Downhill skateboard', 'street-luge': 'Street luge', skateboard: 'Skateboarding', bmx: 'BMX', inline: 'Inline',
  roller: 'Roller', scooter: 'Scooter', mtb: 'Mountain bike',
}
const WHEEL_OF: Record<EventDiscipline, 'board' | 'skates' | 'bike'> = {
  downhill: 'board', 'street-luge': 'board', skateboard: 'board', scooter: 'board', inline: 'skates', roller: 'skates', bmx: 'bike', mtb: 'bike',
}
export function eventFits(d: EventDiscipline[], wheel: Wheel | null): boolean {
  return !wheel || d.some(x => WHEEL_OF[x] === wheel.id)
}

export const eventBySlug = (slug: string) => EVENTS.find(e => e.slug === slug)
export const athleteBySlug = (slug: string) => ATHLETES.find(a => a.slug === slug)

export function eventsNear(lat: number, lng: number, km: number, wheel: Wheel | null) {
  return EVENTS.filter(e => eventFits(e.disciplines, wheel)).map(e => ({ ...e, distanceKm: haversineKm(lat, lng, e.lat, e.lng) }))
    .filter(e => e.distanceKm <= km).sort((a, b) => a.distanceKm - b.distanceKm)
}

export function eventsAt(place: { park?: string | null; spot?: string | null; lat: number; lng: number }) {
  return EVENTS.filter(e => (place.park && e.park_id === place.park) || (place.spot && e.spot_slug === place.spot)
    || haversineKm(place.lat, place.lng, e.lat, e.lng) < 0.4)
}

export function athletesFor(eventSlug: string) {
  return ATHLETES.filter(a => a.results.some(r => r.event_slug === eventSlug))
}

export function athletesNear(lat: number, lng: number, km: number, wheel: Wheel | null) {
  return ATHLETES.filter(a => a.lat !== undefined && a.lng !== undefined && eventFits(a.disciplines, wheel)
    && haversineKm(lat, lng, a.lat!, a.lng!) <= km)
}

export function placeLabel(n: number | null): string {
  if (!n) return ''
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
}
