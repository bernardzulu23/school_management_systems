import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize Prisma')
  }

  const isDev = process.env.NODE_ENV !== 'production'

  let host = ''
  let sslmode = ''
  let sslParam = ''
  try {
    const u = new URL(connectionString)
    host = String(u.hostname || '').toLowerCase()
    sslmode = String(u.searchParams.get('sslmode') || '').toLowerCase()
    sslParam = String(u.searchParams.get('ssl') || '').toLowerCase()
  } catch {}

  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
  const envSslMode = String(process.env.PGSSLMODE || '').toLowerCase()
  const sslDisabled =
    sslmode === 'disable' || sslParam === '0' || sslParam === 'false' || envSslMode === 'disable'

  const sslEnabled =
    sslmode === 'require' ||
    sslmode === 'verify-ca' ||
    sslmode === 'verify-full' ||
    sslParam === '1' ||
    sslParam === 'true' ||
    envSslMode === 'require' ||
    envSslMode === 'verify-ca' ||
    envSslMode === 'verify-full'

  if (
    isDev &&
    sslEnabled &&
    String(process.env.ALLOW_SELF_SIGNED_CERTS || 'true').toLowerCase() !== 'false'
  ) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }

  const poolConfig = {
    connectionString,
    ssl: sslDisabled
      ? false
      : isDev
        ? sslEnabled
          ? { rejectUnauthorized: false }
          : isLocalHost
            ? false
            : { rejectUnauthorized: false }
        : undefined,
  }

  const adapter = new PrismaPg(poolConfig)
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
