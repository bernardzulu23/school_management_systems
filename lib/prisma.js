import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis

const isBuildTime =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  (!process.env.DATABASE_URL && !process.env.DIRECT_URL)

let prisma

if (isBuildTime) {
  // Return a no-op proxy during build so imports don't crash
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

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const ssl = (() => {
    try {
      const u = new URL(databaseUrl)
      const host = String(u.hostname || '').toLowerCase()
      if (!host || host === 'localhost' || host === '127.0.0.1') return false
      if (host.includes('railway.internal')) return false
      return { rejectUnauthorized: false }
    } catch {
      if (/localhost|127\.0\.0\.1|railway\.internal/i.test(databaseUrl)) return false
      return { rejectUnauthorized: false }
    }
  })()

  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({
      connectionString: databaseUrl,
      ssl,
      max: 10,
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
