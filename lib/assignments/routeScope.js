import prisma from '@/lib/prisma'
import { roleCheck } from '@/lib/middleware/auth'
import { ApiError } from '@/lib/middleware/errorHandler'

export function isStaffBypass(user) {
  return roleCheck(user, ['ADMIN', 'headteacher', 'HOD', 'hod'])
}

export function buildTeacherAssignmentCtx(teacherProfile) {
  const assignmentPairs = new Set(
    (teacherProfile?.teachingAssignments || [])
      .filter((a) => a?.classId && a?.subjectId)
      .map((a) => `${a.classId}:${a.subjectId}`)
  )
  const hasTeachingAssignments = assignmentPairs.size > 0
  const allowedClassIds = new Set((teacherProfile?.classes || []).map((c) => String(c.id)))
  const allowedSubjectIds = new Set((teacherProfile?.subjects || []).map((s) => String(s.id)))
  const assignedSubjectTokens = new Set(
    (Array.isArray(teacherProfile?.assignedSubjects) ? teacherProfile.assignedSubjects : [])
      .map((v) =>
        String(v || '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
  )
  for (const a of teacherProfile?.teachingAssignments || []) {
    if (a?.subject?.name) assignedSubjectTokens.add(String(a.subject.name).toLowerCase())
    if (a?.subject?.id) allowedSubjectIds.add(String(a.subject.id))
  }
  for (const s of teacherProfile?.subjects || []) {
    if (s?.name) assignedSubjectTokens.add(String(s.name).toLowerCase())
  }
  return {
    assignmentPairs,
    hasTeachingAssignments,
    allowedClassIds,
    allowedSubjectIds,
    assignedSubjectTokens,
  }
}

export async function loadTeacherProfile(userId, schoolId) {
  return prisma.teacher.findFirst({
    where: { userId: String(userId || ''), schoolId },
    include: {
      teachingAssignments: {
        where: { schoolId },
        include: { subject: { select: { id: true, name: true } } },
      },
      classes: { select: { id: true, teacherId: true } },
      subjects: { select: { id: true, name: true } },
    },
  })
}

export function teacherMayManageClassSubject(
  ctx,
  teacherProfile,
  classRecord,
  classId,
  subjectId,
  subjectNameLower
) {
  const isAssignedToClass =
    ctx.allowedClassIds.has(classId) ||
    String(classRecord?.teacherId || '') === String(teacherProfile?.id || '')

  const isAssignedToSubject =
    ctx.allowedSubjectIds.has(subjectId) ||
    ctx.assignedSubjectTokens.has(String(subjectId || '').toLowerCase()) ||
    (subjectNameLower ? ctx.assignedSubjectTokens.has(subjectNameLower) : false)

  return ctx.hasTeachingAssignments
    ? ctx.assignmentPairs.has(`${classId}:${subjectId}`)
    : isAssignedToClass && isAssignedToSubject
}

/**
 * Verify teacher may manage a class + subject (by subject id and/or name).
 */
export async function assertTeacherTeachesClassSubject({
  schoolId,
  user,
  classId,
  subjectId,
  subjectName,
}) {
  if (isStaffBypass(user)) return

  const teacher = await loadTeacherProfile(user.id, schoolId)
  if (!teacher) throw new ApiError('Forbidden', 403)

  const safeClassId = String(classId || '').trim()
  if (!safeClassId) throw new ApiError('classId is required', 400)

  let resolvedSubjectId = String(subjectId || '').trim()
  const subjectNameLower = String(subjectName || '')
    .trim()
    .toLowerCase()

  if (!resolvedSubjectId && subjectNameLower) {
    const subject = await prisma.subject.findFirst({
      where: { schoolId, name: { equals: subjectName, mode: 'insensitive' } },
      select: { id: true },
    })
    resolvedSubjectId = subject?.id || ''
  }

  const classRecord = await prisma.class.findFirst({
    where: { id: safeClassId, schoolId },
    select: { id: true, teacherId: true },
  })
  if (!classRecord) throw new ApiError('Class not found', 404)

  const ctx = buildTeacherAssignmentCtx(teacher)
  if (
    teacherMayManageClassSubject(
      ctx,
      teacher,
      classRecord,
      safeClassId,
      resolvedSubjectId,
      subjectNameLower
    )
  ) {
    return { teacher, classRecord, subjectId: resolvedSubjectId }
  }

  throw new ApiError('Not assigned to this class and subject', 403)
}

/**
 * Build Prisma where for listing assignments visible to a teacher.
 */
export async function buildTeacherAssignmentWhere(schoolId, user) {
  if (isStaffBypass(user)) return { schoolId }

  const teacher = await loadTeacherProfile(user.id, schoolId)
  if (!teacher) throw new ApiError('Forbidden', 403)

  const ctx = buildTeacherAssignmentCtx(teacher)
  const orClauses = [{ teacherId: teacher.id }]

  for (const pair of ctx.assignmentPairs) {
    const [classId, subjectId] = pair.split(':')
    const subject =
      teacher.teachingAssignments.find(
        (a) => String(a.classId) === classId && String(a.subjectId) === subjectId
      )?.subject || null
    if (subject?.name) {
      orClauses.push({ classId, subject: subject.name })
    }
  }

  if (!ctx.hasTeachingAssignments) {
    const subjectNames = [...ctx.assignedSubjectTokens]
    const classIds = [...ctx.allowedClassIds]
    if (classIds.length && subjectNames.length) {
      for (const classId of classIds) {
        for (const name of subjectNames) {
          orClauses.push({ classId, subject: { equals: name, mode: 'insensitive' } })
        }
      }
    }
  }

  return { schoolId, OR: orClauses }
}

export async function assertTeacherManagesAssignment({ schoolId, user, assignment }) {
  if (isStaffBypass(user)) return
  if (!assignment) throw new ApiError('Not found', 404)

  if (assignment.teacherId) {
    const teacher = await loadTeacherProfile(user.id, schoolId)
    if (teacher && String(assignment.teacherId) === String(teacher.id)) return
  }

  await assertTeacherTeachesClassSubject({
    schoolId,
    user,
    classId: assignment.classId,
    subjectName: assignment.subject,
  })
}
