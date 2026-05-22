/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep dev-only formatters out of the server bundle if a dependency imports them
  serverExternalPackages: ['prettier'],

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Skip typecheck during Vercel builds; run `npm run lint` and `tsc` locally.
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
      {
        protocol: 'https',
        hostname: '**.bluepeacktechnologies.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    qualities: [75, 85],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_APP_ORIGIN ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'http://localhost:3000',
  },

  // Allow phone/LAN devices hitting the dev server (avoids RSC fetch failures from blocked origins)
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.56.1'],

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Fix ES Module and webpack issues (production build uses --webpack on Vercel)
  webpack: (config) => {
    config.externals = [
      ...(config.externals || []),
      'jsdom',
      'canvas',
      'bufferutil',
      'utf-8-validate',
    ]
    return config
  },

  // Security headers (also applied in middleware.js); shared source in lib/security/headers.js
  async headers() {
    const { nextConfigSecurityHeaders } = require('./lib/security/headers.js')
    const securityHeaders = nextConfigSecurityHeaders()

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },

  // Redirects for better SEO
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/login',
        permanent: false,
        missing: [
          {
            type: 'cookie',
            key: 'session-token',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
