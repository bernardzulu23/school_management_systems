const { execSync } = require('child_process')

// Keep Node heap under the Vercel ~8GB builder. Prefer a smaller V8 ceiling so
// native webpack/SWC RSS still fits — SIGKILL OOMs happen when RSS (not just
// JS heap) overflows the container.
const HEAP_MB = process.env.VERCEL ? '3072' : '4096'
const HEAP = `--max-old-space-size=${HEAP_MB}`
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
execSync('npx next build --webpack', {
  stdio: 'inherit',
  env: {
    ...process.env,
    // Extra belt: webpack persistent cache spikes peak RSS on small builders.
    NEXT_WEBPACK_CACHE: '0',
  },
})
execSync('npx next-sitemap', { stdio: 'inherit' })
