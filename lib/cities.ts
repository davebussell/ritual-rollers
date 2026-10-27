// City hubs: one page per metro (and per town with a featured spot that no metro covers).
// Built by scripts/build-cities.mjs into data/cities.json.

import raw from '@/data/cities.json'
import { haversineKm } from '@/lib/geo'
import type { Country } from '@/lib/spots-index'

export interface City {
  slug: string
  name: string
  region: string
  country: Country
  lat: number
  lng: number
  metro: boolean
  spots: number          // featured spots within HUB_KM
}

export const HUB_KM = 40

export const CITIES: City[] = raw as unknown as City[]

export function cityBySlug(slug: string): City | undefined {
  return CITIES.find(c => c.slug === slug)
}

export function nearestCity(lat: number, lng: number, maxKm = HUB_KM): (City & { distanceKm: number }) | null {
  let best: (City & { distanceKm: number }) | null = null
  for (const c of CITIES) {
    const d = haversineKm(lat, lng, c.lat, c.lng)
    if (d <= maxKm && (!best || d < best.distanceKm)) best = { ...c, distanceKm: d }
  }
  return best
}

export function cityLabel(c: Pick<City, 'name' | 'region'>): string {
  return `${c.name}, ${c.region}`
}

// The metros people search for most, for the home page and empty states
export const POPULAR = ['toronto', 'montreal', 'vancouver', 'calgary', 'ottawa', 'new-york', 'los-angeles', 'san-francisco',
  'seattle', 'portland-oregon', 'chicago', 'denver', 'austin', 'philadelphia', 'mexico-city', 'guadalajara']
