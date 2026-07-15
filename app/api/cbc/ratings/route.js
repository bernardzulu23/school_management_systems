export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'

const LEVEL_MAP = {
  EXCELLENT: 4,
  GOOD: 3,
  FAIR: 2,
  NEEDS_IMPROVEMENT: 1,
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const featureBlock = await requireFeature(schoolId, 'continuous-assessment-tool')
  if (featureBlock) return featureBlock

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'continuous-assessment-tool')
  if (typeBlock) return typeBlock

  const { searchParams } = new URL(request.url)
  const gradeLevel = safeQueryString(searchParams.get('gradeLevel'))
  const termRaw = safeQueryString(searchParams.get('term'))
  const term = termRaw ? Number(termRaw) : undefined
  const yearRaw = safeQueryString(searchParams.get('academicYear'))
  const academicYear = yearRaw ? Number(yearRaw) : new Date().getFullYear()
  const studentId = safeStringId(searchParams.get('studentId'))
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))
  const skip = (page - 1) * limit

  const where = {
    schoolId,
    academicYear,
    ...(gradeLevel ? { gradeLevel } : {}),
    ...(term != null && Number.isFinite(term) ? { term } : {}),
    ...(studentId ? { studentId } : {}),
  }

  const [ratings, total] = await prisma.$transaction([
    prisma.cbcCompetencyRating.findMany({
      where: { schoolId, ...where },
      include: {
        student: { select: { id: true, name: true, class: true } },
        competency: { select: { id: true, name: true, category: true } },
        recorder: { select: { id: true, name: true } },
      },
      orderBy: [{ student: { name: 'asc' } }, { competency: { name: 'asc' } }],
      skip,
      take: limit,
    }),
    prisma.cbcCompetencyRating.count({ where: { schoolId, ...where } }),
  ])

  return NextResponse.json({
    success: true,
    data: ratings,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const featureBlock = await requireFeature(schoolId, 'continuous-assessment-tool')
  if (featureBlock) return featureBlock

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'continuous-assessment-tool')
  if (typeBlock) return typeBlock

  const body = await request.json().catch(() => ({}))
  const studentId = safeStringId(body.studentId)
  const competencyId = safeStringId(body.competencyId)
  const gradeLevel = safeQueryString(body.gradeLevel)
  const term = Number(body.term)
  const academicYear = Number(body.academicYear || new Date().getFullYear())
  const level = String(body.level || '').toUpperCase()
  const evidenceNote = body.evidenceNote ? String(body.evidenceNote) : null

  if (!studentId || !competencyId || !gradeLevel) {
    throw new ApiError('studentId, competencyId, and gradeLevel are required', 400)
  }
  if (!Number.isFinite(term) || term < 1 || term > 3) {
    throw new ApiError('term (1–3) is required', 400)
  }
  if (!LEVEL_MAP[level]) {
    throw new ApiError('level must be EXCELLENT, GOOD, FAIR, or NEEDS_IMPROVEMENT', 400)
  }

  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } })
  if (!student) throw new ApiError('Student not found', 404)

  const competency = await prisma.eczCompetency.findUnique({
    ...(schoolId ? {} : {}),
    where: { id: competencyId },
  })
  if (!competency) throw new ApiError('Competency not found', 404)

  const rating = await prisma.cbcCompetencyRating.upsert({
    where: {
      schoolId_studentId_competencyId_term_academicYear: {
        schoolId,
        studentId,
        competencyId,
        term,
        academicYear,
      },
    },
    create: {
      schoolId,
      studentId,
      competencyId,
      gradeLevel,
      term,
      academicYear,
      level,
      evidenceNote,
      recordedBy: auth.user.id,
    },
    update: {
      level,
      evidenceNote,
      gradeLevel,
      recordedBy: auth.user.id,
    },
    include: {
      student: { select: { id: true, name: true } },
      competency: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ success: true, data: rating }, { status: 201 })
})
