import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  'postgresql://dummy:password@localhost:5432/db'

if (!globalForPrisma.pgPool) {
  globalForPrisma.pgPool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('railway.internal')
      ? false
      : process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
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
