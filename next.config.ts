import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/ride', destination: '/scout', permanent: true },
      { source: '/guide', destination: '/', permanent: true },
    ]
  },
}

export default nextConfig
