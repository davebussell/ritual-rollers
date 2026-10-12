import type { MetadataRoute } from 'next'
import { FEATURED_SPOTS } from '@/lib/featured-spots'

const BASE = 'https://ritualrollers.com'

const PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/scout', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/explore', priority: 0.8, changeFrequency: 'daily' },
  { path: '/map', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/feed', priority: 0.6, changeFrequency: 'daily' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const spots = FEATURED_SPOTS.map(s => ({
    url: `${BASE}/scout/${s.slug}`,
    lastModified,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))
  return [
    ...PAGES.map((p) => ({
      url: `${BASE}${p.path}`,
      lastModified,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...spots,
  ]
}
