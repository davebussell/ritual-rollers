import type { MetadataRoute } from 'next'
import { SPOTS } from '@/lib/spots-index'
import { CITIES } from '@/lib/cities'
import { CREWS } from '@/lib/crews'
import { EVENTS, ATHLETES } from '@/lib/events'

const BASE = 'https://ritualrollers.com'

const PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/cities', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/spots', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/riding', priority: 0.7, changeFrequency: 'daily' },
  { path: '/events', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/crews', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/crews/add', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/guidelines', priority: 0.4, changeFrequency: 'monthly' },
]

// Rider pages are left out on purpose: they're noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    ...PAGES.map(p => ({ url: `${BASE}${p.path}`, lastModified, changeFrequency: p.changeFrequency, priority: p.priority })),
    ...CITIES.map(c => ({ url: `${BASE}/cities/${c.slug}`, lastModified, changeFrequency: 'daily' as const, priority: c.metro ? 0.8 : 0.6 })),
    ...SPOTS.map(s => ({ url: `${BASE}/spots/${s.slug}`, lastModified, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...CREWS.map(c => ({ url: `${BASE}/crews/${c.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...EVENTS.map(e => ({ url: `${BASE}/events/${e.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...ATHLETES.map(a => ({ url: `${BASE}/athletes/${a.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.5 })),
  ]
}
