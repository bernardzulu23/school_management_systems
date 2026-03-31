import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const classId = String(searchParams.get('classId') || '')
  if (!classId) return NextResponse.json({ error: 'classId is required' }, { status: 400 })

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { name: true },
  })
  if (!cls?.name) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const studentsByName = await prisma.student.findMany({
    where: { schoolId, class: cls.name },
    include: { user: { select: { id: true, name: true, email: true, profile_picture_url: true } } },
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
          include: {
            user: { select: { id: true, name: true, email: true, profile_picture_url: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 2000,
        })
      : []

  const byId = new Map()
  ;[...studentsByName, ...studentsByEnrollment].forEach((s) => {
    if (s?.id) byId.set(String(s.id), s)
  })
  const students = Array.from(byId.values())

  return NextResponse.json({
    success: true,
    data: students.map((s) => ({
      id: s.id,
      name: s.user?.name || s.name || 'Student',
      student_id: s.id,
      exam_number: s.exam_number || null,
      profile_picture_url: s.user?.profile_picture_url || null,
    })),
  })
}
