export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'HOD', 'TEACHER'])) {
    throw new ApiError('Forbidden', 403)
  }

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('classId')
  const subjectId = searchParams.get('subjectId')
  const className = searchParams.get('className')
  const subjectName = searchParams.get('subjectName')

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const isStaff = roleCheck(auth.user, ['ADMIN', 'HOD'])
  let teacherId = null

  if (!isStaff) {
    const teacher = await prisma.teacher.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { id: true },
    })
    if (!teacher) throw new ApiError('Teacher profile not found', 404)
    teacherId = teacher.id
  }

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

  if (!isStaff) {
    const assignment = await prisma.teachingAssignment.findFirst({
      where: {
        schoolId,
        teacherId,
        classId: resolvedClass,
        subjectId: resolvedSubject,
      },
      select: { id: true },
    })

    if (!assignment) {
      // Fallback: Check if the teacher is assigned to this class and subject via many-to-many relations or assignedSubjects array
      const [teacher, targetSubject] = await Promise.all([
        prisma.teacher.findFirst({
          where: { id: teacherId, schoolId },
          include: {
            classes: { where: { id: resolvedClass }, select: { id: true } },
            subjects: { where: { id: resolvedSubject }, select: { id: true } },
          },
        }),
        prisma.subject.findFirst({
          where: { id: resolvedSubject, schoolId },
          select: { id: true, name: true },
        }),
      ])

      const isAssignedToClass =
        teacher?.classes?.length > 0 ||
        (await prisma.class
          .findFirst({
            where: {
              schoolId,
              id: resolvedClass,
              teacherId: teacher.id,
            },
            select: { id: true },
          })
          .then((c) => !!c))

      const targetSubjectName = targetSubject?.name?.trim()?.toLowerCase() || ''
      const isAssignedToSubject =
        teacher?.subjects?.length > 0 ||
        (Array.isArray(teacher?.assignedSubjects) &&
          teacher.assignedSubjects.some((s) => {
            const norm = String(s || '')
              .trim()
              .toLowerCase()
            return norm === resolvedSubject || (targetSubjectName && norm === targetSubjectName)
          }))

      // If they have both class and subject assigned (even if not as a specific pair in TeachingAssignment), allow it.
      if (!isAssignedToClass || !isAssignedToSubject) {
        throw new ApiError('No teaching assignment for this class and subject', 403)
      }
    }
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
    select: {
      id: true,
      name: true,
      year_group: true,
      section: true,
      subjects: { select: { id: true, name: true } },
    },
  })

  const subjectRecord = await prisma.subject.findFirst({
    where: { schoolId, id: resolvedSubject },
    select: { id: true, name: true },
  })

  const hasSubjectOnClass =
    classRecord && subjectRecord
      ? (Array.isArray(classRecord.subjects) ? classRecord.subjects : []).some(
          (s) => String(s.id) === String(subjectRecord.id)
        )
      : false

  const yearGroup = String(classRecord?.year_group || '').trim()
  const section = String(classRecord?.section || '').trim()
  const compact = `${yearGroup}${section}`.trim()
  const spaced = `${yearGroup} ${section}`.trim()
  const classCandidates = classRecord
    ? Array.from(
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
    : []

  const fallbackStudents =
    classRecord && subjectRecord
      ? (
          await prisma.student.findMany({
            where: {
              schoolId,
              ...(classCandidates.length > 0
                ? { OR: [{ classId: classRecord.id }, { class: { in: classCandidates } }] }
                : { OR: [{ class: classRecord.name }, { class: classRecord.id }] }),
            },
            include: { user: true },
            orderBy: { name: 'asc' },
            take: 10000,
          })
        ).filter((s) => {
          if (hasSubjectOnClass) return true
          const selected = Array.isArray(s.selected_subjects) ? s.selected_subjects : []
          if (selected.length === 0) return true
          const targetName = String(subjectRecord.name || '')
            .trim()
            .toLowerCase()
          const targetId = String(subjectRecord.id || '')
            .trim()
            .toLowerCase()
          return selected.some((v) => {
            const norm = String(v || '')
              .trim()
              .toLowerCase()
            return norm === targetName || norm === targetId
          })
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
