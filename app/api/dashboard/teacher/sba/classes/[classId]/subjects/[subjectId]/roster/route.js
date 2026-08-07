export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { safeStringId, safeQueryString } from '@/lib/security/safeQueryValue'
import { resolveSecondarySBASubjects } from '@/lib/sba/resolveSecondarySBASubjects'
import { assertSbaEntryYear, SBA_ENTRY_START_YEAR } from '@/lib/sba/constants'

const TEACHER_ROLES = ['TEACHER', 'teacher', 'ADMIN', 'admin', 'headteacher', 'HOD', 'hod']

export const GET = withErrorHandler(async function GET(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, TEACHER_ROLES)) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const routeParams = typeof params?.then === 'function' ? await params : params
  const classId = safeStringId(routeParams?.classId)
  const subjectId = safeStringId(routeParams?.subjectId)
  if (!classId || !subjectId) throw new ApiError('classId and subjectId required', 400)

  const { searchParams } = new URL(request.url)
  const academicYear = assertSbaEntryYear(
    safeQueryString(searchParams.get('academicYear'), { maxLength: 8 }) || new Date().getFullYear()
  )
  const term = safeQueryString(searchParams.get('term'), { maxLength: 32 }) || 'Term 1'

  const db = getTenantClient(schoolId)
  const klass = await db.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true, name: true, year_group: true },
  })
  if (!klass) throw new ApiError('Class not found', 404)

  const resolved = await resolveSecondarySBASubjects(db, {
    schoolId,
    level: klass.year_group,
    academicYear,
  })

  const policy = resolved.subjects.find((s) => s.subjectId === subjectId)
  if (!policy) {
    return NextResponse.json({
      class: klass,
      academicYear,
      term,
      policy: null,
      roster: [],
      emptyReason: resolved.emptyReason || 'NO_POLICY_FOR_SUBJECT',
      message:
        resolved.message ||
        (resolved.emptyReason === 'STARTS_AT_LEVEL'
          ? `SBA recording begins at ${resolved.startsAtLevelHint}`
          : 'No SBA policy for this subject'),
      sbaEntryStartYear: SBA_ENTRY_START_YEAR,
    })
  }

  const enrollments = await db.pupilSubjectEnrollment.findMany({
    where: { schoolId, classId, subjectId },
    include: {
      pupil: {
        select: { id: true, name: true, exam_number: true },
      },
    },
    orderBy: { pupil: { name: 'asc' } },
  })

  const pupilIds = enrollments.map((e) => e.pupilId)
  const records = pupilIds.length
    ? await db.sBARecord.findMany({
        where: {
          schoolId,
          classId,
          subjectId,
          academicYear,
          term,
          pupilId: { in: pupilIds },
        },
        include: {
          edits: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { editedBy: { select: { id: true, name: true } } },
          },
        },
      })
    : []

  const recordsByPupil = new Map()
  for (const rec of records) {
    const key = rec.pupilId
    if (!recordsByPupil.has(key)) recordsByPupil.set(key, [])
    recordsByPupil.get(key).push(rec)
  }

  const roster = enrollments.map((e) => ({
    pupilId: e.pupilId,
    name: e.pupil?.name,
    examNumber: e.pupil?.exam_number,
    records: recordsByPupil.get(e.pupilId) || [],
  }))

  return NextResponse.json({
    class: klass,
    academicYear,
    term,
    policy,
    roster,
    emptyReason: null,
    sbaEntryStartYear: SBA_ENTRY_START_YEAR,
  })
})
