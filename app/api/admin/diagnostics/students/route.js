export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const [totalStudents, studentsWithoutUser, studentsWithUser, usersRoleStudent] =
    await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId, userId: null } }),
      prisma.student.count({ where: { schoolId, NOT: { userId: null } } }),
      prisma.user.count({ where: { schoolId, role: { in: ['student', 'STUDENT'] } } }),
    ])

  const mismatchedUserSchool = await prisma.student.count({
    where: {
      schoolId,
      userId: { not: null },
      user: { is: { schoolId: { not: schoolId } } },
    },
  })

  const studentsWithoutEnrollments = await prisma.student.count({
    where: { schoolId, subjectEnrollments: { none: {} } },
  })

  return NextResponse.json({
    success: true,
    data: {
      schoolId,
      totalStudents,
      studentsWithUser,
      studentsWithoutUser,
      usersRoleStudent,
      mismatchedUserSchool,
      studentsWithoutEnrollments,
    },
  })
})
