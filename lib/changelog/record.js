/**
 * Append-only change log writer.
 * Never exposes update/delete. Failures are logged but do not break primary ops.
 */

import { prisma } from '@/lib/prisma'
import {
  CHANGE_LOG_ACTIONS,
  CHANGE_LOG_MODULES,
  buildActorLabel,
  formatActorRole,
} from '@/lib/changelog/constants'

/**
 * @param {object} input
 * @param {string} input.schoolId
 * @param {{ userId?: string|null, name?: string|null, role?: string|null, department?: string|null }} input.actor
 * @param {string} input.action — CHANGE_LOG_ACTIONS value
 * @param {string} input.module — CHANGE_LOG_MODULES value
 * @param {string} input.entityType
 * @param {string|null} [input.entityId]
 * @param {string} input.entityLabel — human label for the entity
 * @param {string} input.summary — required human-readable sentence
 * @param {object|null} [input.before]
 * @param {object|null} [input.after]
 * @param {string[]} [input.changedFields]
 * @param {object|null} [input.metadata] — e.g. { departmentId } for HOD scoping
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [input.db]
 */
export async function recordChangeLog(input) {
  try {
    const schoolId = String(input?.schoolId || '').trim()
    const summary = String(input?.summary || '').trim()
    if (!schoolId || !summary) {
      console.warn('[ChangeLog] skipped: schoolId and summary are required')
      return null
    }

    const actor = input.actor || {}
    const actorName = String(actor.name || '').trim() || 'Unknown user'
    const actorRole = formatActorRole(actor.role)
    const actorLabel = buildActorLabel(actor)
    const action = String(input.action || CHANGE_LOG_ACTIONS.OTHER)
      .trim()
      .toLowerCase()
    const changeModule = String(input.module || CHANGE_LOG_MODULES.OTHER)
      .trim()
      .toLowerCase()
    const entityType = String(input.entityType || 'Unknown').trim() || 'Unknown'
    const entityLabel = String(input.entityLabel || entityType).trim() || entityType
    const entityId = input.entityId != null ? String(input.entityId) : null

    const db = input.db || prisma
    return await db.changeLogEntry.create({
      data: {
        schoolId,
        actorUserId: actor.userId ? String(actor.userId) : null,
        actorName,
        actorRole,
        actorLabel,
        action,
        module: changeModule,
        entityType,
        entityId,
        entityLabel,
        summary,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
        changedFields: Array.isArray(input.changedFields) ? input.changedFields.map(String) : [],
        metadata: input.metadata ?? undefined,
      },
    })
  } catch (err) {
    console.error('[ChangeLog] write failed:', err?.message || err)
    return null
  }
}

/**
 * Convenience: actor from auth user (+ optional HOD department name).
 */
export function actorFromUser(user, extras = {}) {
  if (!user) {
    return { userId: null, name: 'System', role: 'system', ...extras }
  }
  return {
    userId: user.id || user.userId || null,
    name: user.name || user.email || 'User',
    role: user.role || extras.role || 'user',
    department: extras.department || user.hodProfile?.department || null,
  }
}
