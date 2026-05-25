export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const dryRun = Boolean(body?.dryRun)
  const take = Math.min(5000, Math.max(1, Number(body?.take || 2000)))

  const missing = await prisma.result.findMany({
    where: { schoolId, enteredByUserId: null },
    select: { id: true, studentId: true, subjectId: true },
    take,
    orderBy: { updatedAt: 'desc' },
  })

  const studentIds = Array.from(new Set(missing.map((r) => String(r.studentId)).filter(Boolean)))
  const subjectIds = Array.from(new Set(missing.map((r) => String(r.subjectId)).filter(Boolean)))

  const enrollments =
    studentIds.length > 0 && subjectIds.length > 0
      ? await prisma.pupilSubjectEnrollment.findMany({
          where: { schoolId, pupilId: { in: studentIds }, subjectId: { in: subjectIds } },
          select: { pupilId: true, subjectId: true, classId: true },
          take: 50000,
        })
      : []

  const enrollmentKey = (pupilId, subjectId) => `${String(pupilId)}::${String(subjectId)}`
  const classByStudentSubject = new Map()
  enrollments.forEach((e) => {
    if (!e?.pupilId || !e?.subjectId || !e?.classId) return
    const key = enrollmentKey(e.pupilId, e.subjectId)
    if (!classByStudentSubject.has(key)) classByStudentSubject.set(key, String(e.classId))
  })

  const classIds = Array.from(new Set(Array.from(classByStudentSubject.values()).filter(Boolean)))

  const teachingAssignments =
    classIds.length > 0 && subjectIds.length > 0
      ? await prisma.teachingAssignment.findMany({
          where: { schoolId, classId: { in: classIds }, subjectId: { in: subjectIds } },
          select: { classId: true, subjectId: true, teacher: { select: { userId: true } } },
          take: 50000,
        })
      : []

  const assignmentKey = (classId, subjectId) => `${String(classId)}::${String(subjectId)}`
  const teacherUserByClassSubject = new Map()
  teachingAssignments.forEach((a) => {
    const userId = a?.teacher?.userId ? String(a.teacher.userId) : ''
    if (!userId) return
    const key = assignmentKey(a.classId, a.subjectId)
    if (!teacherUserByClassSubject.has(key)) teacherUserByClassSubject.set(key, userId)
  })

  const subjectTeachers =
    subjectIds.length > 0
      ? await prisma.subject.findMany({
          where: { schoolId, id: { in: subjectIds } },
          select: { id: true, teacher: { select: { userId: true } } },
          take: 50000,
        })
      : []

  const teacherUserBySubjectId = new Map()
  subjectTeachers.forEach((s) => {
    const userId = s?.teacher?.userId ? String(s.teacher.userId) : ''
    if (!userId) return
    teacherUserBySubjectId.set(String(s.id), userId)
  })

  const updates = []
  let inferred = 0
  let notInferred = 0

  for (const r of missing) {
    const key = enrollmentKey(r.studentId, r.subjectId)
    const classId = classByStudentSubject.get(key) || ''
    const userId =
      (classId ? teacherUserByClassSubject.get(assignmentKey(classId, r.subjectId)) : '') ||
      teacherUserBySubjectId.get(String(r.subjectId)) ||
      ''

    if (userId) {
      inferred += 1
      updates.push({ id: r.id, enteredByUserId: userId })
    } else {
      notInferred += 1
    }
  }

  if (!dryRun && updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.result.update({
          where: { id: u.id },
          data: { enteredByUserId: u.enteredByUserId },
        })
      )
    )
  }

  return NextResponse.json({
    success: true,
    dryRun,
    scanned: missing.length,
    inferred,
    notInferred,
    updated: dryRun ? 0 : updates.length,
  })
})
