const { execSync } = require('child_process')

// Belt-and-suspenders for Vercel OOM (also set in vercel.json build.env).
if (!process.env.NODE_OPTIONS?.includes('max-old-space-size')) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--max-old-space-size=4096']
    .filter(Boolean)
    .join(' ')
}

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL
}

execSync('npx prisma generate', { stdio: 'inherit' })
// Webpack build avoids Turbopack EPIPE crashes on some Vercel builders (Next.js 16).
execSync('npx next build --webpack', { stdio: 'inherit' })
execSync('npx next-sitemap', { stdio: 'inherit' })
