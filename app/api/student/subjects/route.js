export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['STUDENT', 'student', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const student = await prisma.student.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })

  if (!student) throw new ApiError('Student profile not found', 404)

  const enrollments = await prisma.pupilSubjectEnrollment.findMany({
    where: { schoolId, pupilId: student.id },
    include: {
      subject: { include: { teacher: { include: { user: true } } } },
      class: true,
    },
    take: 50000,
  })

  const subjects = enrollments
    .map((e) => e.subject)
    .filter(Boolean)
    .map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code || null,
      teacher: s.teacher?.user?.name || null,
      classId: s.classId || null,
    }))

  return NextResponse.json({ success: true, data: subjects })
})
