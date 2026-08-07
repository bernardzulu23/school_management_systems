export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { safeStringId, safeQueryString } from '@/lib/security/safeQueryValue'
import { resolveSecondarySBASubjects } from '@/lib/sba/resolveSecondarySBASubjects'
import { SBA_ENTRY_START_YEAR } from '@/lib/sba/constants'

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
  if (!classId) throw new ApiError('classId required', 400)

  const { searchParams } = new URL(request.url)
  const academicYearRaw = safeQueryString(searchParams.get('academicYear'), { maxLength: 8 })
  const term = safeQueryString(searchParams.get('term'), { maxLength: 32 }) || 'Term 1'
  const academicYear = academicYearRaw ? Number(academicYearRaw) : new Date().getFullYear()

  const db = getTenantClient(schoolId)
  const klass = await db.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true, name: true, year_group: true },
  })
  if (!klass) throw new ApiError('Class not found', 404)

  if (!Number.isFinite(academicYear) || academicYear < SBA_ENTRY_START_YEAR) {
    return NextResponse.json({
      class: klass,
      academicYear,
      term,
      subjects: [],
      emptyReason: 'ENTRY_YEAR',
      message: `SBA entry starts in academic year ${SBA_ENTRY_START_YEAR}`,
      sbaEntryStartYear: SBA_ENTRY_START_YEAR,
    })
  }

  const resolved = await resolveSecondarySBASubjects(db, {
    schoolId,
    level: klass.year_group,
    academicYear,
  })

  return NextResponse.json({
    class: klass,
    academicYear,
    term,
    subjects: resolved.subjects,
    emptyReason: resolved.emptyReason,
    message: resolved.message || null,
    startsAtLevelHint: resolved.startsAtLevelHint,
    syllabusVersion: resolved.syllabusVersion || null,
    sbaEntryStartYear: SBA_ENTRY_START_YEAR,
  })
})
