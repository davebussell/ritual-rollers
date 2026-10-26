// The wheels vocabulary: what you ride, what kind of spot it is, and what's there.

import type { Surface } from '@/lib/skate'

export { countryFlag, weekdayOf, clockOf, hourLabel, compassOf } from '@/lib/format'

export interface Discipline {
  id: string
  label: string
  short: string
  emoji: string
}

// Anything on wheels, ridden hard
export const DISCIPLINES: Discipline[] = [
  { id: 'skateboard', label: 'Skateboard', short: 'Skate', emoji: '🛹' },
  { id: 'roller', label: 'Roller skates', short: 'Roller', emoji: '🛼' },
  { id: 'inline', label: 'Inline skates', short: 'Inline', emoji: '🛼' },
  { id: 'scooter', label: 'Scooter', short: 'Scooter', emoji: '🛴' },
  { id: 'bmx', label: 'BMX', short: 'BMX', emoji: '🚲' },
  { id: 'mtb', label: 'Mountain bike', short: 'MTB', emoji: '🚵' },
]

export const DISCIPLINE_BY_ID: Record<string, Discipline> = Object.fromEntries(DISCIPLINES.map(d => [d.id, d]))

export type Kind = 'park' | 'plaza' | 'diy' | 'street' | 'bowl' | 'indoor' | 'pumptrack' | 'bikepark' | 'bmxtrack'

export const KIND_META: Record<Kind, { label: string; plural: string; color: string; blurb: string; surface: Surface }> = {
  park: { label: 'Skatepark', plural: 'Skateparks', color: '#3F5A42', blurb: 'built for it, usually free, usually concrete', surface: 'hard' },
  plaza: { label: 'Plaza', plural: 'Plazas', color: '#5B8A8F', blurb: 'street-style ledges, gaps and stairs, built on purpose', surface: 'hard' },
  diy: { label: 'DIY', plural: 'DIYs', color: '#A3271F', blurb: 'poured by skaters themselves; respect the locals', surface: 'hard' },
  street: { label: 'Street spot', plural: 'Street spots', color: '#B7794A', blurb: 'not built for it — know the rules and the risks', surface: 'hard' },
  bowl: { label: 'Bowl', plural: 'Bowls', color: '#3C6E8F', blurb: 'a stand-alone bowl or pool', surface: 'hard' },
  indoor: { label: 'Indoor park', plural: 'Indoor parks', color: '#6B5B48', blurb: 'roofed, usually paid; your rain and winter plan', surface: 'wood' },
  pumptrack: { label: 'Pump track', plural: 'Pump tracks', color: '#D9A21B', blurb: 'rollers and berms, no pedalling; every kind of wheel', surface: 'hard' },
  bikepark: { label: 'Bike park', plural: 'Bike parks', color: '#8B5A2B', blurb: 'dirt jumps, skills lines, slopestyle and downhill', surface: 'dirt' },
  bmxtrack: { label: 'BMX track', plural: 'BMX tracks', color: '#4C777C', blurb: 'start hill, rhythm sections, race nights', surface: 'dirt' },
}

export const KINDS = Object.keys(KIND_META) as Kind[]

// Which kinds belong to which crowd, for the filters
export const KIND_GROUPS: { id: 'skate' | 'bike'; label: string; kinds: Kind[] }[] = [
  { id: 'skate', label: 'Skate spots', kinds: ['park', 'plaza', 'diy', 'street', 'bowl', 'indoor'] },
  { id: 'bike', label: 'Bike spots', kinds: ['pumptrack', 'bikepark', 'bmxtrack'] },
]

export const FEATURES: { id: string; label: string; group: 'street' | 'tranny' | 'dirt' | 'other' }[] = [
  { id: 'street', label: 'Street', group: 'street' },
  { id: 'ledges', label: 'Ledges', group: 'street' },
  { id: 'rails', label: 'Rails', group: 'street' },
  { id: 'stairs', label: 'Stairs', group: 'street' },
  { id: 'gaps', label: 'Gaps', group: 'street' },
  { id: 'manual pads', label: 'Manual pads', group: 'street' },
  { id: 'banks', label: 'Banks', group: 'street' },
  { id: 'bowl', label: 'Bowl', group: 'tranny' },
  { id: 'transition', label: 'Transition', group: 'tranny' },
  { id: 'vert', label: 'Vert', group: 'tranny' },
  { id: 'mini ramp', label: 'Mini ramp', group: 'tranny' },
  { id: 'flow', label: 'Flow', group: 'tranny' },
  { id: 'snake run', label: 'Snake run', group: 'tranny' },
  { id: 'pool coping', label: 'Pool coping', group: 'tranny' },
  { id: 'full pipe', label: 'Full pipe', group: 'tranny' },
  { id: 'pump track', label: 'Pump track', group: 'dirt' },
  { id: 'dirt jumps', label: 'Dirt jumps', group: 'dirt' },
  { id: 'jump line', label: 'Jump line', group: 'dirt' },
  { id: 'slopestyle', label: 'Slopestyle', group: 'dirt' },
  { id: 'downhill', label: 'Downhill', group: 'dirt' },
  { id: 'freeride', label: 'Freeride', group: 'dirt' },
  { id: 'drops', label: 'Drops', group: 'dirt' },
  { id: 'berms', label: 'Berms', group: 'dirt' },
  { id: 'rollers', label: 'Rollers', group: 'dirt' },
  { id: 'skills', label: 'Skills', group: 'dirt' },
  { id: 'race track', label: 'Race track', group: 'dirt' },
  { id: 'start hill', label: 'Start hill', group: 'dirt' },
  { id: 'foam pit', label: 'Foam pit', group: 'other' },
  { id: 'resi ramp', label: 'Resi ramp', group: 'other' },
  { id: 'beginner area', label: 'Beginner area', group: 'other' },
]

export const FEATURE_LABEL: Record<string, string> = Object.fromEntries(FEATURES.map(f => [f.id, f.label]))

// "What do you like to ride?" → which spots fit
export type Style = 'street' | 'tranny' | 'dirt' | 'any'
export const STYLE_LABEL: Record<Style, string> = {
  street: 'Street — ledges, rails, stairs',
  tranny: 'Transition — bowls, ramps, vert',
  dirt: 'Dirt & pump — jumps, berms, tracks',
  any: 'A bit of everything',
}

export function styleFit(features: string[], kind: Kind, style: Style): boolean {
  if (style === 'any') return true
  const groups = new Set(features.map(f => FEATURES.find(x => x.id === f)?.group).filter(Boolean))
  if (style === 'dirt') return groups.has('dirt') || kind === 'pumptrack' || kind === 'bikepark' || kind === 'bmxtrack'
  if (style === 'tranny') return groups.has('tranny') || kind === 'bowl'
  return groups.has('street') || kind === 'plaza' || kind === 'street'
}
