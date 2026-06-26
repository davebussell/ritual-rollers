import type { Region } from '@/lib/regions'

const BADGES = [
  { id: 'first_trip', emoji: '🗺️', label: 'First Adventure', desc: 'Posted your first trip' },
  { id: 'globe_trotter', emoji: '🌍', label: 'Globe Trotter', desc: 'Visited 3+ regions' },
  { id: 'world_traveller', emoji: '✈️', label: 'World Traveller', desc: 'Visited 5+ regions' },
  { id: 'europe', emoji: '🏰', label: 'Euro Trails', desc: 'Explored Europe' },
  { id: 'asia', emoji: '🏯', label: 'Asia Bound', desc: 'Explored Asia' },
  { id: 'north_america', emoji: '🦅', label: 'North American', desc: 'Explored North America' },
  { id: 'south_america', emoji: '🌿', label: 'Jungle Runner', desc: 'Explored South America' },
  { id: 'africa', emoji: '🦁', label: 'Safari Spirit', desc: 'Explored Africa' },
  { id: 'oceania', emoji: '🏄', label: 'Pacific Rider', desc: 'Explored Oceania' },
  { id: 'surf', emoji: '🌊', label: 'Surf Chaser', desc: 'Tagged surf adventures' },
  { id: 'skate', emoji: '🛹', label: 'Skate Culture', desc: 'Tagged skate adventures' },
]

const REGION_BADGE_MAP: Record<Region, string> = {
  'North America': 'north_america',
  'South America': 'south_america',
  Europe: 'europe',
  Africa: 'africa',
  Asia: 'asia',
  Oceania: 'oceania',
}

interface ProfileBadgesProps {
  explorerRegions: Region[]
  isOwnProfile: boolean
}

export default function ProfileBadges({ explorerRegions, isOwnProfile }: ProfileBadgesProps) {
  const earned = new Set<string>()

  if (explorerRegions.length > 0) earned.add('first_trip')
  if (explorerRegions.length >= 3) earned.add('globe_trotter')
  if (explorerRegions.length >= 5) earned.add('world_traveller')
  explorerRegions.forEach(r => {
    const id = REGION_BADGE_MAP[r]
    if (id) earned.add(id)
  })

  if (earned.size === 0 && !isOwnProfile) {
    return <p className="text-sm text-zinc-600">No badges yet.</p>
  }

  return (
    <div className="flex flex-wrap gap-3">
      {BADGES.map(badge => {
        const unlocked = earned.has(badge.id)
        if (!unlocked && !isOwnProfile) return null
        return (
          <div key={badge.id} title={badge.desc}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center w-20 transition-all ${
              unlocked
                ? 'border-orange-500/30 bg-orange-500/10 text-white'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-700 opacity-40'
            }`}>
            <span className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>{badge.emoji}</span>
            <p className="text-[9px] font-bold uppercase tracking-wide leading-tight">{badge.label}</p>
          </div>
        )
      })}
    </div>
  )
}
