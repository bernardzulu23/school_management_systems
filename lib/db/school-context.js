/**
 * PostgreSQL session variable for Row-Level Security (RLS).
 * Call `withSchoolContext` before tenant-scoped raw queries when RLS is enabled on Neon.
 *
 * Requires migration: prisma/migrations/20260528120000_enable_rls/migration.sql
 *
 * @example
 * const students = await withSchoolContext(schoolId, (tx) =>
 *   tx.student.findMany({ where: { classId } })
 * )
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

export { SETTING_KEY }
