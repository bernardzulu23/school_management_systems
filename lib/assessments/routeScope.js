import prisma from '@/lib/prisma'
import { roleCheck } from '@/lib/middleware/auth'
import { ApiError } from '@/lib/middleware/errorHandler'
import { getHodProfile, resolveHodDepartmentIds } from '@/lib/utils/hodDepartmentScope'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'

export function isAssessmentAdmin(user) {
  return roleCheck(user, ['ADMIN', 'headteacher'])
}

export function isAssessmentHod(user) {
  return roleCheck(user, ['HOD', 'hod'])
}

export function isAssessmentTeacher(user) {
  return roleCheck(user, ['TEACHER', 'teacher'])
}

/**
 * Resolve user IDs for teachers in an HOD's department(s).
 * @param {string} schoolId
 * @param {{ departmentId?: string | null, department?: string | null }} hodProfile
 */
export async function resolveDepartmentTeacherUserIds(schoolId, hodProfile) {
  if (!hodProfile) return []

  const departmentIds = await resolveHodDepartmentIds(prisma, schoolId, hodProfile)
  const deptName = String(hodProfile.department || '').trim()

  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId,
      OR: [
        ...(departmentIds.length
          ? [{ departments: { some: { departmentId: { in: departmentIds } } } }]
          : []),
        ...(deptName ? [{ department: { equals: deptName, mode: 'insensitive' } }] : []),
      ],
    },
    select: { userId: true },
  })

  return [...new Set(teachers.map((t) => t.userId).filter(Boolean))]
}

/**
 * Build Prisma where clause for listing assessments by role.
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 */
export async function buildAssessmentListWhere(db, { schoolId, user, filters = {} }) {
  const where = {
    schoolId,
    ...(filters.classId ? { classId: filters.classId } : {}),
    ...(filters.className ? { class: filters.className } : {}),
    ...(filters.subject ? { subject: filters.subject } : {}),
  }

  if (isAssessmentAdmin(user)) {
    return where
  }

  if (isAssessmentHod(user)) {
    const hodProfile = await getHodProfile(db, user.id, schoolId)
    const teacherUserIds = await resolveDepartmentTeacherUserIds(schoolId, hodProfile)
    if (teacherUserIds.length === 0) {
      where.createdByUserId = user.id
    } else {
      where.createdByUserId = { in: [...new Set([user.id, ...teacherUserIds])] }
    }
    return where
  }

  if (isAssessmentTeacher(user)) {
    where.createdByUserId = user.id
    return where
  }

  throw new ApiError('Forbidden', 403)
}

/**
 * Ensure the user may read or mutate a single assessment.
 */
export async function assertCanAccessAssessment(db, { schoolId, user, assessment }) {
  if (!assessment || assessment.schoolId !== schoolId) {
    throw new ApiError('Assessment not found', 404)
  }

  if (isAssessmentAdmin(user)) return

  const ownerId = assessment.createdByUserId ? String(assessment.createdByUserId) : null
  if (ownerId && ownerId === String(user.id)) return

  if (isAssessmentHod(user)) {
    const hodProfile = await getHodProfile(db, user.id, schoolId)
    const teacherUserIds = await resolveDepartmentTeacherUserIds(schoolId, hodProfile)
    if (ownerId && teacherUserIds.includes(ownerId)) return
    if (String(assessment.reviewerUserId || '') === String(user.id)) return
  }

  throw new ApiError('Forbidden', 403)
}

/**
 * Parse common list filters from URL search params.
 * @param {URLSearchParams} searchParams
 */
export function parseAssessmentListFilters(searchParams) {
  return {
    classId: safeStringId(searchParams.get('classId')),
    className: safeQueryString(searchParams.get('class')),
    subject: safeQueryString(searchParams.get('subject')),
  }
}
