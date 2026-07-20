import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import prisma from '@/lib/prisma'
import {
  assertTeacherInHodDepartment,
  getHodDepartmentTeacherUserIds,
} from '@/lib/hod/departmentTeachers'
import {
  getRequiredLessonPlansPerTerm,
  syllabusReadinessIndex,
} from '@/lib/ai/chat/lesson-plan-readiness'

export const dynamic = 'force-dynamic'

/**
 * GET /api/hod/lesson-plans/teacher-coverage
 * Query: teacherId (required for drilldown) | omit for department teacher list.
 *
 * Counts scoped to schoolId AND HOD department. Cross-department teachers → 403.
 * Admin/headteacher may query any teacher in the school.
 */
export const GET = withErrorHandler(async function GET(request: Request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  const isHod = roleCheck(auth.user, ['HOD', 'hod'])
  if (!isAdmin && !isHod) {
    throw new ApiError('Only HOD or admin can view teacher coverage', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const hodUserId = String(auth.user.id)
  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get('teacherId')?.trim() || null

  const db = getTenantClient(schoolId)
  const requiredCount = getRequiredLessonPlansPerTerm()

  // Department teacher list (for HOD picker)
  if (!teacherId) {
    let teacherUserIds: string[] = []
    if (isAdmin) {
      const teachers = await prisma.teacher.findMany({
        where: { schoolId },
        select: { userId: true },
        take: 500,
      })
      teacherUserIds = teachers.map((t) => t.userId).filter(Boolean) as string[]
    } else {
      const scoped = await getHodDepartmentTeacherUserIds(prisma, schoolId, hodUserId)
      teacherUserIds = scoped.teacherUserIds
    }

    const users =
      teacherUserIds.length === 0
        ? []
        : await prisma.user.findMany({
            where: { id: { in: teacherUserIds }, schoolId },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
          })

    return NextResponse.json({
      success: true,
      schoolId,
      scope: isAdmin ? 'school' : 'department',
      teachers: users,
      requiredCount,
    })
  }

  // Drilldown for one teacher
  if (!isAdmin) {
    const allowed = await assertTeacherInHodDepartment(prisma, schoolId, hodUserId, teacherId)
    if (!allowed) {
      throw new ApiError('Forbidden — teacher is outside your department', 403)
    }
  } else {
    const exists = await prisma.user.findFirst({
      where: { id: teacherId, schoolId },
      select: { id: true },
    })
    if (!exists) throw new ApiError('Teacher not found in this school', 404)
  }

  const [total, approved] = await Promise.all([
    db.lessonPlanSubmission.count({
      where: { schoolId, teacherId },
    }),
    db.lessonPlanSubmission.count({
      where: { schoolId, teacherId, status: 'APPROVED' },
    }),
  ])

  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, schoolId },
    select: { id: true, name: true, email: true },
  })

  const readiness = syllabusReadinessIndex(approved, requiredCount)

  return NextResponse.json({
    success: true,
    schoolId,
    scope: isAdmin ? 'school' : 'department',
    teacher,
    total,
    approved,
    readiness,
  })
})
