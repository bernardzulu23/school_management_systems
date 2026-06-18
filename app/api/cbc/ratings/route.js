export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { staffRoleDeniedMessage } from '@/lib/auth/roles'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'

const LEVEL_MAP = {
  EXCELLENT: 4,
  GOOD: 3,
  FAIR: 2,
  NEEDS_IMPROVEMENT: 1,
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    throw new ApiError(staffRoleDeniedMessage(auth.user?.role), 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const featureBlock = await requireFeature(schoolId, 'continuous-assessment-tool')
  if (featureBlock) return featureBlock

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'cbc')
  if (typeBlock) return typeBlock

  const { searchParams } = new URL(request.url)
  const gradeLevel = searchParams.get('gradeLevel') || undefined
  const term = searchParams.get('term') ? Number(searchParams.get('term')) : undefined
  const academicYear = searchParams.get('academicYear')
    ? Number(searchParams.get('academicYear'))
    : new Date().getFullYear()
  const studentId = searchParams.get('studentId') || undefined

  const ratings = await prisma.cbcCompetencyRating.findMany({
    where: {
      schoolId,
      academicYear,
      ...(gradeLevel ? { gradeLevel } : {}),
      ...(term ? { term } : {}),
      ...(studentId ? { studentId } : {}),
    },
    include: {
      student: { select: { id: true, name: true, class: true } },
      competency: { select: { id: true, name: true, category: true } },
      recorder: { select: { id: true, name: true } },
    },
    orderBy: [{ student: { name: 'asc' } }, { competency: { name: 'asc' } }],
  })

  return NextResponse.json({ success: true, data: ratings })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    throw new ApiError(staffRoleDeniedMessage(auth.user?.role), 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const featureBlock = await requireFeature(schoolId, 'continuous-assessment-tool')
  if (featureBlock) return featureBlock

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'cbc')
  if (typeBlock) return typeBlock

  const body = await request.json().catch(() => ({}))
  const studentId = String(body.studentId || '').trim()
  const competencyId = String(body.competencyId || '').trim()
  const gradeLevel = String(body.gradeLevel || '').trim()
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

  const competency = await prisma.eczCompetency.findUnique({ where: { id: competencyId } })
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
