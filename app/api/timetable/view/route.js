export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'
import {
  buildTimeSlotsFromConfig,
  buildTimeSlotsFromEntries,
  ensureTimetableConfig,
  mergeTimeSlotGrids,
  normalizeTimetableConfig,
} from '@/lib/timetable/timeSlotsFromConfig'
import {
  mapDbEntriesToAssignments,
  buildTeacherWorkloadSummary,
} from '@/lib/timetable/mapEntriesToAssignments'

function roleKey(role) {
  return String(role || '').toLowerCase()
}

function isSchoolAdmin(role) {
  const r = roleKey(role)
  return ['headteacher', 'admin', 'administrator', 'superadmin'].includes(r)
}

async function resolveStudentSubjectIds(prisma, schoolId, student) {
  const ids = new Set()

  const enrollments = await prisma.pupilSubjectEnrollment.findMany({
    where: { schoolId, pupilId: student.id },
    select: { subjectId: true },
  })
  for (const e of enrollments) ids.add(e.subjectId)

  const selected = Array.isArray(student.selected_subjects) ? student.selected_subjects : []
  if (selected.length) {
    const subjects = await prisma.subject.findMany({
      where: { schoolId },
      select: { id: true, name: true },
    })
    for (const name of selected) {
      const match = subjects.find(
        (s) => String(s.name).toLowerCase() === String(name).toLowerCase()
      )
      if (match) ids.add(match.id)
    }
  }

  return ids
}

async function resolveDepartmentTeacherUserIds(prisma, schoolId, user) {
  const hodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId: user.id, schoolId },
    select: { departmentId: true, department: true },
  })
  if (!hodProfile) return []

  const resolved = await resolveDepartmentScope({
    prisma,
    schoolId,
    departmentId: hodProfile.departmentId,
    departmentName: hodProfile.department,
  })

  const departmentIds = resolved.departmentIds
  const aliases = resolved.departmentNameAliases

  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId,
      ...(departmentIds.length || aliases.length
        ? {
            OR: [
              ...(departmentIds.length
                ? [{ departments: { some: { departmentId: { in: departmentIds } } } }]
                : []),
              ...(aliases.length
                ? aliases.map((n) => ({ department: { equals: n, mode: 'insensitive' } }))
                : []),
            ],
          }
        : {}),
    },
    select: { userId: true },
    take: 5000,
  })

  return teachers.map((t) => t.userId).filter(Boolean)
}

export async function GET(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const term = searchParams.get('term') || 'Term 1'
  const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear())
  const statusParam = searchParams.get('status')
  const role = roleKey(user.role)

  const status =
    statusParam || (isSchoolAdmin(role) ? searchParams.get('prefer') || 'published' : 'published')

  const config = await ensureTimetableConfig(prisma, schoolId)

  const where = { schoolId, term, academicYear, status }

  if (role === 'teacher') {
    where.teacherId = user.id
  } else if (role === 'student') {
    const student = await prisma.student.findFirst({
      where: { schoolId, userId: user.id },
      select: {
        id: true,
        classId: true,
        selected_subjects: true,
      },
    })
    if (!student?.classId) {
      return NextResponse.json({
        entries: [],
        assignments: [],
        timeSlots: buildTimeSlotsFromConfig(config),
        teacherSummaries: [],
        config,
        term,
        academicYear,
        status,
        message: 'No class assigned to this student',
      })
    }
    where.classId = student.classId

    const subjectIds = await resolveStudentSubjectIds(prisma, schoolId, student)
    if (subjectIds.size > 0) {
      where.subjectId = { in: Array.from(subjectIds) }
    }
  } else if (role === 'hod') {
    const teacherUserIds = await resolveDepartmentTeacherUserIds(prisma, schoolId, user)
    if (!teacherUserIds.length) {
      return NextResponse.json({
        entries: [],
        assignments: [],
        timeSlots: buildTimeSlotsFromConfig(config),
        teacherSummaries: [],
        config,
        term,
        academicYear,
        status,
      })
    }
    where.teacherId = { in: teacherUserIds }
  }

  const entries = await prisma.timetableAllocationEntry.findMany({
    where,
    include: {
      allocation: {
        include: {
          teacher: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
  })

  const assignments = mapDbEntriesToAssignments(entries)
  const configSlots = buildTimeSlotsFromConfig(config)
  const entrySlots = buildTimeSlotsFromEntries(assignments)
  const timeSlots = mergeTimeSlotGrids(configSlots, entrySlots)

  const hideTeacher = role === 'student'
  const safeAssignments = hideTeacher
    ? assignments.map((a) => ({
        ...a,
        teacherId: undefined,
        teacherName: undefined,
      }))
    : assignments

  const teacherSummaries =
    role === 'teacher'
      ? buildTeacherWorkloadSummary(assignments).filter(
          (t) => String(t.teacherId) === String(user.id)
        )
      : role === 'hod' || isSchoolAdmin(role)
        ? buildTeacherWorkloadSummary(assignments)
        : []

  const normalizedConfig = normalizeTimetableConfig(config)

  return NextResponse.json({
    entries,
    assignments: safeAssignments,
    timeSlots,
    teacherSummaries,
    config: normalizedConfig,
    term,
    academicYear,
    status,
    total: entries.length,
  })
}
