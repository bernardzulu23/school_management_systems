import { defineConfig } from 'prisma/config'

function loadEnvFile(filePath) {
  try {
    const fs = require('fs')
    if (!fs.existsSync(filePath)) return
    const raw = String(fs.readFileSync(filePath, 'utf8') || '')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
      const idx = withoutExport.indexOf('=')
      if (idx <= 0) continue
      const key = withoutExport.slice(0, idx).trim()
      let value = withoutExport.slice(idx + 1).trim()
      if (!key) continue
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  } catch {}
}

loadEnvFile('.env')
loadEnvFile('.env.local')

if (!process.env.DATABASE_URL) {
  const fallbackUrl =
    process.env.DATABASE_PUBLIC_URL ||
    process.env.DIRECT_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL
  if (fallbackUrl) process.env.DATABASE_URL = fallbackUrl
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'node prisma/seed.js',
  },
  datasource: {
    // Neon: use DIRECT_URL for migrations; fallback to DATABASE_URL for local dev
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
})
