import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis

const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'
const isTest = process.env.NODE_ENV === 'test'

function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DIRECT_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ]
  const url = candidates.find((v) => typeof v === 'string' && v.trim().length > 0)
  return url ? url.trim() : ''
}

function resolveSsl(connectionString) {
  try {
    const u = new URL(connectionString)
    const host = String(u.hostname || '').toLowerCase()
    if (!host) return false

    const sslMode = String(u.searchParams.get('sslmode') || '').toLowerCase()
    const sslParam = String(u.searchParams.get('ssl') || '').toLowerCase()
    const envSslMode = String(process.env.PGSSLMODE || '').toLowerCase()

    const requiresSsl =
      sslParam === 'true' ||
      sslParam === '1' ||
      sslMode === 'require' ||
      sslMode === 'verify-ca' ||
      sslMode === 'verify-full' ||
      envSslMode === 'require' ||
      envSslMode === 'verify-ca' ||
      envSslMode === 'verify-full'

    if (host === 'localhost' || host === '127.0.0.1') return false

    if (host.includes('railway.internal')) {
      return requiresSsl ? { rejectUnauthorized: false } : false
    }

    return requiresSsl || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false
  } catch {
    const raw = String(connectionString || '')
    if (/localhost|127\.0\.0\.1/i.test(raw)) return false
    if (/sslmode=require|ssl=true|ssl=1/i.test(raw)) return { rejectUnauthorized: false }
    return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }
}

let prisma

if (isBuildTime || isTest) {
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
  const connectionString = resolveDatabaseUrl()
  if (!connectionString && process.env.NODE_ENV === 'production') {
    prisma = new Proxy(
      {},
      {
        get() {
          const err = new Error('DATABASE_URL environment variable is not set')
          err.name = 'MissingDatabaseUrlError'
          throw err
        },
      }
    )
  } else {
    const resolvedConnectionString =
      connectionString || 'postgresql://dummy:password@localhost:5432/db'
    const ssl = resolveSsl(resolvedConnectionString)

    if (!globalForPrisma.pgPool) {
      globalForPrisma.pgPool = new Pool({
        connectionString: resolvedConnectionString,
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
}

export { prisma }
export default prisma
