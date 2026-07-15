export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeStringId } from '@/lib/security/safeQueryValue'
import { assertTeacherMayAccessAttendanceClass } from '@/lib/attendance/routeAuth'

const STAFF_ROLES = ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod']
const ROSTER_LIMIT = 200

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, STAFF_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const classId = safeStringId(searchParams.get('classId'))
  const subjectId = safeStringId(searchParams.get('subjectId'))
  const includeFaceData = searchParams.get('includeFaceData') === 'true'

  if (!classId) {
    return NextResponse.json({ error: 'classId is required' }, { status: 400 })
  }

  await assertTeacherMayAccessAttendanceClass({ schoolId, user: auth.user, classId })

  let students = []

  if (subjectId) {
    const enrollments = await prisma.pupilSubjectEnrollment.findMany({
      where: {
        schoolId,
        classId,
        subjectId,
      },
      include: {
        pupil: true,
      },
      take: ROSTER_LIMIT,
    })
    students = enrollments.map((e) => e.pupil)
  } else {
    const classRecord = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true, name: true, year_group: true, section: true },
    })

    if (classRecord) {
      const yearGroup = String(classRecord.year_group || '').trim()
      const section = String(classRecord.section || '').trim()
      const compact = `${yearGroup}${section}`.trim()
      const spaced = `${yearGroup} ${section}`.trim()
      const classCandidates = Array.from(
        new Set(
          [
            classRecord.name,
            classRecord.id,
            yearGroup,
            compact,
            spaced,
            String(classRecord.name || '').replace(/\s+/g, ''),
          ]
            .map((v) => String(v || '').trim())
            .filter(Boolean)
        )
      )
      students = await prisma.student.findMany({
        where: {
          schoolId,
          OR: [{ classId: classRecord.id }, { class: { in: classCandidates } }],
        },
        take: ROSTER_LIMIT,
      })
    }
  }

  const responseData = students.map((s) => ({
    id: s.id,
    name: s.name,
    class: s.class,
    qrCode: s.exam_number || null,
    faceEmbedding: includeFaceData ? s.faceEmbedding : null,
    twinGroupId: s.twinGroupId || null,
    requiresSecondaryAuth: Boolean(s.requiresSecondaryAuth),
    secondaryAuthMethod: s.secondaryAuthMethod || null,
  }))

  if (includeFaceData) {
    const { filterRosterEmbeddingsByConsent, getSchoolFacialPolicy } =
      await import('@/lib/consent/facialAttendance')
    const policy = await getSchoolFacialPolicy(schoolId)
    if (!policy.enabled) {
      for (const row of responseData) {
        row.faceEmbedding = null
        row.hasFacialConsent = false
      }
    } else {
      const filtered = await filterRosterEmbeddingsByConsent(schoolId, responseData)
      return NextResponse.json(filtered)
    }
  }

  return NextResponse.json(responseData)
})
