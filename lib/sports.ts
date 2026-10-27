// The wheels vocabulary: what you ride, what kind of spot it is, what's there, and how well you ride.

export interface Discipline {
  id: string
  label: string
  short: string
}

// Anything on wheels, ridden hard
export const DISCIPLINES: Discipline[] = [
  { id: 'skateboard', label: 'Skateboard', short: 'Skate' },
  { id: 'roller', label: 'Roller skates', short: 'Roller' },
  { id: 'inline', label: 'Inline skates', short: 'Inline' },
  { id: 'scooter', label: 'Scooter', short: 'Scooter' },
  { id: 'bmx', label: 'BMX', short: 'BMX' },
  { id: 'mtb', label: 'Mountain bike', short: 'MTB' },
]

export const DISCIPLINE_BY_ID: Record<string, Discipline> = Object.fromEntries(DISCIPLINES.map(d => [d.id, d]))

export function disciplineList(ids: string[], style: 'short' | 'label' = 'short'): string {
  return ids.map(id => DISCIPLINE_BY_ID[id]?.[style] ?? id).join(', ')
}

export type Surface = 'hard' | 'wood' | 'dirt'

export type Kind = 'park' | 'plaza' | 'diy' | 'street' | 'bowl' | 'indoor' | 'pumptrack' | 'bikepark' | 'bmxtrack'

// Colours are map-pin colours: distinct from each other and readable on the muted map tiles.
export const KIND_META: Record<Kind, { label: string; plural: string; color: string; blurb: string }> = {
  park: { label: 'Skatepark', plural: 'Skateparks', color: '#2D68B0', blurb: 'Built for it, usually free, usually concrete.' },
  plaza: { label: 'Plaza', plural: 'Plazas', color: '#6A4C93', blurb: 'Street-style ledges, gaps and stairs, built on purpose.' },
  diy: { label: 'DIY', plural: 'DIYs', color: '#D4402A', blurb: 'Poured by riders themselves. Respect the locals and help keep it alive.' },
  street: { label: 'Street spot', plural: 'Street spots', color: '#8A5A2B', blurb: 'Not built for it. Know the rules, and go easy on the place.' },
  bowl: { label: 'Bowl', plural: 'Bowls', color: '#1F7A8C', blurb: 'A stand-alone bowl or pool.' },
  indoor: { label: 'Indoor park', plural: 'Indoor parks', color: '#5B5F66', blurb: 'Roofed and usually paid: the plan for rain and winter.' },
  pumptrack: { label: 'Pump track', plural: 'Pump tracks', color: '#B98500', blurb: 'Rollers and berms, no pedalling. Every kind of wheel.' },
  bikepark: { label: 'Bike park', plural: 'Bike parks', color: '#3E7D3A', blurb: 'Dirt jumps, skills lines, slopestyle and downhill.' },
  bmxtrack: { label: 'BMX track', plural: 'BMX tracks', color: '#C2571A', blurb: 'Start hill, rhythm sections and race nights.' },
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
  street: 'Street: ledges, rails, stairs',
  tranny: 'Transition: bowls, ramps, vert',
  dirt: 'Dirt and pump: jumps, berms, tracks',
  any: 'A bit of everything',
}

export function styleFit(features: string[], kind: Kind, style: Style): boolean {
  if (style === 'any') return true
  const groups = new Set(features.map(f => FEATURES.find(x => x.id === f)?.group).filter(Boolean))
  if (style === 'dirt') return groups.has('dirt') || kind === 'pumptrack' || kind === 'bikepark' || kind === 'bmxtrack'
  if (style === 'tranny') return groups.has('tranny') || kind === 'bowl'
  return groups.has('street') || kind === 'plaza' || kind === 'street'
}

// How a rider describes themselves, and who a session is for
export type Level = 'new' | 'learning' | 'comfortable' | 'advanced'
export const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 'new', label: 'Brand new', hint: 'First weeks, or back after a long break' },
  { id: 'learning', label: 'Learning', hint: 'Rolling fine, working on the basics of the park' },
  { id: 'comfortable', label: 'Comfortable', hint: 'Most of the park, a few tricks or lines' },
  { id: 'advanced', label: 'Advanced', hint: 'Anything goes' },
]
export const LEVEL_LABEL: Record<Level | 'all', string> = {
  all: 'All levels', new: 'Brand new', learning: 'Learning', comfortable: 'Comfortable', advanced: 'Advanced',
}

// Who a crew is for
export const AUDIENCES: { id: string; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'beginners', label: 'Beginners' },
  { id: 'adults', label: 'Adults' },
  { id: 'women', label: 'Women' },
  { id: 'queer', label: 'Queer and trans' },
  { id: 'families', label: 'Families' },
  { id: 'kids', label: 'Kids' },
]
export const AUDIENCE_LABEL: Record<string, string> = Object.fromEntries(AUDIENCES.map(a => [a.id, a.label]))
