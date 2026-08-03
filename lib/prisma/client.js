import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

/**
 * Base (unscoped) Prisma client — use only for platform routes, onboarding,
 * subdomain lookup, health checks, and audit tooling.
 * School-scoped routes should use getTenantClient(schoolId) from tenantClient.js.
 *
 * Instantiation is lazy so `next build` can collect page data for API routes
 * without DATABASE_URL (Preview/Dependabot builds). First real use still
 * requires DATABASE_URL at runtime.
 */

const globalForPrisma = globalThis

function attachSlowQueryListener(client) {
  if (typeof client?.$on !== 'function') return
  if (globalForPrisma.__basePrismaSlowQueryBound) return
  globalForPrisma.__basePrismaSlowQueryBound = true

  client.$on('query', (event) => {
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
  const client = new PrismaClient({ adapter, log })
  attachSlowQueryListener(client)
  return client
}

function getBasePrisma() {
  if (!globalForPrisma.__basePrisma) {
    globalForPrisma.__basePrisma = createBasePrisma()
  }
  return globalForPrisma.__basePrisma
}

/**
 * Lazy proxy — importing this module must not require DATABASE_URL.
 * Property access creates the real PrismaClient (then caches on globalThis).
 */
export const basePrisma = new Proxy(/** @type {import('@prisma/client').PrismaClient} */ ({}), {
  get(_target, prop, _receiver) {
    if (prop === '__esModule') return false
    const client = getBasePrisma()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
  set(_target, prop, value) {
    const client = getBasePrisma()
    return Reflect.set(client, prop, value, client)
  },
  has(_target, prop) {
    return Reflect.has(getBasePrisma(), prop)
  },
})

export default basePrisma
