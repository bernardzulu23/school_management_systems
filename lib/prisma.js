import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL
if (!databaseUrl && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL environment variable is not set')
}

const resolvedDatabaseUrl = databaseUrl || 'postgresql://dummy:password@localhost:5432/db'

const ssl = (() => {
  try {
    const u = new URL(resolvedDatabaseUrl)
    const host = String(u.hostname || '').toLowerCase()
    if (!host) return false
    if (host === 'localhost' || host === '127.0.0.1') return false
    if (host.includes('railway.internal')) return false
    return { rejectUnauthorized: false }
  } catch {
    if (resolvedDatabaseUrl.includes('railway.internal')) return false
    if (/localhost|127\.0\.0\.1/i.test(resolvedDatabaseUrl)) return false
    return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }
})()

if (!globalForPrisma.pgPool) {
  globalForPrisma.pgPool = new Pool({
    connectionString: resolvedDatabaseUrl,
    ssl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })
}

const pool = globalForPrisma.pgPool

if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg(pool)
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma
export default prisma
