const { version: appVersion } = require('./package.json')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep dev-only formatters out of the server bundle if a dependency imports them
  serverExternalPackages: ['prettier'],

  transpilePackages: ['monaco-editor', '@monaco-editor/react'],

  // Production source maps are expensive during webpack builds on Vercel.
  productionBrowserSourceMaps: false,

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Lower peak RAM during static generation (125+ app routes).
    cpus: 1,
    workerThreads: false,
    staticGenerationMaxConcurrency: 1,
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
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || appVersion,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Zambian School Management System',
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
  webpack: (config, { isServer }) => {
    config.externals = [
      ...(config.externals || []),
      'jsdom',
      'canvas',
      'bufferutil',
      'utf-8-validate',
    ]

    if (!isServer) {
      config.module.rules.push({
        test: /\.ttf$/,
        type: 'asset/resource',
      })
    }

    return config
  },

  // Security headers (also applied in proxy.js); shared source in lib/security/headers.js
  async headers() {
    const { nextConfigSecurityHeaders } = require('./lib/security/headers.js')
    const securityHeaders = nextConfigSecurityHeaders()

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // API responses must never be cached by browsers/proxies — they carry
        // per-user, per-tenant data. (Route handlers also set no-store, this is
        // defence-in-depth at the edge.)
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
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

const { withSentryConfig } = require('@sentry/nextjs')

// Source map upload during build is very memory-heavy; opt in explicitly.
const sentryUploadSourceMaps = process.env.SENTRY_UPLOAD_SOURCEMAPS === '1'

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || 'zinks-0m',
  project: process.env.SENTRY_PROJECT || 'javascript-nextjs',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: {
    disable: !sentryUploadSourceMaps,
  },
  widenClientFileUpload: sentryUploadSourceMaps,
  hideSourceMaps: true,
  tunnelRoute: '/monitoring',
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
