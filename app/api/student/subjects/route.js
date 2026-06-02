export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getStudentSubjectNames } from '@/lib/flashcards/studentSubjects'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['STUDENT', 'student', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)
  const db = getTenantClient(schoolId)

  const student = await db.student.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })

  if (!student) throw new ApiError('Student profile not found', 404)

  const names = await getStudentSubjectNames(student.id, schoolId)
  const subjects = await db.subject.findMany({
    where: { schoolId, name: { in: names, mode: 'insensitive' } },
    include: { teacher: { include: { user: true } } },
    take: 500,
  })

  const byName = new Map(subjects.map((s) => [String(s.name).toLowerCase(), s]))

  const data = names.map((name) => {
    const s = byName.get(name.toLowerCase())
    return {
      id: s?.id || name,
      name,
      code: s?.code || null,
      teacher: s?.teacher?.user?.name || null,
      classId: s?.classId || null,
    }
  })

  return NextResponse.json({ success: true, data })
})
