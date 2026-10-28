import type { NextConfig } from 'next'

// Old addresses from the conditions site (until 2026-10-27) and the outdoor-trips site before it.
// /ride and /ride/<id> were the 3D ride (2026-10-27, retired the same day): parks pages show the 3D map now.
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/scout', destination: '/cities', permanent: true },
      { source: '/scout/:slug', destination: '/near/:slug', permanent: true },
      { source: '/finder', destination: '/spots', permanent: true },
      { source: '/ride', destination: '/spots', permanent: true },
      { source: '/ride/:id', destination: '/parks/:id', permanent: true },
      { source: '/crew', destination: '/riding', permanent: true },
      { source: '/explore', destination: '/riding', permanent: true },
      { source: '/feed', destination: '/riding', permanent: true },
      // sessions were folded into plans ("tag a spot") on 2026-10-27
      { source: '/sessions', destination: '/riding', permanent: true },
      { source: '/sessions/new', destination: '/tag', permanent: true },
      { source: '/sessions/:id', destination: '/riding', permanent: true },
      { source: '/map', destination: '/spots?view=map', permanent: true },
      { source: '/trips/:path*', destination: '/riding', permanent: true },
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
