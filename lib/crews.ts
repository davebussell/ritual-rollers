// Crews: real groups you can show up to — skate crews, roller nights, women's and queer sessions, BMX and
// MTB clubs, skate nonprofits — each researched with a source and recent activity.
// Built by scripts/build-crews.mjs from research/crews/*.json into data/crews.json.

import raw from '@/data/crews.json'
import { haversineKm } from '@/lib/geo'
import type { Country } from '@/lib/spots-index'

export type CrewKind = 'crew' | 'club' | 'skate-night' | 'nonprofit' | 'shop-session' | 'lessons'

export interface Crew {
  slug: string
  name: string
  kind: CrewKind
  disciplines: string[]
  audience: string[]
  city: string
  region: string
  country: Country
  lat: number
  lng: number
  coords: 'spot' | 'city'
  home_spot?: string
  meets?: string
  about: string
  links: Partial<Record<'instagram' | 'website' | 'facebook' | 'meetup' | 'discord' | 'tiktok' | 'youtube', string>>
  source: string
  active: string
  confidence: 'high' | 'medium'
  hub?: string            // city hub slug
}

export const CREW_KIND_LABEL: Record<CrewKind, string> = {
  crew: 'Crew',
  club: 'Club',
  'skate-night': 'Regular session',
  nonprofit: 'Nonprofit',
  'shop-session': 'Shop session',
  lessons: 'Lessons and sessions',
}

export const LINK_LABEL: Record<string, string> = {
  instagram: 'Instagram', website: 'Website', facebook: 'Facebook', meetup: 'Meetup', discord: 'Discord', tiktok: 'TikTok', youtube: 'YouTube',
}

export const CREWS: Crew[] = raw as unknown as Crew[]

export function crewBySlug(slug: string): Crew | undefined {
  return CREWS.find(c => c.slug === slug)
}

export function crewsNear(lat: number, lng: number, radiusKm: number): (Crew & { distanceKm: number })[] {
  return CREWS
    .map(c => ({ ...c, distanceKm: haversineKm(lat, lng, c.lat, c.lng) }))
    .filter(c => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

export function crewsInCity(hub: string): Crew[] {
  return CREWS.filter(c => c.hub === hub).sort((a, b) => a.name.localeCompare(b.name))
}

// The first public link, for "Find them on …"
export function primaryLink(c: Crew): { label: string; url: string } | null {
  for (const k of ['website', 'instagram', 'facebook', 'meetup', 'discord', 'tiktok', 'youtube'] as const) {
    const url = c.links[k]
    if (url) return { label: LINK_LABEL[k], url }
  }
  return null
}
