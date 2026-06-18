import { mapDbEntriesToAssignments } from '@/lib/timetable/mapEntriesToAssignments'
import {
  validateTimetable,
  getHardConflicts,
  getSoftConflicts,
} from '@/lib/timetable/validateTimetable'

const MAX_TEACHER_PERIODS_PER_WEEK = 35

const SUGGESTED_FIXES = {
  TEACHER_DOUBLE_BOOKED:
    'Remove the teacher from one of the conflicting classes, or assign a substitute teacher to one of them.',
  CLASS_DOUBLE_BOOKED: 'Move one subject to a different time slot, or remove the duplicate entry.',
  ROOM_DOUBLE_BOOKED: 'Move one class to a different room or time slot.',
  TEACHER_CONSECUTIVE_LIMIT:
    'Add a free period on this day to break up the consecutive teaching block.',
  CONSECUTIVE_OVERLOAD: 'Add a free period on this day to break up the consecutive teaching block.',
  SUBJECT_DISTRIBUTION: 'Spread this subject across more days for better distribution.',
  TEACHER_OVER_ALLOCATED:
    "Remove periods from this teacher's timetable, or adjust their allocation in Department Allocations.",
  MISSING_PERIODS:
    'Generate or manually place the remaining periods for this class/subject allocation.',
}

function dedupeValidationConflicts(conflicts) {
  const seen = new Set()
  const out = []
  for (const c of conflicts || []) {
    const key = `${c.type}|${c.severity}|${[...(c.assignmentIds || [])].sort().join(',')}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}

function groupByType(conflicts) {
  return (conflicts || []).reduce((acc, c) => {
    const t = c.type
    if (!acc[t]) acc[t] = []
    acc[t].push(c)
    return acc
  }, {})
}

function mapValidationToUiConflict(c, assignmentById, index) {
  const ids = (c.assignmentIds || []).map(String)
  const a0 = assignmentById.get(ids[0])
  const a1 = assignmentById.get(ids[1])
  const uiType = c.type === 'TEACHER_CONSECUTIVE_LIMIT' ? 'CONSECUTIVE_OVERLOAD' : c.type
  const severity = c.severity === 'hard' ? 'error' : 'warning'

  let description = c.message
  if (c.type === 'TEACHER_DOUBLE_BOOKED' && a0 && a1) {
    description = `${a0.teacherName || 'Teacher'} is assigned to ${a0.className || 'class'} and ${a1.className || 'class'} at the same time (${a0.dayOfWeek} ${a0.startTime})`
  } else if (c.type === 'CLASS_DOUBLE_BOOKED' && a0 && a1) {
    const subjects = [a0.subjectName, a1.subjectName].filter(Boolean)
    description = `${a0.className || 'Class'} is scheduled for ${subjects.join(' and ') || 'multiple subjects'} at the same time (${a0.dayOfWeek} ${a0.startTime})`
  } else if (c.type === 'TEACHER_CONSECUTIVE_LIMIT' && a0) {
    description = `${a0.teacherName || 'Teacher'} has more than 4 consecutive teaching periods on ${a0.dayOfWeek} without a break`
  }

  const subjectNames = [
    ...new Set(ids.map((id) => assignmentById.get(id)?.subjectName).filter(Boolean)),
  ]

  return {
    id: `conflict_${index + 1}`,
    type: uiType,
    severity,
    description,
    suggestedFix:
      SUGGESTED_FIXES[uiType] ||
      SUGGESTED_FIXES[c.type] ||
      'Review and adjust the affected timetable entries.',
    affectedEntryIds: ids,
    teacherId: a0?.teacherId || c.entityId,
    teacherName: a0?.teacherName,
    classId: a0?.classId || c.entityId,
    className: a0?.className,
    day: a0?.dayOfWeek,
    startTime: a0?.startTime,
    subjectNames,
  }
}

async function auditTeacherWorkload(prisma, schoolId, term, academicYear, assignments) {
  const allocations = await prisma.teacherAllocation.findMany({
    where: { schoolId, term, academicYear, status: 'pushed' },
    include: { teacher: { select: { id: true, name: true } } },
  })

  const budgetByTeacher = new Map()
  for (const a of allocations) {
    const tid = String(a.teacherId)
    budgetByTeacher.set(tid, (budgetByTeacher.get(tid) || 0) + Number(a.periodsPerWeek || 0))
  }

  const actualByTeacher = new Map()
  for (const a of assignments || []) {
    const tid = String(a.teacherId || '')
    if (!tid) continue
    actualByTeacher.set(tid, (actualByTeacher.get(tid) || 0) + 1)
  }

  const conflicts = []
  let idx = 0

  for (const [teacherId, assigned] of actualByTeacher) {
    const allocBudget = budgetByTeacher.get(teacherId)
    const maxPeriods = Math.min(
      allocBudget != null && allocBudget > 0 ? allocBudget : MAX_TEACHER_PERIODS_PER_WEEK,
      MAX_TEACHER_PERIODS_PER_WEEK
    )
    if (assigned <= maxPeriods) continue

    const teacherName =
      assignments.find((a) => String(a.teacherId) === teacherId)?.teacherName ||
      allocations.find((a) => String(a.teacherId) === teacherId)?.teacher?.name ||
      'Teacher'
    const overBy = assigned - maxPeriods

    conflicts.push({
      id: `workload_${++idx}`,
      type: 'TEACHER_OVER_ALLOCATED',
      severity: 'warning',
      description: `${teacherName} is assigned ${assigned} periods/week but their maximum is ${maxPeriods} (over by ${overBy})`,
      suggestedFix: SUGGESTED_FIXES.TEACHER_OVER_ALLOCATED.replace('this teacher', teacherName),
      affectedEntryIds: (assignments || [])
        .filter((a) => String(a.teacherId) === teacherId)
        .map((a) => String(a.id)),
      teacherId,
      teacherName,
    })
  }

  return conflicts
}

async function auditMissingPeriods(prisma, schoolId, term, academicYear, entries) {
  const allocations = await prisma.teacherAllocation.findMany({
    where: { schoolId, term, academicYear, status: 'pushed' },
    include: {
      teacher: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
    },
  })

  const countByAllocation = new Map()
  for (const e of entries || []) {
    const aid = String(e.allocationId)
    countByAllocation.set(aid, (countByAllocation.get(aid) || 0) + 1)
  }

  const conflicts = []
  let idx = 0

  for (const alloc of allocations) {
    const expected = Number(alloc.periodsPerWeek || 0)
    if (expected <= 0) continue
    const placed = countByAllocation.get(String(alloc.id)) || 0
    if (placed >= expected) continue

    const missing = expected - placed
    const className = alloc.class?.name || 'class'
    const subjectName = alloc.subject?.name || 'subject'
    const teacherName = alloc.teacher?.name || 'teacher'

    conflicts.push({
      id: `missing_${++idx}`,
      type: 'MISSING_PERIODS',
      severity: 'warning',
      description: `${className} — ${subjectName} (${teacherName}) is missing ${missing} of ${expected} scheduled period(s)`,
      suggestedFix: SUGGESTED_FIXES.MISSING_PERIODS,
      affectedEntryIds: (entries || [])
        .filter((e) => String(e.allocationId) === String(alloc.id))
        .map((e) => String(e.id)),
      teacherId: alloc.teacherId,
      teacherName,
      classId: alloc.classId,
      className,
      subjectNames: [subjectName],
    })
  }

  return conflicts
}

export async function loadDraftTimetableEntries(prisma, { schoolId, term, academicYear }) {
  return prisma.timetableAllocationEntry.findMany({
    where: { schoolId, term, academicYear, status: 'draft' },
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
}

/**
 * Full server-side audit of draft TimetableAllocationEntry rows for a term.
 */
export async function auditDraftTimetable(prisma, { schoolId, term, academicYear }) {
  const entries = await loadDraftTimetableEntries(prisma, { schoolId, term, academicYear })

  if (!entries.length) {
    return {
      schoolId,
      term,
      academicYear,
      versionId: null,
      totalConflicts: 0,
      errorCount: 0,
      warningCount: 0,
      conflicts: [],
      byType: {},
      canPublish: false,
      scannedAt: new Date().toISOString(),
      entryCount: 0,
      message: 'No draft timetable entries found. Generate a timetable first.',
    }
  }

  const assignments = mapDbEntriesToAssignments(entries)
  const raw = validateTimetable(assignments, { includeRoomChecks: false })
  const deduped = dedupeValidationConflicts(raw)
  const assignmentById = new Map(assignments.map((a) => [String(a.id), a]))

  const validationConflicts = deduped.map((c, i) => mapValidationToUiConflict(c, assignmentById, i))

  const [workloadConflicts, missingConflicts] = await Promise.all([
    auditTeacherWorkload(prisma, schoolId, term, academicYear, assignments),
    auditMissingPeriods(prisma, schoolId, term, academicYear, entries),
  ])

  const conflicts = [...validationConflicts, ...workloadConflicts, ...missingConflicts]

  const errorCount = conflicts.filter((c) => c.severity === 'error').length
  const warningCount = conflicts.filter((c) => c.severity === 'warning').length

  return {
    schoolId,
    term,
    academicYear,
    versionId: `${schoolId}:${term}:${academicYear}`,
    totalConflicts: conflicts.length,
    errorCount,
    warningCount,
    conflicts,
    byType: groupByType(conflicts),
    canPublish: errorCount === 0,
    scannedAt: new Date().toISOString(),
    entryCount: entries.length,
    hardValidation: getHardConflicts(raw),
    softValidation: getSoftConflicts(raw),
  }
}

export async function persistDraftConflictMeta(prisma, { schoolId, term, academicYear, summary }) {
  const preview = (summary?.conflicts || []).slice(0, 20)
  return prisma.timetableDraftMeta.upsert({
    where: {
      schoolId_term_academicYear: { schoolId, term, academicYear },
    },
    create: {
      schoolId,
      term,
      academicYear,
      conflictCount: summary.totalConflicts || 0,
      conflictErrors: summary.errorCount || 0,
      conflictWarnings: summary.warningCount || 0,
      conflictSummary: preview,
      lastScannedAt: new Date(),
      canPublish: Boolean(summary.canPublish),
    },
    update: {
      conflictCount: summary.totalConflicts || 0,
      conflictErrors: summary.errorCount || 0,
      conflictWarnings: summary.warningCount || 0,
      conflictSummary: preview,
      lastScannedAt: new Date(),
      canPublish: Boolean(summary.canPublish),
    },
  })
}

export async function getDraftConflictMeta(prisma, { schoolId, term, academicYear }) {
  return prisma.timetableDraftMeta.findUnique({
    where: {
      schoolId_term_academicYear: { schoolId, term, academicYear },
    },
  })
}
