import type { MetadataRoute } from 'next'

const BASE = 'https://ritualrollers.com'

const PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/ride', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/explore', priority: 0.8, changeFrequency: 'daily' },
  { path: '/map', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/guide', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/feed', priority: 0.6, changeFrequency: 'daily' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return PAGES.map((p) => ({
    url: `${BASE}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))
}
