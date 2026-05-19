import { PrismaClient } from '@prisma/client'
import { neonConfig, Pool as NeonPool } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool as PgPool } from 'pg'

function resolveDatabaseUrl(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_PUBLIC_URL,
    process.env.DIRECT_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ]
  const url = candidates.find((v) => typeof v === 'string' && v.trim().length > 0)
  return url ? url.trim() : ''
}

function isNeonUrl(connectionString: string): boolean {
  return /neon\.tech/i.test(connectionString)
}

function configureNeonWebSocket() {
  if (typeof WebSocket !== 'undefined') {
    neonConfig.webSocketConstructor = WebSocket
    return
  }
  // Node.js (local dev) — Neon serverless driver needs ws

  const ws = require('ws') as typeof WebSocket
  neonConfig.webSocketConstructor = ws
}

const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'
const isTest = process.env.NODE_ENV === 'test'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pgPool?: PgPool
}

function createMissingDatabaseProxy(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get() {
      const err = new Error(
        'Database connection string is not set. Set DATABASE_URL (Neon pooled URL) in your environment.'
      )
      err.name = 'MissingDatabaseUrlError'
      throw err
    },
  })
}

function createBuildStub(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_, prop) {
      if (prop === 'then') return undefined
      return new Proxy(() => Promise.resolve([]), {
        get(_, p) {
          if (p === 'then') return undefined
          return () => Promise.resolve([])
        },
      })
    },
  })
}

function createNeonClient(connectionString: string): PrismaClient {
  configureNeonWebSocket()
  const pool = new NeonPool({ connectionString })
  // Neon Pool type vs @prisma/adapter-neon typings differ by package version
  const adapter = new PrismaNeon(pool as never)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

function createPgClient(connectionString: string): PrismaClient {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new PgPool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }
  const adapter = new PrismaPg(globalForPrisma.pgPool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

function createPrismaClient(): PrismaClient {
  const connectionString = resolveDatabaseUrl()
  if (!connectionString) return createMissingDatabaseProxy()

  if (isNeonUrl(connectionString)) {
    return createNeonClient(connectionString)
  }
  return createPgClient(connectionString)
}

export const prisma: PrismaClient =
  isBuildTime || isTest ? createBuildStub() : (globalForPrisma.prisma ?? createPrismaClient())

if (process.env.NODE_ENV !== 'production' && !isBuildTime && !isTest) {
  globalForPrisma.prisma = prisma
}

export default prisma
