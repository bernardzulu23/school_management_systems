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
        hostname: '**.railway.app',
      },
    ],
    formats: ['image/webp', 'image/avif'],
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
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      // Next inline scripts + Turbopack chunks
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Allow Google Fonts stylesheet
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Allow images from Unsplash + data urls
      "img-src 'self' data: https://images.unsplash.com https:",
      // Allow Google Fonts font files
      "font-src 'self' data: https://fonts.gstatic.com",
      // Allow API + same-origin fetches
      "connect-src 'self' https:",
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value:
              process.env.NEXT_PUBLIC_APP_ORIGIN ||
              process.env.NEXT_PUBLIC_APP_URL ||
              'http://localhost:3000',
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
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
