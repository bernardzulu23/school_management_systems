import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

function standardZambianClassNames() {
  const sections = ['A', 'B', 'C', 'D']
  const names = []
  for (const form of [1, 2, 3, 4, 5, 6]) {
    for (const section of sections) names.push(`Form ${form}${section}`)
  }
  for (const grade of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    for (const section of sections) names.push(`${grade}${section}`)
  }
  return names
}

export const POST = withErrorHandler(async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const force = Boolean(body?.force)

  const [studentsCount, assignmentsCount, assessmentsCount] = await prisma.$transaction([
    prisma.student.count({ where: { schoolId } }),
    prisma.assignment.count({ where: { schoolId } }),
    prisma.assessment.count({ where: { schoolId } }),
  ])

  if (!force && (studentsCount > 0 || assignmentsCount > 0 || assessmentsCount > 0)) {
    throw new ApiError(
      'Refusing to clear classes because the school already has data. Use { force: true }.',
      409
    )
  }

  const seedNames = new Set(standardZambianClassNames())
  const existing = await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, name: true },
    take: 5000,
  })

  const totalClasses = existing.length
  const seedMatches = existing.filter((c) => seedNames.has(String(c.name)))

  if (!force && totalClasses > 0 && seedMatches.length !== totalClasses) {
    throw new ApiError(
      'Refusing to clear classes because there are custom classes. Use { force: true } to delete all classes.',
      409
    )
  }

  const deleted = await prisma.class.deleteMany({ where: { schoolId } })

  return NextResponse.json({
    success: true,
    deletedClasses: deleted.count,
    previousTotalClasses: totalClasses,
    studentsCount,
    assignmentsCount,
    assessmentsCount,
    force,
  })
})
