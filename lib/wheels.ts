// What you ride, picked once in the header: the rest of the site then shows only what fits.
// Stored in the `rr_wheel` cookie ('board' | 'skates' | 'bike' | 'all') so server-rendered pages can filter.
// Search engines carry no cookie, so they always see everything.

import type { ParkKind } from '@/lib/parks'

export type WheelId = 'board' | 'skates' | 'bike'

export interface Wheel {
  id: WheelId
  label: string            // in the picker
  long: string             // what it covers
  lower: string            // the same, mid-sentence
  disciplines: string[]    // lib/sports DISCIPLINES ids
  parkKinds: ParkKind[]    // which mapped parks to show
  verb: string             // "Find people to {verb} with"
  doing: string            // "{Doing} in Ottawa"
}

export const WHEELS: Wheel[] = [
  { id: 'board', label: 'Board', long: 'Skateboards and scooters', lower: 'skateboards and scooters', disciplines: ['skateboard', 'scooter'], parkKinds: ['skate', 'pump'], verb: 'skate', doing: 'Skating' },
  { id: 'skates', label: 'Skates', long: 'Roller and inline skates', lower: 'roller and inline skates', disciplines: ['roller', 'inline'], parkKinds: ['skate', 'pump'], verb: 'roll', doing: 'Rolling' },
  { id: 'bike', label: 'Bike', long: 'BMX and mountain bikes', lower: 'BMX and mountain bikes', disciplines: ['bmx', 'mtb'], parkKinds: ['pump', 'bmx', 'bike'], verb: 'ride', doing: 'Riding' },
]

export const WHEEL_COOKIE = 'rr_wheel'

export function wheelById(id: string | null | undefined): Wheel | null {
  return WHEELS.find(w => w.id === id) ?? null
}

// Does something ridden with these disciplines suit the chosen wheel? No wheel chosen: everything fits.
export function fits(disciplines: string[], wheel: Wheel | null): boolean {
  return !wheel || disciplines.some(d => wheel.disciplines.includes(d))
}

export function parkFits(kind: ParkKind, wheel: Wheel | null): boolean {
  return !wheel || wheel.parkKinds.includes(kind)
}
