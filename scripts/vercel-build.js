const { execSync } = require('child_process')

// Keep Node heap under the Vercel 8GB container (and any ~6GB soft caps).
// A 6144 ceiling lets the process grow until the builder SIGKILLs it.
// Peak RAM is lower when webpackBuildWorker is off on Vercel (see next.config.js).
const HEAP = '--max-old-space-size=4096'
if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = HEAP
} else if (!process.env.NODE_OPTIONS.includes('max-old-space-size')) {
  process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS} ${HEAP}`.trim()
} else {
  process.env.NODE_OPTIONS = process.env.NODE_OPTIONS.replace(/--max-old-space-size=\d+/g, HEAP)
}

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL
}

execSync('npx prisma generate', { stdio: 'inherit' })
// Webpack build avoids Turbopack EPIPE crashes on some Vercel builders (Next.js 16).
execSync('npx next build --webpack', { stdio: 'inherit' })
execSync('npx next-sitemap', { stdio: 'inherit' })
