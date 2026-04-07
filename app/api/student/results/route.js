import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['STUDENT', 'student', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  // Resolve student profile
  const student = await prisma.student.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })

  if (!student) {
    throw new ApiError('Student profile not found', 404)
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page')) || 1
  const limit = parseInt(searchParams.get('limit')) || 20
  const skip = (page - 1) * limit

  const [results, total] = await Promise.all([
    prisma.result.findMany({
      where: { studentId: student.id, schoolId },
      include: {
        subject: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.result.count({ where: { studentId: student.id, schoolId } }),
  ])

  // Transform results to be more frontend-friendly
  const formattedResults = results.map((result) => ({
    id: result.id,
    subject: result.subject?.name || 'Unknown',
    subjectCode: result.subject?.code || 'N/A',
    score: result.score,
    grade: result.grade,
    term: result.term,
    year: result.year,
    comments: result.comments,
    date: result.createdAt.toISOString(),
  }))

  return NextResponse.json({
    success: true,
    data: formattedResults,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
})
