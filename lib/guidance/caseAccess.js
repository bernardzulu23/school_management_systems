import { GUIDANCE_K_ANONYMITY_THRESHOLD } from '@/lib/guidance/constants'
import { matchesGuidanceScope } from '@/lib/guidance/pupilScope'
import { isSchoolAdminOrHead } from '@/lib/guidance/guidanceAccess'

/**
 * @param {number} count
 * @param {number} [threshold]
 */
export function suppressCount(count, threshold = GUIDANCE_K_ANONYMITY_THRESHOLD) {
  const n = Number(count) || 0
  if (n < threshold) return `<${threshold}`
  return String(n)
}

/**
 * Build termly aggregate rows for headteacher report (SAFEGUARDING excluded).
 * @param {Array<{ category: string, confidentiality: string, pupil?: { class?: string } }>} cases
 * @param {'ALL' | 'JUNIOR' | 'SENIOR'} [scopeFilter]
 */
export function buildTermlyCategoryCounts(cases, scopeFilter = 'ALL') {
  const buckets = new Map()

  for (const row of cases) {
    if (row.confidentiality === 'SAFEGUARDING') continue
    const pupilClass = row.pupil?.class || ''
    if (!matchesGuidanceScope(pupilClass, scopeFilter)) continue
    const key = String(row.category || 'UNKNOWN')
    buckets.set(key, (buckets.get(key) || 0) + 1)
  }

  return Array.from(buckets.entries())
    .map(([category, count]) => ({
      category,
      count,
      display: suppressCount(count),
    }))
    .sort((a, b) => a.category.localeCompare(b.category))
}

/**
 * @param {object} params
 * @param {object} params.caseRow
 * @param {object} params.user
 * @param {object|null} params.assignment
 * @param {boolean} [params.isHead]
 */
export function canViewCaseDetail({ caseRow, user, assignment, isHead = false }) {
  if (!caseRow) return false

  if (caseRow.confidentiality === 'SAFEGUARDING') {
    if (isHead) {
      return Boolean(caseRow.escalation?.escalatedToId === user?.id)
    }
    return String(caseRow.assignedToId) === String(user?.id)
  }

  if (isHead) return false

  if (!assignment) return false

  const pupilClass = caseRow.pupil?.class || ''
  if (!matchesGuidanceScope(pupilClass, assignment.scope)) return false

  if (caseRow.confidentiality === 'SENSITIVE') {
    return String(caseRow.assignedToId) === String(user?.id)
  }

  return true
}

export function canEditCase({ caseRow, user, assignment }) {
  if (!caseRow || !assignment) return false
  if (!canViewCaseDetail({ caseRow, user, assignment, isHead: false })) return false
  return String(caseRow.assignedToId) === String(user?.id)
}

export function canManageReEntryRecords({ user, assignment, isHead = false }) {
  if (isHead || isSchoolAdminOrHead(user)) return true
  return Boolean(assignment?.canManageReEntry)
}

/**
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 * @param {object} params
 */
export async function logCaseAccess(db, { schoolId, caseId, userId, action }) {
  if (!schoolId || !caseId || !userId || !action) return
  await db.caseAccessLog.create({
    data: {
      schoolId: String(schoolId),
      caseId: String(caseId),
      userId: String(userId),
      action,
    },
  })
}

/**
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 * @param {string} schoolId
 */
export async function resolveHeadteacherUserId(db, schoolId) {
  const head = await db.user.findFirst({
    where: {
      schoolId: String(schoolId),
      role: { in: ['headteacher', 'HEADTEACHER', 'admin', 'administrator', 'ADMIN'] },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  return head?.id || null
}
