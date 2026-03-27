import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('classId')
  const subjectId = searchParams.get('subjectId')
  const className = searchParams.get('className')
  const subjectName = searchParams.get('subjectName')

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const teacher = await prisma.teacher.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  })
  if (!teacher) return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 })

  const resolvedClass =
    classId ||
    (className
      ? (
          await prisma.class.findUnique({
            where: { schoolId_name: { schoolId, name: className } },
            select: { id: true },
          })
        )?.id
      : null)

  const resolvedSubject =
    subjectId ||
    (subjectName
      ? (
          await prisma.subject.findUnique({
            where: { schoolId_name: { schoolId, name: subjectName } },
            select: { id: true },
          })
        )?.id
      : null)

  if (!resolvedClass || !resolvedSubject) {
    return NextResponse.json(
      { error: 'classId/className and subjectId/subjectName required' },
      { status: 400 }
    )
  }

  const assignment = await prisma.teachingAssignment.findFirst({
    where: {
      schoolId,
      teacherId: teacher.id,
      classId: resolvedClass,
      subjectId: resolvedSubject,
    },
    select: { id: true },
  })

  if (!assignment) {
    return NextResponse.json(
      { error: 'No teaching assignment for this class and subject' },
      { status: 403 }
    )
  }

  const enrollments = await prisma.pupilSubjectEnrollment.findMany({
    where: {
      schoolId,
      classId: resolvedClass,
      subjectId: resolvedSubject,
    },
    include: {
      pupil: {
        include: { user: true },
      },
    },
    orderBy: {
      pupil: { name: 'asc' },
    },
  })

  const pupils = enrollments.map((e) => ({
    id: e.pupil.id,
    name: e.pupil.name,
    class: e.pupil.class,
    exam_number: e.pupil.exam_number,
    email: e.pupil.user?.email || null,
    contact_number: e.pupil.user?.contact_number || null,
  }))

  return NextResponse.json({ success: true, data: pupils })
}
