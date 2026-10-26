import type { MetadataRoute } from 'next'
import { SPOTS } from '@/lib/spots-index'
import { toSlug } from '@/lib/geo'

const BASE = 'https://ritualrollers.com'

const PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/spots', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/finder', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/scout', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/crew', priority: 0.7, changeFrequency: 'daily' },
  { path: '/explore', priority: 0.6, changeFrequency: 'daily' },
  { path: '/map', priority: 0.5, changeFrequency: 'weekly' },
]

// City reads worth a direct link: the biggest skate and bike towns in each country
const CITIES = [
  'Portland, Oregon', 'Seattle', 'San Francisco', 'Los Angeles', 'San Diego', 'Denver', 'Austin, Texas', 'Chicago',
  'New York City', 'Philadelphia', 'Boston', 'Atlanta', 'Miami', 'Minneapolis',
  'Vancouver, BC', 'Calgary', 'Edmonton', 'Toronto', 'Ottawa', 'Montreal, Quebec', 'Quebec City', 'Halifax',
  'Mexico City', 'Guadalajara', 'Monterrey', 'Tijuana',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    ...PAGES.map(p => ({ url: `${BASE}${p.path}`, lastModified, changeFrequency: p.changeFrequency, priority: p.priority })),
    ...SPOTS.map(s => ({ url: `${BASE}/spots/${s.slug}`, lastModified, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...CITIES.map(c => ({ url: `${BASE}/scout/${toSlug(c)}`, lastModified, changeFrequency: 'daily' as const, priority: 0.6 })),
  ]
}
