export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { buildAssessmentInteractiveDescription } from '@/lib/assessments/assessmentInteractive'
import { clampListLimit } from '@/lib/security/antiScraping'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { buildAssessmentListWhere, parseAssessmentListFilters } from '@/lib/assessments/routeScope'
import { safeStringId } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)
  const db = getTenantClient(schoolId)

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)
  const limit = clampListLimit(searchParams, { defaultLimit: 20, maxLimit: 100 })
  const skip = (page - 1) * limit
  const filters = parseAssessmentListFilters(searchParams)

  const where = await buildAssessmentListWhere(db, {
    schoolId,
    user: auth.user,
    filters,
  })

  const [assessments, total] = await Promise.all([
    db.assessment.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    db.assessment.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: assessments,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)
  const db = getTenantClient(schoolId)

  const data = await request.json()

  const classId = safeStringId(data.classId)
  const className = data.class ? String(data.class).trim() : ''

  if (!data.title || !data.date || !data.subject || (!classId && !className)) {
    throw new ApiError('Title, subject, class and date are required', 400)
  }

  const classRecord = classId
    ? await db.class.findFirst({
        where: { schoolId, id: classId },
        select: { id: true, name: true },
      })
    : className
      ? await db.class.findFirst({
          where: { schoolId, name: { equals: className, mode: 'insensitive' } },
          select: { id: true, name: true },
        })
      : null

  if (!classRecord && (classId || className)) {
    throw new ApiError('Class not found in this school', 400)
  }

  const questions = Array.isArray(data.questions) ? data.questions : []
  const description =
    questions.length > 0
      ? buildAssessmentInteractiveDescription({ questions, publishedAssignmentId: null })
      : data.description
        ? String(data.description)
        : null

  const userId = String(auth.user?.id || '').trim()
  const newAssessment = await db.assessment.create({
    data: {
      title: data.title,
      type: data.type || 'quiz',
      subject: String(data.subject),
      classId: classRecord?.id || null,
      class: classRecord?.name || className,
      date: new Date(data.date),
      duration_minutes: parseInt(data.duration_minutes, 10) || 60,
      description,
      schoolId,
      status: 'DRAFT',
      topic: data.topic ? String(data.topic).trim() : null,
      createdByUserId: userId || null,
      aiAnalysis:
        data.aiAnalysis && typeof data.aiAnalysis === 'object' ? data.aiAnalysis : undefined,
    },
  })

  return NextResponse.json({ success: true, data: newAssessment }, { status: 201 })
})
