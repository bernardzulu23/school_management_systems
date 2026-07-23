const { execSync } = require('child_process')

// Belt-and-suspenders for Vercel OOM (also set in vercel.json build.env).
// Leave ~2GB headroom under the 8GB builder for the OS / build agent.
const HEAP = '--max-old-space-size=6144'
if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = HEAP
} else if (!process.env.NODE_OPTIONS.includes('max-old-space-size')) {
  process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS} ${HEAP}`.trim()
} else {
  // Upgrade older 4096 ceilings that still OOM on this app.
  process.env.NODE_OPTIONS = process.env.NODE_OPTIONS.replace(/--max-old-space-size=\d+/g, HEAP)
}

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL
}

execSync('npx prisma generate', { stdio: 'inherit' })
// Webpack build avoids Turbopack EPIPE crashes on some Vercel builders (Next.js 16).
execSync('npx next build --webpack', { stdio: 'inherit' })
execSync('npx next-sitemap', { stdio: 'inherit' })
