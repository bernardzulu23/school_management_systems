import { basePrisma } from '@/lib/prisma/client'
import { TENANT_SCOPED_MODELS } from '@/lib/tenant/scoped-models'
import { getTenantAlsStore } from '@/lib/tenant/context'
import { recordCrossTenantQueryAlert } from '@/lib/observability/alerts'

/** Models without schoolId — never auto-inject tenant filter. */
export const PLATFORM_MODELS = new Set([
  'School',
  'PlatformAdmin',
  'SchoolRegistration',
  'CurriculumRollout',
  'OldSyllabusDocument',
  'PastPaper',
])

const READ_OPS = new Set([
  'findMany',
  'findFirst',
  'findUnique',
  'findFirstOrThrow',
  'findUniqueOrThrow',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
])

const WRITE_OPS = new Set(['create', 'createMany', 'upsert'])

function assertTenantAllowed(model, tenantId) {
  if (PLATFORM_MODELS.has(model)) return
  if (!TENANT_SCOPED_MODELS.has(model) && !model) return
  // Unknown models with schoolId may still be scoped by callers; only enforce listed set.
  if (!TENANT_SCOPED_MODELS.has(model)) return
  if (!tenantId) {
    const als = getTenantAlsStore()
    if (als?.bypass) return
    throw new Error(
      `TENANT_CONTEXT_REQUIRED: ${model} query missing schoolId. Use getTenantContext() / getTenantClient(schoolId).`
    )
  }
}

function injectTenant(args, tenantId, operation, { model } = {}) {
  const next = { ...args }

  if (READ_OPS.has(operation)) {
    const incoming = next.where?.schoolId
    if (
      incoming != null &&
      String(incoming).trim() &&
      String(incoming).trim() !== String(tenantId)
    ) {
      recordCrossTenantQueryAlert({
        model,
        operation,
        expectedSchoolId: tenantId,
        attemptedSchoolId: String(incoming),
      })
    }
    next.where = { ...(next.where || {}), schoolId: tenantId }
  } else if (WRITE_OPS.has(operation)) {
    if (operation === 'createMany' && Array.isArray(next.data)) {
      next.data = next.data.map((row) => ({ ...row, schoolId: tenantId }))
    } else if (next.data && typeof next.data === 'object' && !Array.isArray(next.data)) {
      const incoming = next.data.schoolId
      if (
        incoming != null &&
        String(incoming).trim() &&
        String(incoming).trim() !== String(tenantId)
      ) {
        recordCrossTenantQueryAlert({
          model,
          operation,
          expectedSchoolId: tenantId,
          attemptedSchoolId: String(incoming),
        })
      }
      next.data = { ...next.data, schoolId: tenantId }
    } else if (operation === 'upsert') {
      next.create = { ...(next.create || {}), schoolId: tenantId }
      next.update = { ...(next.update || {}) }
      next.where = { ...(next.where || {}), schoolId: tenantId }
    }
  }

  return next
}

/**
 * Returns a Prisma client extension scoped to one school.
 * Injects schoolId on tenant-scoped models and refuses empty schoolId.
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

          assertTenantAllowed(model, tenantId)
          const next = injectTenant(args || {}, tenantId, operation, { model })
          return query(next)
        },
      },
    },
  })
}

/**
 * Optional: wrap basePrisma so ALS-backed tenant is injected when present.
 * Enable with ZSMS_ENFORCE_TENANT_ALS=1 after routes adopt getTenantContext / runAsPlatform.
 * Default off so auth/crons keep working on unscoped basePrisma.
 */
export function createAlsGuardedPrisma(client = basePrisma) {
  return client.$extends({
    name: 'tenantAlsGuard',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (PLATFORM_MODELS.has(model)) {
            return query(args)
          }
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args)
          }

          const store = getTenantAlsStore()
          if (store?.bypass) {
            return query(args)
          }
          const tenantId = String(store?.schoolId || '').trim()
          assertTenantAllowed(model, tenantId)
          return query(injectTenant(args || {}, tenantId, operation, { model }))
        },
      },
    },
  })
}
