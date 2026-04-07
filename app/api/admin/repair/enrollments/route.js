import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

function normalizeString(value) {
  return String(value || '').trim()
}

export const POST = withErrorHandler(async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const classId = normalizeString(body?.classId)
  const className = normalizeString(body?.className)
  const yearGroup = normalizeString(body?.yearGroup)
  const dryRun = Boolean(body?.dryRun)

  if (!classId && !className && !yearGroup) {
    throw new ApiError('classId, className, or yearGroup is required', 400)
  }

  const classes = await prisma.class.findMany({
    where: {
      schoolId,
      ...(classId ? { id: classId } : {}),
      ...(className ? { name: className } : {}),
      ...(yearGroup ? { year_group: yearGroup } : {}),
    },
    include: { subjects: { select: { id: true, name: true } } },
  })

  if (classes.length === 0) {
    throw new ApiError('Class not found', 404)
  }

  const schoolSubjects = await prisma.subject.findMany({
    where: { schoolId },
    select: { id: true, name: true },
    take: 5000,
  })

  const subjectById = new Map(schoolSubjects.map((s) => [String(s.id), s]))
  const subjectByLowerName = new Map(
    schoolSubjects.map((s) => [String(s.name).trim().toLowerCase(), s])
  )

  let classesProcessed = 0
  let studentsProcessed = 0
  let enrollmentsToCreate = 0
  let studentsUpdated = 0

  for (const cls of classes) {
    classesProcessed += 1

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        OR: [{ class: cls.name }, { class: cls.id }, { class: cls.year_group }],
      },
      select: { id: true, class: true, selected_subjects: true },
      take: 10000,
    })

    if (students.length === 0) continue

    const rows = []
    const studentUpdates = []

    for (const student of students) {
      studentsProcessed += 1

      const selectedRaw = Array.isArray(student.selected_subjects)
        ? student.selected_subjects.map((s) => normalizeString(s)).filter(Boolean)
        : []

      let resolvedSubjects = []

      if (selectedRaw.length > 0) {
        const resolvedSet = new Map()
        for (const entry of selectedRaw) {
          const byId = subjectById.get(entry)
          if (byId) {
            resolvedSet.set(byId.id, byId)
            continue
          }
          const byName = subjectByLowerName.get(entry.toLowerCase())
          if (byName) resolvedSet.set(byName.id, byName)
        }
        resolvedSubjects = Array.from(resolvedSet.values())
      }

      if (resolvedSubjects.length === 0 && Array.isArray(cls.subjects) && cls.subjects.length > 0) {
        resolvedSubjects = cls.subjects
      }

      if (resolvedSubjects.length === 0) continue

      const normalizedStudentClass = student.class === cls.id ? cls.name : student.class
      const nextSelectedNames = resolvedSubjects.map((s) => s.name)

      if (normalizedStudentClass !== student.class) {
        studentUpdates.push({
          id: student.id,
          data: { class: normalizedStudentClass, selected_subjects: nextSelectedNames },
        })
      } else {
        const same =
          Array.isArray(student.selected_subjects) &&
          student.selected_subjects.length === nextSelectedNames.length &&
          student.selected_subjects.every((v, i) => v === nextSelectedNames[i])
        if (!same) {
          studentUpdates.push({
            id: student.id,
            data: { selected_subjects: nextSelectedNames },
          })
        }
      }

      for (const sub of resolvedSubjects) {
        rows.push({
          schoolId,
          pupilId: student.id,
          subjectId: sub.id,
          classId: cls.id,
        })
      }
    }

    enrollmentsToCreate += rows.length
    studentsUpdated += studentUpdates.length

    if (!dryRun) {
      if (rows.length > 0) {
        const chunkSize = 1000
        for (let i = 0; i < rows.length; i += chunkSize) {
          await prisma.pupilSubjectEnrollment.createMany({
            data: rows.slice(i, i + chunkSize),
            skipDuplicates: true,
          })
        }
      }

      if (studentUpdates.length > 0) {
        await prisma.$transaction(
          studentUpdates.map((u) =>
            prisma.student.update({
              where: { id: u.id },
              data: u.data,
            })
          )
        )
      }
    }
  }

  return NextResponse.json({
    success: true,
    dryRun,
    classesProcessed,
    studentsProcessed,
    enrollmentsPlanned: enrollmentsToCreate,
    studentsUpdatedPlanned: studentsUpdated,
  })
})
