/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deployment configuration
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
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
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 
      'http://localhost:3000')),
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // PWA and offline support
  swcMinify: true,

  // API routes configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
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
