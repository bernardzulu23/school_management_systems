import { basePrisma } from '@/lib/prisma/client'

/** Models without schoolId — never auto-inject tenant filter. */
export const PLATFORM_MODELS = new Set(['School', 'PlatformAdmin', 'SchoolRegistration'])

const READ_OPS = new Set([
  'findMany',
  'findFirst',
  'findUnique',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
])

const WRITE_OPS = new Set(['create', 'createMany', 'upsert'])

/**
 * Returns a Prisma client extension scoped to one school.
 * Cheap to call — reuses the same connection pool via basePrisma.$extends.
 *
 * @param {string} schoolId
 */
export function getTenantClient(schoolId) {
  const tenantId = String(schoolId || '').trim()
  if (!tenantId) {
    throw new Error('getTenantClient requires a non-empty schoolId')
  }

  return basePrisma.$extends({
    name: 'tenantScope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (PLATFORM_MODELS.has(model)) {
            return query(args)
          }

          const next = { ...args }

          if (READ_OPS.has(operation)) {
            next.where = { ...(next.where || {}), schoolId: tenantId }
          } else if (WRITE_OPS.has(operation)) {
            if (operation === 'createMany' && Array.isArray(next.data)) {
              next.data = next.data.map((row) => ({ ...row, schoolId: tenantId }))
            } else if (next.data && typeof next.data === 'object' && !Array.isArray(next.data)) {
              next.data = { ...next.data, schoolId: tenantId }
            } else if (operation === 'upsert') {
              next.create = { ...(next.create || {}), schoolId: tenantId }
              next.update = { ...(next.update || {}) }
              next.where = { ...(next.where || {}), schoolId: tenantId }
            }
          }

          return query(next)
        },
      },
    },
  })
}
