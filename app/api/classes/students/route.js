export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeStringId } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const classId = safeStringId(searchParams.get('classId'))
  const subjectId = safeStringId(searchParams.get('subjectId'))
  const includeFaceDataRaw = String(searchParams.get('includeFaceData') || '')
  const includeFaceData =
    roleCheck(auth.user, ['ADMIN', 'headteacher', 'TEACHER', 'teacher']) &&
    (includeFaceDataRaw === 'true' || includeFaceDataRaw === '1')

  if (!classId) return NextResponse.json({ error: 'classId is required' }, { status: 400 })

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true, name: true, year_group: true, section: true },
  })
  if (!cls?.name) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const yearGroup = String(cls.year_group || '').trim()
  const section = String(cls.section || '').trim()
  const compact = `${yearGroup}${section}`.trim()
  const spaced = `${yearGroup} ${section}`.trim()
  const classCandidates = Array.from(
    new Set(
      [cls.name, cls.id, yearGroup, compact, spaced, String(cls.name || '').replace(/\s+/g, '')]
        .map((v) => String(v || '').trim())
        .filter(Boolean)
    )
  )

  const studentInclude = {
    user: { select: { id: true, name: true, email: true, profile_picture_url: true } },
  }

  let students = []

  if (subjectId) {
    const enrollments = await prisma.pupilSubjectEnrollment.findMany({
      where: { schoolId, classId, subjectId },
      distinct: ['pupilId'],
      select: { pupilId: true },
      take: 5000,
    })
    const pupilIds = enrollments.map((e) => e.pupilId).filter(Boolean)
    students =
      pupilIds.length > 0
        ? await prisma.student.findMany({
            where: { schoolId, id: { in: pupilIds } },
            include: studentInclude,
            orderBy: { updatedAt: 'desc' },
            take: 500,
          })
        : []
  } else {
    const studentsByName = await prisma.student.findMany({
      where: {
        schoolId,
        OR: [{ classId }, { class: { in: classCandidates } }],
      },
      include: studentInclude,
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })

    const enrollments = await prisma.pupilSubjectEnrollment.findMany({
      where: { schoolId, classId },
      distinct: ['pupilId'],
      select: { pupilId: true },
      take: 5000,
    })
    const pupilIds = enrollments.map((e) => e.pupilId).filter(Boolean)
    const studentsByEnrollment =
      pupilIds.length > 0
        ? await prisma.student.findMany({
            where: { schoolId, id: { in: pupilIds } },
            include: studentInclude,
            orderBy: { updatedAt: 'desc' },
            take: 500,
          })
        : []

    const byId = new Map()
    ;[...studentsByName, ...studentsByEnrollment].forEach((s) => {
      if (s?.id) byId.set(String(s.id), s)
    })
    students = Array.from(byId.values())
  }

  let payload = students.map((s) => ({
    id: s.id,
    name: s.user?.name || s.name || 'Student',
    student_id: s.id,
    exam_number: s.exam_number || null,
    profile_picture_url: s.user?.profile_picture_url || null,
    ...(includeFaceData ? { faceEmbedding: s.faceEmbedding || null } : {}),
  }))

  if (includeFaceData) {
    const { filterRosterEmbeddingsByConsent, getSchoolFacialPolicy } =
      await import('@/lib/consent/facialAttendance')
    const policy = await getSchoolFacialPolicy(schoolId)
    if (!policy.enabled) {
      payload = payload.map((row) => ({ ...row, faceEmbedding: null, hasFacialConsent: false }))
    } else {
      payload = await filterRosterEmbeddingsByConsent(schoolId, payload)
    }
  }

  return NextResponse.json({
    success: true,
    data: payload,
  })
})
