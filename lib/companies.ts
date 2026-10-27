// Wheels companies by area: park and track builders, makers, indoor parks and schools (data/companies.json, built by
// scripts/build-companies.mjs from research/companies/*.json; every entry has a source and recent activity).

import raw from '@/data/companies.json'
import { haversineKm } from '@/lib/geo'
import type { Wheel } from '@/lib/wheels'

export type CompanyKind = 'builder' | 'maker' | 'indoor' | 'school'

export interface Company {
  slug: string
  name: string
  kind: CompanyKind
  disciplines: string[]
  what: string
  city: string
  region: string
  country: 'CA' | 'US' | 'MX'
  lat: number
  lng: number
  coords: 'address' | 'city'
  about: string
  links: Partial<Record<'website' | 'instagram' | 'facebook' | 'youtube' | 'tiktok', string>>
  source: string
  active: string
  confidence: 'high' | 'medium'
  hub?: string
}

const data = raw as unknown as { companies: Company[] }
export const COMPANIES: Company[] = data.companies

export const COMPANY_KIND_LABEL: Record<CompanyKind, string> = {
  builder: 'Park and track builder',
  maker: 'Maker',
  indoor: 'Indoor park',
  school: 'Lessons and camps',
}

export function companiesNear(lat: number, lng: number, radiusKm: number, wheel: Wheel | null): (Company & { distanceKm: number })[] {
  return COMPANIES
    .filter(c => !wheel || c.disciplines.some(d => wheel.disciplines.includes(d)))
    .map(c => ({ ...c, distanceKm: haversineKm(lat, lng, c.lat, c.lng) }))
    .filter(c => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}
