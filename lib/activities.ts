// Tags for a logged session (trips.activity_tags): anything on wheels. Older tags from the outdoor-sports days
// simply don't resolve and are hidden.

export interface Activity {
  id: string
  label: string
  emoji: string
  color: string
}

export const ACTIVITIES: Activity[] = [
  { id: 'street',     label: 'Street',        emoji: '🛹', color: '#B7794A' },
  { id: 'park',       label: 'Park',          emoji: '🏟️', color: '#3F5A42' },
  { id: 'bowl',       label: 'Bowl & tranny', emoji: '🥣', color: '#3C6E8F' },
  { id: 'vert',       label: 'Vert',          emoji: '📐', color: '#5B8A8F' },
  { id: 'diy',        label: 'DIY',           emoji: '🧱', color: '#A3271F' },
  { id: 'plaza',      label: 'Plaza',         emoji: '🏛️', color: '#8B5A2B' },
  { id: 'cruising',   label: 'Cruising',      emoji: '🛣️', color: '#D9A21B' },
  { id: 'downhill',   label: 'Downhill',      emoji: '⛰️', color: '#6B5B48' },
  { id: 'roller',     label: 'Roller skates', emoji: '🛼', color: '#C9962A' },
  { id: 'inline',     label: 'Inline',        emoji: '🛼', color: '#8FA37E' },
  { id: 'scooter',    label: 'Scooter',       emoji: '🛴', color: '#5A8AA8' },
  { id: 'bmx',        label: 'BMX',           emoji: '🚲', color: '#4C777C' },
  { id: 'pumptrack',  label: 'Pump track',    emoji: '〰️', color: '#E3B33F' },
  { id: 'dirtjumps',  label: 'Dirt jumps',    emoji: '🟫', color: '#8B5A2B' },
  { id: 'mtb',        label: 'Bike park / DH', emoji: '🚵', color: '#2E4631' },
  { id: 'filming',    label: 'Filming',       emoji: '🎥', color: '#4F4337' },
  { id: 'contest',    label: 'Contest / jam', emoji: '🏆', color: '#B8860B' },
]

export function getActivity(id: string): Activity | undefined {
  return ACTIVITIES.find(a => a.id === id)
}
