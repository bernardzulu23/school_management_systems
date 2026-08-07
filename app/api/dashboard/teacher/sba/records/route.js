export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { assertSbaEntryYear } from '@/lib/sba/constants'

const TEACHER_ROLES = ['TEACHER', 'teacher', 'ADMIN', 'admin', 'headteacher', 'HOD', 'hod']

const COMPONENT_TYPES = new Set([
  'COURSEWORK',
  'PRACTICAL',
  'PROJECT',
  'ORAL',
  'PORTFOLIO',
  'TERM_TEST',
  'OTHER',
])

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, TEACHER_ROLES)) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const pupilId = String(body.pupilId || '').trim()
  const classId = String(body.classId || '').trim()
  const subjectId = String(body.subjectId || '').trim()
  const componentType = String(body.componentType || '')
    .trim()
    .toUpperCase()
  const term = String(body.term || '').trim() || 'Term 1'
  const academicYear = assertSbaEntryYear(body.academicYear)
  const rawMark =
    body.rawMark === null || body.rawMark === undefined || body.rawMark === ''
      ? null
      : Number(body.rawMark)
  const maxRawMark =
    body.maxRawMark === null || body.maxRawMark === undefined || body.maxRawMark === ''
      ? null
      : Number(body.maxRawMark)

  if (!pupilId || !classId || !subjectId) {
    throw new ApiError('pupilId, classId, and subjectId are required', 400)
  }
  if (!COMPONENT_TYPES.has(componentType)) {
    throw new ApiError('Invalid componentType', 400)
  }
  if (rawMark != null && (!Number.isFinite(rawMark) || rawMark < 0)) {
    throw new ApiError('rawMark must be a non-negative number', 400)
  }
  if (maxRawMark != null && rawMark != null && rawMark > maxRawMark) {
    throw new ApiError('rawMark cannot exceed maxRawMark', 400)
  }

  const db = getTenantClient(schoolId)

  const enrollment = await db.pupilSubjectEnrollment.findFirst({
    where: { schoolId, pupilId, classId, subjectId },
  })
  if (!enrollment) throw new ApiError('Pupil is not enrolled in this class/subject', 400)

  const existing = await db.sBARecord.findUnique({
    where: {
      schoolId_pupilId_subjectId_classId_componentType_term_academicYear: {
        schoolId,
        pupilId,
        subjectId,
        classId,
        componentType,
        term,
        academicYear,
      },
    },
  })

  if (existing) {
    if (existing.status === 'LOCKED') {
      throw new ApiError('Record is locked; use PATCH with reason to edit', 409)
    }
    const updated = await db.sBARecord.update({
      where: { id: existing.id },
      data: {
        rawMark,
        maxRawMark: maxRawMark ?? existing.maxRawMark,
        enteredById: auth.user.id,
        status: existing.status === 'SUBMITTED' ? 'DRAFT' : existing.status,
      },
    })
    return NextResponse.json({ record: updated, upserted: true })
  }

  const created = await db.sBARecord.create({
    data: {
      schoolId,
      schoolPhase: 'SECONDARY',
      pupilId,
      classId,
      subjectId,
      componentType,
      term,
      academicYear,
      rawMark,
      maxRawMark,
      status: 'DRAFT',
      enteredById: auth.user.id,
    },
  })

  return NextResponse.json({ record: created, upserted: false }, { status: 201 })
})
