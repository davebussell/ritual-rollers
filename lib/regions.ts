export const REGIONS = ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Oceania'] as const
export type Region = typeof REGIONS[number]

export function getRegion(lat: number, lng: number): Region | null {
  if (lat >= 15 && lat <= 85 && lng >= -170 && lng <= -50) return 'North America'
  if (lat >= -55 && lat < 15 && lng >= -90 && lng <= -30) return 'South America'
  if (lat >= 35 && lat <= 72 && lng >= -25 && lng <= 45) return 'Europe'
  if (lat >= -35 && lat <= 38 && lng >= -20 && lng <= 55) return 'Africa'
  if (lat >= 0 && lat <= 77 && lng > 45 && lng <= 180) return 'Asia'
  if (lat >= -50 && lat < 0 && lng >= 110 && lng <= 180) return 'Oceania'
  return null
}

export const REGION_COLORS: Record<Region, string> = {
  'North America': '#f97316',
  'South America': '#eab308',
  'Europe':        '#3b82f6',
  'Africa':        '#ef4444',
  'Asia':          '#a855f7',
  'Oceania':       '#10b981',
}

export const REGION_EMOJI: Record<Region, string> = {
  'North America': '🌎',
  'South America': '🌎',
  'Europe':        '🌍',
  'Africa':        '🌍',
  'Asia':          '🌏',
  'Oceania':       '🌏',
}
