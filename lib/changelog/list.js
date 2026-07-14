/**
 * Read API for ChangeLogEntry — list/filter only (never mutate).
 */

import { prisma } from '@/lib/prisma'
import { CHANGE_LOG_MODULES } from '@/lib/changelog/constants'

const MAX_TAKE = 200
const DEFAULT_TAKE = 50

/**
 * @param {{
 *   schoolId: string
 *   from?: Date|string|null
 *   to?: Date|string|null
 *   actorUserId?: string|null
 *   module?: string|null
 *   entityType?: string|null
 *   action?: string|null
 *   departmentId?: string|null
 *   q?: string|null
 *   take?: number
 *   cursor?: string|null
 * }} opts
 */
export async function listChangeLogEntries(opts) {
  const schoolId = String(opts.schoolId || '').trim()
  if (!schoolId) return { entries: [], nextCursor: null }

  const take = Math.min(MAX_TAKE, Math.max(1, Number(opts.take) || DEFAULT_TAKE))
  /** @type {import('@prisma/client').Prisma.ChangeLogEntryWhereInput} */
  const where = { schoolId }

  if (opts.actorUserId) where.actorUserId = String(opts.actorUserId)
  if (opts.module) where.module = String(opts.module).toLowerCase()
  if (opts.entityType) where.entityType = String(opts.entityType)
  if (opts.action) where.action = String(opts.action).toLowerCase()

  if (opts.from || opts.to) {
    where.createdAt = {}
    if (opts.from) where.createdAt.gte = new Date(opts.from)
    if (opts.to) where.createdAt.lte = new Date(opts.to)
  }

  if (opts.departmentId) {
    where.metadata = {
      path: ['departmentId'],
      equals: String(opts.departmentId),
    }
  }

  if (opts.q) {
    const q = String(opts.q).trim()
    if (q) {
      where.OR = [
        { summary: { contains: q, mode: 'insensitive' } },
        { entityLabel: { contains: q, mode: 'insensitive' } },
        { actorName: { contains: q, mode: 'insensitive' } },
        { actorLabel: { contains: q, mode: 'insensitive' } },
      ]
    }
  }

  const rows = await prisma.changeLogEntry.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(opts.cursor
      ? {
          cursor: { id: String(opts.cursor) },
          skip: 1,
        }
      : {}),
  })

  let nextCursor = null
  let page = rows
  if (rows.length > take) {
    page = rows.slice(0, take)
    nextCursor = page[page.length - 1]?.id || null
  }

  return { entries: page, nextCursor }
}

/** Distinct actors who have logged actions (for filter dropdowns). */
export async function listChangeLogActors(schoolId, { take = 100 } = {}) {
  const rows = await prisma.changeLogEntry.findMany({
    where: { schoolId: String(schoolId), actorUserId: { not: null } },
    distinct: ['actorUserId'],
    select: { actorUserId: true, actorName: true, actorRole: true, actorLabel: true },
    orderBy: { actorName: 'asc' },
    take,
  })
  return rows
}

export function knownModules() {
  return Object.values(CHANGE_LOG_MODULES)
}
