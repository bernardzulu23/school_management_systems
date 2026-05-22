const { execSync } = require('child_process')

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL
}

execSync('npx prisma generate', { stdio: 'inherit' })
// Webpack build avoids Turbopack EPIPE crashes on some Vercel builders (Next.js 16).
execSync('npx next build --webpack', { stdio: 'inherit' })
