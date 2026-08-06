/**
 * Prisma + Neon RLS session variable helpers.
 *
 * Per-request pattern (preferred for sensitive batches):
 *
 *   import { withTenantRequest } from '@/lib/tenant/context'
 *   export const GET = async (req) => {
 *     const user = await getAuthUser(req)
 *     const result = await withTenantRequest(req, user, async ({ schoolId, db, tx }) => {
 *       // tx has SET LOCAL app.current_school_id = schoolId
 *       // db is getTenantClient(schoolId) — Prisma where inject + ALS
 *       return tx.student.findMany({ take: 50 })
 *     })
 *     if (result instanceof Response) return result
 *     return NextResponse.json(result)
 *   }
 *
 * Direct GUC set on an existing transaction:
 *
 *   await setSchoolContext(tx, schoolId)
 *
 * Raw equivalent:
 *   SELECT set_config('app.current_school_id', $schoolId, true)  -- true = LOCAL to txn
 */
import prisma from '@/lib/prisma'

const SETTING_KEY = 'app.current_school_id'

/**
 * Run `fn` inside a transaction with `app.current_school_id` set for RLS policies.
 *
 * @template T
 * @param {string} schoolId
 * @param {(tx: import('@prisma/client').Prisma.TransactionClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withSchoolContext(schoolId, fn) {
  const sid = String(schoolId || '').trim()
  if (!sid) throw new Error('schoolId is required for withSchoolContext')

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config(${SETTING_KEY}, ${sid}, true)`
    return fn(tx)
  })
}

/**
 * Set school context on an existing transaction client (for nested use).
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} schoolId
 */
export async function setSchoolContext(tx, schoolId) {
  const sid = String(schoolId || '').trim()
  if (!sid) return
  await tx.$executeRaw`SELECT set_config(${SETTING_KEY}, ${sid}, true)`
}

/**
 * Clear session GUC (LOCAL to current transaction when is_local=true was used).
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
export async function clearSchoolContext(tx) {
  await tx.$executeRaw`SELECT set_config(${SETTING_KEY}, '', true)`
}

export { SETTING_KEY }
