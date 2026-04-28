import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis

const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

let prisma

if (isBuildTime) {
  prisma = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'then') return undefined
        return new Proxy(() => Promise.resolve([]), {
          get(_, p) {
            if (p === 'then') return undefined
            return () => Promise.resolve([])
          },
        })
      },
    }
  )
} else {
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
      const sslMode = String(u.searchParams.get('sslmode') || '').toLowerCase()
      const sslParam = String(u.searchParams.get('ssl') || '').toLowerCase()
      const requiresSsl =
        sslParam === 'true' ||
        sslMode === 'require' ||
        sslMode === 'verify-ca' ||
        sslMode === 'verify-full'
      if (host === 'localhost' || host === '127.0.0.1') return false
      if (host.includes('railway.internal'))
        return requiresSsl ? { rejectUnauthorized: false } : false
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
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }

  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg(globalForPrisma.pgPool)
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
  prisma = globalForPrisma.prisma
}

export { prisma }
export default prisma
