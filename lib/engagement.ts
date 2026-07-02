export interface EngagementStats {
  trips: number
  upvotes: number
  score: number
}

// Weighted engagement: each trip counts heavier than a single upvote
export function engagementScore(trips: number, upvotes: number): number {
  return trips * 10 + upvotes
}

// Normalized 0..1 heat with sqrt easing so mid-range values stay visible
export function heatT(score: number, maxScore: number): number {
  if (maxScore <= 0 || score <= 0) return 0
  return Math.sqrt(Math.min(score / maxScore, 1))
}

export function regionStats(trips: { region: string | null; upvotes_count: number }[]): Map<string, EngagementStats> {
  const stats = new Map<string, EngagementStats>()
  for (const t of trips) {
    if (!t.region) continue
    const s = stats.get(t.region) ?? { trips: 0, upvotes: 0, score: 0 }
    s.trips += 1
    s.upvotes += t.upvotes_count
    s.score = engagementScore(s.trips, s.upvotes)
    stats.set(t.region, s)
  }
  return stats
}

// Keyed by ISO alpha2 country code
export function countryStats(trips: { countryCode: string | null; upvotes_count: number }[]): Map<string, EngagementStats> {
  const stats = new Map<string, EngagementStats>()
  for (const t of trips) {
    if (!t.countryCode) continue
    const s = stats.get(t.countryCode) ?? { trips: 0, upvotes: 0, score: 0 }
    s.trips += 1
    s.upvotes += t.upvotes_count
    s.score = engagementScore(s.trips, s.upvotes)
    stats.set(t.countryCode, s)
  }
  return stats
}
