/**
 * Server-side tenant context — schoolId/userId only from verified session (DB),
 * never from request body/query/cookies.
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withSchoolContext } from '@/lib/db/school-context'
import { bindRequestIdentity } from '@/lib/observability/requestContext'

/** @typedef {{ schoolId: string, userId: string, bypass?: boolean }} TenantAlsStore */

const tenantAls = new AsyncLocalStorage()

/**
 * @returns {TenantAlsStore | undefined}
 */
export function getTenantAlsStore() {
  return tenantAls.getStore()
}

/**
 * Run `fn` with ALS tenant store (used by Prisma extension + diagnostics).
 * @template T
 * @param {TenantAlsStore} store
 * @param {() => T | Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function runWithTenantAls(store, fn) {
  return tenantAls.run(store, fn)
}

/**
 * Platform / cron / auth paths that must touch tenant tables without a school session.
 * @template T
 * @param {() => T | Promise<T>} fn
 */
export async function runAsPlatform(fn) {
  return tenantAls.run({ schoolId: '', userId: '', bypass: true }, fn)
}

/**
 * Extract schoolId + userId from verified auth only.
 * @param {Request} request
 * @param {{ id?: string, schoolId?: string } | null | undefined} authUser — from getAuthUser / authMiddleware
 * @returns {Promise<
 *   | { ok: true, schoolId: string, userId: string, db: ReturnType<typeof getTenantClient> }
 *   | { ok: false, response: Response }
 * >}
 */
export async function getTenantContext(request, authUser) {
  const tenant = await resolveAuthenticatedSchoolId(request, authUser)
  if (!tenant.ok) {
    return { ok: false, response: tenant.response }
  }
  const schoolId = String(tenant.schoolId || '').trim()
  const userId = String(authUser?.id || '').trim()
  if (!schoolId || !userId) {
    return { ok: false, response: tenant.response }
  }
  return {
    ok: true,
    schoolId,
    userId,
    db: getTenantClient(schoolId),
  }
}

/**
 * Resolve tenant, set ALS + Postgres `app.current_school_id` (RLS), then run `fn`.
 * Prefer this for sensitive batches that should honor Neon RLS.
 *
 * @template T
 * @param {Request} request
 * @param {{ id?: string } | null | undefined} authUser
 * @param {(ctx: {
 *   schoolId: string,
 *   userId: string,
 *   db: ReturnType<typeof getTenantClient>,
 *   tx: import('@prisma/client').Prisma.TransactionClient
 * }) => Promise<T>} fn
 * @returns {Promise<T | Response>}
 */
export async function withTenantRequest(request, authUser, fn) {
  const ctx = await getTenantContext(request, authUser)
  if (!ctx.ok) return ctx.response

  bindRequestIdentity({ schoolId: ctx.schoolId, userId: ctx.userId })

  return runWithTenantAls({ schoolId: ctx.schoolId, userId: ctx.userId }, () =>
    withSchoolContext(ctx.schoolId, async (tx) =>
      fn({
        schoolId: ctx.schoolId,
        userId: ctx.userId,
        db: ctx.db,
        tx,
      })
    )
  )
}

export { tenantAls }
