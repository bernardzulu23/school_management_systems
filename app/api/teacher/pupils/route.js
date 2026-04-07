import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('classId')
  const subjectId = searchParams.get('subjectId')
  const className = searchParams.get('className')
  const subjectName = searchParams.get('subjectName')

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const teacher = await prisma.teacher.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })
  if (!teacher) throw new ApiError('Teacher profile not found', 404)

  const resolvedClass =
    classId ||
    (className
      ? (
          await prisma.class.findFirst({
            where: { schoolId_name: { schoolId, name: className } },
            select: { id: true },
          })
        )?.id
      : null)

  const resolvedSubject =
    subjectId ||
    (subjectName
      ? (
          await prisma.subject.findFirst({
            where: { schoolId_name: { schoolId, name: subjectName } },
            select: { id: true },
          })
        )?.id
      : null)

  if (!resolvedClass || !resolvedSubject) {
    throw new ApiError('classId/className and subjectId/subjectName required', 400)
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
    throw new ApiError('No teaching assignment for this class and subject', 403)
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

  const classRecord = await prisma.class.findFirst({
    where: { schoolId, id: resolvedClass },
    select: { id: true, name: true },
  })

  const subjectRecord = await prisma.subject.findFirst({
    where: { schoolId, id: resolvedSubject },
    select: { id: true, name: true },
  })

  const fallbackStudents =
    classRecord && subjectRecord
      ? await prisma.student.findMany({
          where: {
            schoolId,
            OR: [{ class: classRecord.name }, { class: classRecord.id }],
            selected_subjects: { hasSome: [subjectRecord.name, subjectRecord.id] },
          },
          include: { user: true },
          orderBy: { name: 'asc' },
          take: 5000,
        })
      : []

  const combined = [...enrollments.map((e) => e.pupil), ...fallbackStudents]

  const seen = new Set()
  const pupils = combined
    .filter((p) => {
      const id = String(p?.id || '')
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      class: p.class,
      exam_number: p.exam_number,
      email: p.user?.email || null,
      contact_number: p.user?.contact_number || null,
    }))

  return NextResponse.json({ success: true, data: pupils })
})
