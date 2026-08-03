/**
 * Build role-scoped offline seed payloads (server).
 */
import prisma from '@/lib/prisma'
import { formatTeachingAssignmentDtos, resolveTeacherLoad } from '@/lib/teachers/resolveTeacherLoad'

const SEED_TTL_DAYS = 14

function expiresAtIso() {
  return new Date(Date.now() + SEED_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * @param {{ schoolId: string, user: { id: string, role?: string }, roleHint?: string }} args
 */
export async function buildOfflineSeedPayload({ schoolId, user, roleHint }) {
  const role = String(roleHint || user.role || 'TEACHER').toUpperCase()
  const exportedAt = new Date().toISOString()
  const base = {
    schoolId,
    userId: user.id,
    role,
    exportedAt,
    expiresAt: expiresAtIso(),
    data: { caches: {}, rosters: [] },
  }

  if (role === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { schoolId, userId: user.id },
      select: {
        id: true,
        name: true,
        classId: true,
        class: true,
        exam_number: true,
      },
    })
    base.data.caches['seed:student-profile'] = student
    if (student?.classId) {
      const peers = await prisma.student.findMany({
        where: { schoolId, classId: student.classId },
        select: { id: true, name: true, exam_number: true },
        take: 80,
        orderBy: { name: 'asc' },
      })
      base.data.rosters.push({
        classId: student.classId,
        schoolId,
        students: peers,
      })
    }
    return base
  }

  if (role === 'PARENT') {
    const links = await prisma.parentStudentLink.findMany({
      where: {
        schoolId,
        parentUserId: user.id,
        status: 'active',
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            classId: true,
            class: true,
            exam_number: true,
          },
        },
      },
      take: 20,
    })
    const children = links.map((l) => l.student).filter(Boolean)
    base.data.caches['seed:parent-children'] = children
    for (const child of children) {
      if (!child.classId) continue
      if (base.data.rosters.some((r) => r.classId === child.classId)) continue
      const peers = await prisma.student.findMany({
        where: { schoolId, classId: child.classId },
        select: { id: true, name: true, exam_number: true },
        take: 80,
        orderBy: { name: 'asc' },
      })
      base.data.rosters.push({ classId: child.classId, schoolId, students: peers })
    }
    return base
  }

  // School staff — prefer current teacher's assignments; HT/Admin get broader but capped sets
  const staffRoles = ['TEACHER', 'HOD', 'ADMIN', 'HEADTEACHER']
  if (!staffRoles.includes(role)) {
    base.data.caches['seed:note'] = { message: 'Role has limited offline seed data' }
    return base
  }

  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId: user.id },
    include: {
      user: { select: { id: true, name: true } },
      teachingAssignments: {
        where: { schoolId },
        include: { class: true, subject: true },
      },
    },
  })

  let assignmentDtos = []
  if (teacher) {
    const { assignments } = await resolveTeacherLoad({ schoolId, teacher })
    assignmentDtos = formatTeachingAssignmentDtos(assignments, teacher.user?.name)
  } else if (role === 'ADMIN' || role === 'HEADTEACHER' || role === 'HOD') {
    // No teacher profile — sample first N class rosters for HT offline browsing
    const classes = await prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      take: 12,
      orderBy: { name: 'asc' },
    })
    base.data.caches['seed:classes'] = classes
    for (const cls of classes) {
      const students = await prisma.student.findMany({
        where: { schoolId, classId: cls.id },
        select: { id: true, name: true, exam_number: true },
        take: 80,
        orderBy: { name: 'asc' },
      })
      base.data.rosters.push({ classId: cls.id, schoolId, students })
      base.data.caches[`pupils:${cls.id}`] = students
    }
    return base
  }

  base.data.caches[`teaching-assignments:${user.id}`] = assignmentDtos
  base.data.caches['seed:teaching-assignments'] = assignmentDtos

  const classIds = [...new Set(assignmentDtos.map((a) => a.classId).filter(Boolean))].slice(0, 15)

  for (const classId of classIds) {
    const subjectId = assignmentDtos.find((a) => a.classId === classId)?.subjectId
    const students = await prisma.student.findMany({
      where: { schoolId, classId },
      select: { id: true, name: true, exam_number: true, class: true },
      take: 80,
      orderBy: { name: 'asc' },
    })
    base.data.rosters.push({ classId, schoolId, students })
    base.data.caches[`pupils:${classId}${subjectId ? `:${subjectId}` : ''}`] = students
  }

  const year = String(new Date().getFullYear())
  const sbaTasks = await prisma.eczAssessment.findMany({
    where: {
      schoolId,
      component: 'SBA_TASK',
      OR: [{ academicYear: year }, { academicYear: null }],
    },
    select: {
      id: true,
      title: true,
      formLevel: true,
      subjectId: true,
      component: true,
    },
    take: 60,
  })
  base.data.caches['seed:sba-tasks'] = sbaTasks

  return base
}
