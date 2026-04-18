/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deployment configuration
  output: 'standalone',

  // Add these for Railway
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
        hostname: '**.railway.app',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    qualities: [75, 85],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.RAILWAY_PUBLIC_DOMAIN
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
          : 'http://localhost:3000'),
  },

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

  // API routes configuration
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    const headers = []

    // Keep CORS headers only here; security headers are centralized in proxy.js.
    if (!isProd) {
      headers.push({
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, x-school-id, x-school-subdomain',
          },
        ],
      })
    }

    return headers
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
