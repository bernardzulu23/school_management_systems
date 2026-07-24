export const dynamic = 'force-dynamic'
/**
 * GET published timetable grid for the school (optional class/teacher filters). Source of truth for
 * teacher/student/HOD read-only views — not a local conflict engine.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCachedPublishedTimetableEntries } from '@/lib/cache/timetable'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'
import { getHodProfile } from '@/lib/utils/hodDepartmentScope'
import {
  buildTimeSlotsFromConfig,
  ensureTimetableConfig,
  normalizeTimetableConfig,
  resolveSchoolTimeSlots,
} from '@/lib/timetable/timeSlotsFromConfig'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import {
  mapDbEntriesToAssignments,
  buildTeacherWorkloadSummary,
} from '@/lib/timetable/mapEntriesToAssignments'
import { alignAssignmentsToBellRows } from '@/lib/timetable/gridHelpers'
import { loadTeacherColorMap, teacherColorMapToJson } from '@/lib/timetable/teacherColors'
import { getDraftConflictMeta, formatDraftMetaResponse } from '@/lib/timetable/conflictAudit'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

const VIEW_ENTRY_LIMIT = 2000

function isSchoolAdminRole(user) {
  return roleCheck(user, ['ADMIN', 'headteacher', 'administrator', 'superadmin'])
}

function isTeacherRole(user) {
  return roleCheck(user, ['TEACHER', 'teacher']) && !roleCheck(user, ['HOD', 'hod', 'ADMIN'])
}

function isStudentRole(user) {
  return roleCheck(user, ['STUDENT', 'student'])
}

function isHodRole(user) {
  return roleCheck(user, ['HOD', 'hod'])
}

/**
 * Department teachers for HOD wall view — same scoping as /api/users?scope=department.
 */
async function resolveDepartmentTeacherUserIds(prisma, schoolId, user) {
  const hodProfile = await getHodProfile(prisma, user.id, schoolId)
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

  const ids = new Set(teachers.map((t) => t.userId).filter(Boolean))
  // HOD may also teach — include their own User.id so personal periods appear.
  if (user?.id) ids.add(String(user.id))
  return Array.from(ids)
}

function daySortKey(day) {
  const order = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  }
  return (
    order[
      String(day || '')
        .trim()
        .toLowerCase()
    ] ?? 99
  )
}

export const GET = withErrorHandler(async function GET(req) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) {
    return NextResponse.json({ error: 'No school' }, { status: 401 })
  }

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) {
    return typeCheck.response
  }

  const { searchParams } = new URL(req.url)
  const term = safeQueryString(searchParams.get('term'), { defaultValue: 'Term 1' })
  const academicYear = safeQueryString(searchParams.get('academicYear'), {
    defaultValue: String(new Date().getFullYear()),
  })
  const statusParam = safeQueryString(searchParams.get('status'))
  const schoolAdmin = isSchoolAdminRole(user)
  const student = isStudentRole(user)
  const hod = isHodRole(user)
  const teacher = isTeacherRole(user)
  const scopeParam = safeQueryString(searchParams.get('scope'), { defaultValue: '' }).toLowerCase()
  const wantDepartmentScope =
    hod ||
    (teacher &&
      scopeParam === 'department' &&
      Boolean(await getHodProfile(prisma, user.id, schoolId)))

  // Non-editors always see published — ignore status=draft from clients.
  const status = schoolAdmin
    ? statusParam || safeQueryString(searchParams.get('prefer'), { defaultValue: 'published' })
    : 'published'

  const config = await ensureTimetableConfig(prisma, schoolId)

  const where = { schoolId, term, academicYear, status }
  /** Echoed to clients so student UI can render without waiting on auth.studentProfile.classId */
  let scopedClassId = null

  if (wantDepartmentScope) {
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
        message: 'No department teachers found for this HOD profile',
      })
    }
    where.teacherId = { in: teacherUserIds }
  } else if (teacher) {
    // TimetableAllocationEntry.teacherId is User.id
    where.teacherId = user.id
  } else if (student) {
    const studentRow = await prisma.student.findFirst({
      where: { schoolId, userId: user.id },
      select: { id: true, classId: true },
    })
    if (!studentRow?.classId) {
      return NextResponse.json({
        entries: [],
        assignments: [],
        timeSlots: buildTimeSlotsFromConfig(config),
        teacherSummaries: [],
        config,
        term,
        academicYear,
        status,
        classId: null,
        message: 'No class assigned to this student',
      })
    }
    // Class timetable only — do not also filter by enrollments/selected_subjects
    // (incomplete elective lists were wiping most periods).
    where.classId = studentRow.classId
    scopedClassId = studentRow.classId
  }

  let entries
  if (status === 'published') {
    const cached = await getCachedPublishedTimetableEntries(schoolId, term, academicYear)
    entries = cached.filter((row) => {
      // Prefer `{ in: [...] }` before scalar compare — `String({ in })` is "[object Object]"
      // and would discard every row for HOD department views.
      if (where.teacherId?.in) {
        if (!where.teacherId.in.map(String).includes(String(row.teacherId))) return false
      } else if (where.teacherId) {
        if (String(row.teacherId) !== String(where.teacherId)) return false
      }
      if (where.classId && String(row.classId) !== String(where.classId)) return false
      if (where.subjectId?.in) {
        const allowed = where.subjectId.in.map(String)
        if (!allowed.includes(String(row.subjectId))) return false
      } else if (where.subjectId) {
        if (String(row.subjectId) !== String(where.subjectId)) return false
      }
      return true
    })
    entries.sort((a, b) => {
      const day = daySortKey(a.dayOfWeek) - daySortKey(b.dayOfWeek)
      if (day !== 0) return day
      return (a.periodNumber || 0) - (b.periodNumber || 0)
    })
  } else {
    entries = await prisma.timetableAllocationEntry.findMany({
      where: { schoolId, ...where },
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
      take: VIEW_ENTRY_LIMIT,
    })
  }

  let assignments = mapDbEntriesToAssignments(entries)

  const teacherUserIds = [
    ...new Set(assignments.map((a) => String(a.teacherId || '').trim()).filter(Boolean)),
  ]
  if (teacherUserIds.length) {
    const teacherUsers = await prisma.user.findMany({
      where: { schoolId, id: { in: teacherUserIds } },
      select: { id: true, name: true },
    })
    const teacherNameById = new Map(teacherUsers.map((u) => [String(u.id), u.name || 'Teacher']))
    assignments = assignments.map((a) => ({
      ...a,
      teacherName: teacherNameById.get(String(a.teacherId)) || a.teacherName || 'Teacher',
    }))
  }

  const missingSubjectIds = [
    ...new Set(
      assignments
        .filter((a) => a.subjectId && !String(a.subjectName || '').trim())
        .map((a) => String(a.subjectId))
    ),
  ]
  if (missingSubjectIds.length) {
    const subjects = await prisma.subject.findMany({
      where: { schoolId, id: { in: missingSubjectIds } },
      select: { id: true, name: true, code: true },
    })
    const subjectNameById = new Map(
      subjects.map((s) => [String(s.id), s.name || s.code || 'Subject'])
    )
    assignments = assignments.map((a) => ({
      ...a,
      subjectName:
        String(a.subjectName || '').trim() || subjectNameById.get(String(a.subjectId)) || 'Subject',
    }))
  }
  const normalizedConfig = normalizeTimetableConfig(config)
  const configSlots = buildTimeSlotsFromConfig(normalizedConfig)
  const dbSlots = await prisma.timeSlot.findMany({
    where: { schoolId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })
  const timeSlots = resolveSchoolTimeSlots(normalizedConfig, dbSlots.length ? dbSlots : configSlots)

  assignments = alignAssignmentsToBellRows(assignments, timeSlots)

  const hideTeacher = student
  const safeAssignments = hideTeacher
    ? assignments.map((a) => ({
        ...a,
        teacherId: undefined,
        teacherName: undefined,
      }))
    : assignments

  const teacherSummaries =
    wantDepartmentScope || schoolAdmin
      ? buildTeacherWorkloadSummary(assignments)
      : teacher
        ? buildTeacherWorkloadSummary(assignments).filter(
            (t) => String(t.teacherId) === String(user.id)
          )
        : []

  const teacherColorMap = await loadTeacherColorMap(prisma, schoolId)

  let draftMeta = null
  if (schoolAdmin || hod || wantDepartmentScope) {
    const metaRow = await getDraftConflictMeta(prisma, { schoolId, term, academicYear })
    draftMeta = formatDraftMetaResponse(metaRow, {
      term,
      academicYear,
      includeSummary: schoolAdmin,
    })
  }

  return NextResponse.json({
    entries,
    assignments: safeAssignments,
    timeSlots,
    teacherSummaries,
    config: normalizedConfig,
    teacherColors: teacherColorMapToJson(teacherColorMap),
    term,
    academicYear,
    status,
    total: entries.length,
    draftMeta,
    ...(scopedClassId ? { classId: scopedClassId } : {}),
  })
})
