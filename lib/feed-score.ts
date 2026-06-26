import { getRegion, type Region } from './regions'

export interface ScoredTrip {
  id: string
  owner_id: string
  title: string
  description: string | null
  is_public: boolean
  upvotes_count: number
  created_at: string
  profiles?: { username: string; avatar_url: string | null } | null
  trip_photos?: Array<{ storage_path: string; lat: number | null; lng: number | null; sequence_order: number }>
  collaborators?: Array<{ user_id: string; profiles: { username: string } | null }>
  country_code?: string | null
  region: Region | null
  isNovelRegion: boolean
  feedScore: number
  hoursAgo: number
}

export function scoreTrips(
  trips: ScoredTrip[],
  regionCounts: Record<string, number>,
): ScoredTrip[] {
  const now = Date.now()

  return trips
    .map(t => {
      const hoursAgo = (now - new Date(t.created_at).getTime()) / (1000 * 60 * 60)
      // Recency: exponential decay, half-life ~72h
      const recency = Math.exp(-hoursAgo / 72)
      // Engagement: log-scaled upvotes
      const engagement = Math.log1p(t.upvotes_count) / Math.log1p(100)
      // Novelty: reward regions with fewer than 5 trips
      const count = t.region ? (regionCounts[t.region] ?? 0) : 99
      const novelty = count < 5 ? 1 : count < 15 ? 0.4 : 0
      const feedScore = 0.35 * recency + 0.45 * engagement + 0.2 * novelty

      return { ...t, hoursAgo, feedScore }
    })
    .sort((a, b) => b.feedScore - a.feedScore)
}

export function formatTimeAgo(hoursAgo: number): string {
  if (hoursAgo < 1) return 'just now'
  if (hoursAgo < 24) return `${Math.floor(hoursAgo)}h ago`
  if (hoursAgo < 24 * 7) return `${Math.floor(hoursAgo / 24)}d ago`
  if (hoursAgo < 24 * 30) return `${Math.floor(hoursAgo / 168)}w ago`
  return new Date(Date.now() - hoursAgo * 3600000).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
}
