export interface Activity {
  id: string
  label: string
  emoji: string
  color: string   // tailwind-compatible hex
}

export const ACTIVITIES: Activity[] = [
  { id: 'hiking',        label: 'Hiking',          emoji: '🥾', color: '#84cc16' },
  { id: 'backpacking',   label: 'Backpacking',      emoji: '🎒', color: '#65a30d' },
  { id: 'trail-running', label: 'Trail Running',    emoji: '🏃', color: '#f97316' },
  { id: 'rock-climbing', label: 'Rock Climbing',    emoji: '🧗', color: '#ef4444' },
  { id: 'mountain-bike', label: 'Mountain Biking',  emoji: '🚵', color: '#f59e0b' },
  { id: 'road-cycling',  label: 'Road Cycling',     emoji: '🚴', color: '#eab308' },
  { id: 'surfing',       label: 'Surfing',           emoji: '🏄', color: '#06b6d4' },
  { id: 'kitesurfing',   label: 'Kitesurfing',       emoji: '🪁', color: '#0ea5e9' },
  { id: 'kayaking',      label: 'Kayaking',          emoji: '🛶', color: '#3b82f6' },
  { id: 'skiing',        label: 'Skiing',            emoji: '⛷️', color: '#a5b4fc' },
  { id: 'snowboarding',  label: 'Snowboarding',     emoji: '🏂', color: '#818cf8' },
  { id: 'paragliding',   label: 'Paragliding',      emoji: '🪂', color: '#c084fc' },
  { id: 'scuba',         label: 'Scuba Diving',     emoji: '🤿', color: '#22d3ee' },
  { id: 'camping',       label: 'Camping',           emoji: '⛺', color: '#a3e635' },
  { id: 'road-trip',     label: 'Road Trip',         emoji: '🚗', color: '#fb923c' },
  { id: 'motorcycling',  label: 'Motorcycling',     emoji: '🏍️', color: '#f87171' },
  { id: 'photography',   label: 'Photography',      emoji: '📷', color: '#94a3b8' },
  { id: 'fishing',       label: 'Fishing',           emoji: '🎣', color: '#4ade80' },
]

export function getActivity(id: string): Activity | undefined {
  return ACTIVITIES.find(a => a.id === id)
}
