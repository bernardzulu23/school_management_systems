/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel deployment configuration
  images: {
    domains: [
      'localhost',
      '*.vercel.app',
      '*.supabase.co',
      'res.cloudinary.com'
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000',
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
        has: [
          {
            type: 'cookie',
            key: 'supabase-auth-token',
            value: undefined,
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
