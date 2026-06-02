import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

/**
 * Base (unscoped) Prisma client — use only for platform routes, onboarding,
 * subdomain lookup, health checks, and audit tooling.
 * School-scoped routes should use getTenantClient(schoolId) from tenantClient.js.
 */

const globalForPrisma = globalThis

function createBasePrisma() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  const log =
    process.env.PRISMA_SLOW_QUERY_LOG === '1' || process.env.NODE_ENV === 'development'
      ? [
          { level: 'query', emit: 'event' },
          { level: 'warn', emit: 'stdout' },
          { level: 'error', emit: 'stdout' },
        ]
      : [{ level: 'error', emit: 'stdout' }]

  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter, log })
}

export const basePrisma = globalForPrisma.__basePrisma ?? createBasePrisma()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__basePrisma = basePrisma
}

if (typeof basePrisma.$on === 'function') {
  basePrisma.$on('query', (event) => {
    const ms = event.duration
    const template = String(event.query || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (ms >= 1000 && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import('@sentry/nextjs')
        .then((Sentry) => {
          Sentry.addBreadcrumb({
            category: 'prisma',
            message: 'Slow query',
            level: 'warning',
            data: { durationMs: ms, query: template.slice(0, 300) },
          })
        })
        .catch(() => {})
    }
    if (ms < 1000) return
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[prisma:slow] ${ms}ms ${template.slice(0, 200)}`)
    }
    if (ms >= 3000 && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import('@sentry/nextjs')
        .then((Sentry) => {
          Sentry.captureMessage('Slow query detected', {
            level: 'warning',
            extra: { durationMs: ms, query: template.slice(0, 500) },
          })
        })
        .catch(() => {})
    }
  })
}

export default basePrisma
