import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis

const connectionString = process.env.DATABASE_URL
const poolConnectionString = (() => {
  if (!connectionString) return undefined
  try {
    const url = new URL(connectionString)
    const sslmode = (url.searchParams.get('sslmode') || '').toLowerCase()
    const compat = (url.searchParams.get('uselibpqcompat') || '').toLowerCase()
    if (!compat && (sslmode === 'require' || sslmode === 'prefer' || sslmode === 'verify-ca')) {
      url.searchParams.set('uselibpqcompat', 'true')
      return url.toString()
    }
    return connectionString
  } catch {
    return connectionString
  }
})()
const ssl = (() => {
  if (!poolConnectionString) return undefined
  try {
    const url = new URL(poolConnectionString)
    const isProd = process.env.NODE_ENV === 'production'
    const sslmode = (url.searchParams.get('sslmode') || '').toLowerCase()
    const sslFlag = (url.searchParams.get('ssl') || '').toLowerCase()
    if (!sslmode && !sslFlag) {
      const host = (url.hostname || '').toLowerCase()
      if (isProd && host && host !== 'localhost' && host !== '127.0.0.1') {
        return { rejectUnauthorized: false }
      }
      return undefined
    }
    if (sslmode === 'disable') return undefined
    if (sslFlag === 'false' || sslFlag === '0') return undefined
    return { rejectUnauthorized: false }
  } catch {
    return undefined
  }
})()

const pool = new Pool(
  poolConnectionString
    ? { connectionString: poolConnectionString, ...(ssl ? { ssl } : {}) }
    : undefined
)
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  })

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
