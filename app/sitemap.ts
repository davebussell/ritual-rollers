import type { MetadataRoute } from 'next'
import { SPOTS } from '@/lib/spots-index'
import { CITIES } from '@/lib/cities'
import { CREWS } from '@/lib/crews'
import { PARKS } from '@/lib/parks'
import { rideableIds } from '@/lib/lines'

const BASE = 'https://ritualrollers.com'

const PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/cities', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/spots', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/ride', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/sessions', priority: 0.8, changeFrequency: 'daily' },
  { path: '/crews', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/crews/add', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/guidelines', priority: 0.4, changeFrequency: 'monthly' },
]

// Sessions and rider pages are left out on purpose: sessions come and go, and rider pages are noindex.
// 3D rides are listed for named parks only (unnamed ones are noindex).
const NAMED = new Set(PARKS.filter(p => p.name).map(p => p.id))
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    ...PAGES.map(p => ({ url: `${BASE}${p.path}`, lastModified, changeFrequency: p.changeFrequency, priority: p.priority })),
    ...CITIES.map(c => ({ url: `${BASE}/cities/${c.slug}`, lastModified, changeFrequency: 'daily' as const, priority: c.metro ? 0.8 : 0.6 })),
    ...SPOTS.map(s => ({ url: `${BASE}/spots/${s.slug}`, lastModified, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...CREWS.map(c => ({ url: `${BASE}/crews/${c.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...rideableIds().filter(id => NAMED.has(id)).map(id => ({ url: `${BASE}/ride/${id}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.5 })),
  ]
}
