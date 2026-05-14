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
      {
        protocol: 'https',
        hostname: '**.onrender.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    qualities: [75, 85],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.RENDER_EXTERNAL_URL && String(process.env.RENDER_EXTERNAL_URL).trim()) ||
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

    const csp =
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https://images.unsplash.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "connect-src 'self' https://*.railway.app https://*.onrender.com https://*.bluepeacktechnologies.com https://challenges.cloudflare.com http://localhost:*; " +
      "frame-src 'self' https://challenges.cloudflare.com; " +
      "object-src 'none'; base-uri 'self'; form-action 'self'"

    headers.push({
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    })

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
