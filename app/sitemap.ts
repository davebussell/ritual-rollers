import type { MetadataRoute } from 'next'
import { FEATURED_SPOTS } from '@/lib/featured-spots'
import { SPOTS } from '@/lib/spots-index'

const BASE = 'https://ritualrollers.com'

const PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/finder', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/spots', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/crew', priority: 0.8, changeFrequency: 'daily' },
  { path: '/scout', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/explore', priority: 0.6, changeFrequency: 'daily' },
  { path: '/map', priority: 0.5, changeFrequency: 'weekly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const indexed = SPOTS.map(s => ({ url: `${BASE}/spots/${s.slug}`, lastModified, changeFrequency: 'daily' as const, priority: 0.8 }))
  const featured = FEATURED_SPOTS.map(s => ({ url: `${BASE}/scout/${s.slug}`, lastModified, changeFrequency: 'daily' as const, priority: 0.6 }))
  return [
    ...PAGES.map(p => ({ url: `${BASE}${p.path}`, lastModified, changeFrequency: p.changeFrequency, priority: p.priority })),
    ...indexed,
    ...featured,
  ]
}
