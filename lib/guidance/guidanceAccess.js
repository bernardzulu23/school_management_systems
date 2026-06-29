import prisma from '@/lib/prisma'
import { roleCheck } from '@/lib/middleware/auth'

const GUIDANCE_SCOPES = new Set(['ALL', 'JUNIOR', 'SENIOR'])

export function normalizeGuidanceScope(scope) {
  const value = String(scope || 'ALL')
    .trim()
    .toUpperCase()
  return GUIDANCE_SCOPES.has(value) ? value : 'ALL'
}

export function formatGuidanceScopeLabel(scope) {
  const normalized = normalizeGuidanceScope(scope)
  if (normalized === 'JUNIOR') return 'Junior (Grades 1–9)'
  if (normalized === 'SENIOR') return 'Senior (Grades 10–12)'
  return 'All pupils'
}

/**
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 * @param {string} userId
 * @param {string} schoolId
 */
export async function getActiveGuidanceAssignment(db, userId, schoolId) {
  if (!userId || !schoolId) return null
  return db.guidanceAssignment.findFirst({
    where: {
      userId: String(userId),
      schoolId: String(schoolId),
      active: true,
      revokedAt: null,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      assignedBy: { select: { id: true, name: true } },
    },
  })
}

export function hasGuidanceAssignment(user) {
  const assignment = user?.guidanceAssignment
  return Boolean(assignment?.id && assignment?.active && !assignment?.revokedAt)
}

export function isSchoolAdminOrHead(user) {
  return roleCheck(user, ['ADMIN', 'headteacher'])
}

/**
 * Career clusters/careers write access — active guidance assignment only (not headteacher fallback).
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 * @param {object} user
 * @param {string} schoolId
 */
export async function canUserManageCareerGuidance(db, user, schoolId) {
  const assignment = await getActiveGuidanceAssignment(db, user?.id, schoolId)
  return Boolean(assignment)
}

/**
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [db]
 */
export async function resolveGuidanceAssignmentForUser(userId, schoolId, db = prisma) {
  return getActiveGuidanceAssignment(db, userId, schoolId)
}
