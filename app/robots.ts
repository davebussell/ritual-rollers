import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/auth/', '/api/', '/me', '/tag', '/near/'] }],
    sitemap: 'https://ritualrollers.com/sitemap.xml',
    host: 'https://ritualrollers.com',
  }
}
