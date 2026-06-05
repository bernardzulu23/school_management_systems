export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { parseAssessmentInteractive } from '@/lib/assessments/assessmentInteractive'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])

  const { searchParams } = new URL(request.url)
  const status = String(searchParams.get('status') || 'SUBMITTED').toUpperCase()

  const where = {
    schoolId,
    type: { in: ['quiz', 'assignment'] },
    ...(status !== 'ALL' ? { status } : {}),
    ...(!isAdmin ? { reviewerUserId: userId } : {}),
  }

  const assessments = await prisma.assessment.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    take: 100,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  })

  const data = assessments.map((a) => {
    const interactive = parseAssessmentInteractive(a.description)
    return {
      id: a.id,
      title: a.title,
      subject: a.subject,
      class: a.class,
      topic: a.topic,
      status: a.status,
      type: a.type,
      submittedAt: a.submittedAt,
      questionCount: interactive?.questions?.length || 0,
      createdBy: a.createdBy,
      reviewer: a.reviewer,
    }
  })

  return NextResponse.json({
    success: true,
    data: {
      assessments: data,
      pendingCount: data.filter((a) => a.status === 'SUBMITTED').length,
    },
  })
})
