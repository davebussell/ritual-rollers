import type { NextConfig } from 'next'

// Old addresses from the conditions site (until 2026-10-27) and the outdoor-trips site before it.
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/scout', destination: '/cities', permanent: true },
      { source: '/scout/:slug', destination: '/near/:slug', permanent: true },
      { source: '/finder', destination: '/spots', permanent: true },
      { source: '/ride', destination: '/spots', permanent: true },
      { source: '/crew', destination: '/sessions', permanent: true },
      { source: '/explore', destination: '/sessions', permanent: true },
      { source: '/feed', destination: '/sessions', permanent: true },
      { source: '/map', destination: '/spots?view=map', permanent: true },
      { source: '/trips/:path*', destination: '/sessions', permanent: true },
      { source: '/import', destination: '/', permanent: true },
      { source: '/guide', destination: '/', permanent: true },
      { source: '/auth/signup', destination: '/auth/login', permanent: true },
      { source: '/profile/edit', destination: '/me', permanent: true },
      { source: '/profile/:username/:rest*', destination: '/riders/:username', permanent: true },
      { source: '/profile/:username', destination: '/riders/:username', permanent: true },
    ]
  },
}

export default nextConfig
