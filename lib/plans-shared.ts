// Plan helpers that run in the browser and on the server (lib/plans.ts holds the database reads).

export type PlanPart = 'morning' | 'afternoon' | 'evening' | 'time'

export const PART_LABEL: Record<Exclude<PlanPart, 'time'>, string> = { morning: 'morning', afternoon: 'afternoon', evening: 'evening' }

export function whenLabel(part: PlanPart, at: string | null): string {
  if (part !== 'time') return PART_LABEL[part]
  if (!at) return 'sometime'
  const [h, m] = at.split(':').map(Number)
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`
}

// The end of a day at the spot, as an instant (the spot's rough solar offset, like sessions use)
export function planExpiry(day: string, lng: number): string {
  const endLocal = Date.parse(`${day}T23:59:59Z`)
  return new Date(endLocal - Math.round(lng / 15) * 3600_000).toISOString()
}
