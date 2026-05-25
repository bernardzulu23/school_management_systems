export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

export async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const classId = String(searchParams.get('classId') || '')
  const subjectId = searchParams.get('subjectId') ? String(searchParams.get('subjectId')) : ''
  const includeFaceDataRaw = String(searchParams.get('includeFaceData') || '')
  const includeFaceData = includeFaceDataRaw === 'true' || includeFaceDataRaw === '1'
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
            take: 2000,
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
      take: 2000,
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
            take: 2000,
          })
        : []

    const byId = new Map()
    ;[...studentsByName, ...studentsByEnrollment].forEach((s) => {
      if (s?.id) byId.set(String(s.id), s)
    })
    students = Array.from(byId.values())
  }

  return NextResponse.json({
    success: true,
    data: students.map((s) => ({
      id: s.id,
      name: s.user?.name || s.name || 'Student',
      student_id: s.id,
      exam_number: s.exam_number || null,
      profile_picture_url: s.user?.profile_picture_url || null,
      ...(includeFaceData ? { faceEmbedding: s.faceEmbedding || null } : {}),
    })),
  })
}
