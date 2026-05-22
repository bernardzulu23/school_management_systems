const { execSync } = require('child_process')

// Neon on Vercel: migrations use DIRECT_URL; builds only need the var to exist for Prisma schema.
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL
}

execSync('prisma generate', { stdio: 'inherit' })
