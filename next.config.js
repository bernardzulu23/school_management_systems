/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deployment configuration
  output: 'standalone',

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  typescript: {
    // Enforce TS correctness to avoid shipping broken builds.
    ignoreBuildErrors: false,
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
        hostname: '**.pages.dev',
      },
      {
        protocol: 'https',
        hostname: '**.workers.dev',
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
      (process.env.CF_PAGES_URL ? `https://${process.env.CF_PAGES_URL}` : null) ||
      'http://localhost:3000',
  },

  // Allow phone/LAN devices hitting the dev server (avoids RSC fetch failures from blocked origins)
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.56.1'],

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Fix Turbopack and webpack conflict
  turbopack: {},

  // Fix ES Module and webpack issues
  webpack: (config) => {
    config.externals = [
      ...(config.externals || []),
      'jsdom',
      'canvas',
      'bufferutil',
      'utf-8-validate',
    ]

    // Split vendor bundles for better caching and smaller initial load
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    }

    return config
  },

  // Security headers (also applied in middleware.js); shared source in lib/security/headers.js
  async headers() {
    const { nextConfigSecurityHeaders } = await import('./lib/security/headers.js')
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

try {
  const { initOpenNextCloudflareForDev } = require('@opennextjs/cloudflare')
  initOpenNextCloudflareForDev()
} catch {
  // @opennextjs/cloudflare not installed yet — run npm install
}
