import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis

const connectionString = process.env.DATABASE_URL || ''
const ssl = (() => {
  if (!connectionString) return undefined
  try {
    const url = new URL(connectionString)
    const sslmode = (url.searchParams.get('sslmode') || '').toLowerCase()
    if (!sslmode) return undefined
    if (sslmode === 'disable') return undefined
    return { rejectUnauthorized: false }
  } catch {
    return undefined
  }
})()

const pool = new Pool({ connectionString, ...(ssl ? { ssl } : {}) })
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  })

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
