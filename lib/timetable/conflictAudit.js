import { mapDbEntriesToAssignments } from '@/lib/timetable/mapEntriesToAssignments'
import {
  validateTimetable,
  getHardConflicts,
  getSoftConflicts,
  dedupeValidationConflicts,
} from '@/lib/timetable/validateTimetable'
import {
  buildClassDoubleBookedMessage,
  buildRoomDoubleBookedMessage,
} from '@/lib/timetable/timeRangeOverlap'
import { parseSchedulingRulesJson } from '@/lib/timetable/teacherClassSessionRules'
import {
  ensureTimetableConfig,
  normalizeTimetableConfig,
  buildTimeSlotsFromConfig,
} from '@/lib/timetable/timeSlotsFromConfig'
import { CollisionDetector } from '@/lib/timetable/collisionDetector'
import { filterConflictsForActiveClasses } from '@/lib/timetable/filterActiveClassConflicts'
import { normalizeAllocationPeriods } from '@/lib/timetable/periodExpansion'
import { inferPeriodSpan } from '@/lib/timetable/doublePeriodUtils'

const MAX_TEACHER_PERIODS_PER_WEEK = 35

const SUGGESTED_FIXES = {
  CLASS_DOUBLE_BOOKED:
    'Move one subject to a free slot (see suggested times below), or remove the duplicate entry.',
  ROOM_DOUBLE_BOOKED: 'Move one class to a different room or suggested free time slot.',
  TEACHER_DOUBLE_BOOKED:
    'Remove the teacher from one of the conflicting classes, reassign, or move one lesson to a suggested free slot.',
  TEACHER_CONSECUTIVE_LIMIT:
    'Add a free period on this day to break up the consecutive teaching block.',
  CONSECUTIVE_OVERLOAD: 'Add a free period on this day to break up the consecutive teaching block.',
  TEACHER_DAY_OVERLOAD:
    'Move one or more of this teacher’s lessons to another day, or raise the school day-load limit in Timetable Settings.',
  TEACHER_OVERLOAD:
    'Move one or more of this teacher’s lessons to another day, or raise the school day-load limit in Timetable Settings.',
  TEACHER_BREAK_OVERLAP:
    'Move the lesson off the designated break/lunch window, or adjust break times in Timetable Settings.',
  SUBJECT_DISTRIBUTION: 'Spread this subject across more days for better distribution.',
  TEACHER_CLASS_SUBJECT_SPLIT:
    'Combine these into one continuous multi-period block, or move one session to another day.',
  TEACHER_CLASS_RETURN_TOO_SOON:
    'Leave at least the configured number of free periods before this teacher returns to the same class with a different subject, or move one lesson.',
  TEACHER_OVER_ALLOCATED:
    "Remove periods from this teacher's timetable, or adjust their allocation in Department Allocations.",
  MISSING_PERIODS:
    'Generate or manually place the remaining periods for this class/subject allocation.',
}

export function parseIgnoredAuditKeys(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((k) => String(k || '').trim()).filter(Boolean)
}

/** Stable key for dismiss / restore of a server audit row.
 * Prefer semantic identity (class/teacher/day/slot/allocation fields) over ephemeral
 * entry UUIDs — those change when duplicates are purged, slots are edited, or
 * TeacherAllocation rows are re-created on re-push.
 */
export function getConflictAuditKey(conflict) {
  if (!conflict || typeof conflict !== 'object') return ''

  const type = String(conflict.type || '').trim()
  const classId = String(conflict.classId || '').trim()
  const teacherId = String(conflict.teacherId || '').trim()
  const day = String(conflict.day || conflict.dayOfWeek || '')
    .trim()
    .toLowerCase()
  const start = String(conflict.startTime || '').trim()
  const subjectIds = [...(conflict.subjectIds || [])].map(String).filter(Boolean).sort()
  const subjectNames = [...(conflict.subjectNames || [])].map(String).filter(Boolean).sort()
  const subjectPart = subjectIds.length
    ? subjectIds.join('+')
    : subjectNames.length
      ? subjectNames.join('+')
      : ''

  if (type === 'MISSING_PERIODS') {
    const expected = Number(conflict.expectedPeriods || conflict.periodsPerWeek || 0)
    if (classId && subjectPart && teacherId) {
      return `MISSING_PERIODS:${classId}:${subjectPart}:${teacherId}:${expected || 'x'}`
    }
    if (conflict.allocationId) return `MISSING_PERIODS:${conflict.allocationId}`
  }

  if (type === 'TEACHER_OVER_ALLOCATED' && teacherId) {
    return `TEACHER_OVER_ALLOCATED:${teacherId}`
  }

  if (
    (type === 'TEACHER_CONSECUTIVE_LIMIT' || type === 'CONSECUTIVE_OVERLOAD') &&
    teacherId &&
    day
  ) {
    return `CONSECUTIVE_OVERLOAD:${teacherId}:${day}`
  }

  if ((type === 'TEACHER_DAY_OVERLOAD' || type === 'TEACHER_OVERLOAD') && teacherId && day) {
    return `TEACHER_DAY_OVERLOAD:${teacherId}:${day}`
  }

  if (type === 'TEACHER_BREAK_OVERLAP' && teacherId && day && start) {
    return `TEACHER_BREAK_OVERLAP:${teacherId}:${day}:${start}`
  }

  if (type === 'SUBJECT_DISTRIBUTION' && classId && subjectPart && day) {
    return `SUBJECT_DISTRIBUTION:${classId}:${subjectPart}:${day}`
  }

  if (type === 'TEACHER_CLASS_SUBJECT_SPLIT' && teacherId && classId && subjectPart && day) {
    return `TEACHER_CLASS_SUBJECT_SPLIT:${teacherId}:${classId}:${subjectPart}:${day}`
  }

  if (type === 'TEACHER_CLASS_RETURN_TOO_SOON' && teacherId && classId && day && start) {
    return `TEACHER_CLASS_RETURN_TOO_SOON:${teacherId}:${classId}:${day}:${start}:${subjectPart || 'x'}`
  }

  if (type === 'CLASS_DOUBLE_BOOKED' && classId && day && start) {
    return subjectPart
      ? `CLASS_DOUBLE_BOOKED:${classId}:${subjectPart}:${day}:${start}`
      : `CLASS_DOUBLE_BOOKED:${classId}:${day}:${start}`
  }

  if (type === 'TEACHER_DOUBLE_BOOKED' && teacherId && day && start) {
    return `TEACHER_DOUBLE_BOOKED:${teacherId}:${day}:${start}`
  }

  if (type === 'ROOM_DOUBLE_BOOKED' && conflict.entityId && day && start) {
    return `ROOM_DOUBLE_BOOKED:${conflict.entityId}:${day}:${start}`
  }

  // Prefer explicit key when fields were incomplete (client-only payloads)
  if (conflict.auditKey) return String(conflict.auditKey).trim()

  // Legacy fallbacks (older clients / incomplete rows)
  if (conflict.allocationId) return `MISSING_PERIODS:${conflict.allocationId}`
  const ids = [...(conflict.affectedEntryIds || [])].map(String).sort()
  if (ids.length && type) return `${type}:${ids.join(',')}`
  if (classId && teacherId && type) return `${type}:${classId}:${teacherId}`
  return `${type || 'CONFLICT'}:${conflict.id || conflict.description || 'unknown'}`
}

/** Attach a stable auditKey onto each conflict for client/server agreement. */
export function withAuditKeys(conflicts) {
  return (conflicts || []).map((c) => {
    const auditKey = getConflictAuditKey(c)
    return auditKey ? { ...c, auditKey } : { ...c }
  })
}

export function filterIgnoredConflicts(conflicts, ignoredKeys) {
  const ignored = new Set(parseIgnoredAuditKeys(ignoredKeys))
  if (!ignored.size) return conflicts || []
  return (conflicts || []).filter((c) => {
    if (ignored.has(getConflictAuditKey(c))) return false
    // Legacy keys from entry-UUID / allocation-UUID era
    if (c.allocationId && ignored.has(`MISSING_PERIODS:${c.allocationId}`)) return false
    const ids = [...(c.affectedEntryIds || [])].map(String).sort()
    if (ids.length && c.type && ignored.has(`${c.type}:${ids.join(',')}`)) return false
    return true
  })
}

const DISMISSIBLE_KEY_PREFIXES = [
  'MISSING_PERIODS:',
  'TEACHER_OVER_ALLOCATED:',
  'CONSECUTIVE_OVERLOAD:',
  'TEACHER_DAY_OVERLOAD:',
  'SUBJECT_DISTRIBUTION:',
  'TEACHER_CLASS_RETURN_TOO_SOON:',
]

export function isDismissibleAuditConflict(conflict) {
  if (!conflict) return false
  const severity = String(conflict.severity || '').toLowerCase()
  if (severity === 'error') return false
  if (severity === 'warning') return true
  const key = getConflictAuditKey(conflict)
  return DISMISSIBLE_KEY_PREFIXES.some((p) => key.startsWith(p))
}

export function isDismissibleAuditKey(key, conflicts = []) {
  const k = String(key || '').trim()
  if (!k) return false
  if (DISMISSIBLE_KEY_PREFIXES.some((p) => k.startsWith(p))) return true
  const match = (conflicts || []).find((c) => getConflictAuditKey(c) === k)
  return Boolean(match && isDismissibleAuditConflict(match))
}

export function shrinkSummaryForIgnored(summary, ignoredKeys) {
  const filtered = filterIgnoredConflicts(summary?.conflicts, ignoredKeys)
  const errorCount = filtered.filter((c) => c.severity === 'error').length
  const warningCount = filtered.filter((c) => c.severity === 'warning').length
  const missingPeriodsCount = filtered.filter((c) => c.type === 'MISSING_PERIODS').length
  return {
    ...summary,
    conflicts: filtered,
    totalConflicts: filtered.length,
    errorCount,
    warningCount,
    missingPeriodsCount,
    byType: groupByType(filtered),
    canPublish: summary?.source === 'draft' && errorCount === 0,
  }
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
  const uiType = c.type === 'TEACHER_CONSECUTIVE_LIMIT' ? 'CONSECUTIVE_OVERLOAD' : c.type
  const severity = c.severity === 'hard' ? 'error' : 'warning'

  let description = c.message
  if (c.type === 'TEACHER_DOUBLE_BOOKED' && a0) {
    const classes = [...new Set(ids.map((id) => assignmentById.get(id)?.className).filter(Boolean))]
    const when = a0.dayOfWeek && a0.startTime ? ` (${a0.dayOfWeek} ${a0.startTime})` : ''
    description =
      classes.length >= 2
        ? `${a0.teacherName || 'Teacher'} is assigned to ${classes.join(' and ')} at the same time${when}`
        : `${a0.teacherName || 'Teacher'} is double-booked${when}`
  } else if (c.type === 'CLASS_DOUBLE_BOOKED' && a0) {
    const members = ids.map((id) => assignmentById.get(id)).filter(Boolean)
    const sorted = [...members].sort((x, y) => {
      const sx = String(x?.startTime || '')
      const sy = String(y?.startTime || '')
      return sx.localeCompare(sy) || String(x?.id || '').localeCompare(String(y?.id || ''))
    })
    description = buildClassDoubleBookedMessage({
      className: a0.className || 'Class',
      dayOfWeek: a0.dayOfWeek,
      entries: sorted.map((a) => ({
        subjectName: a?.subjectName,
        startTime: a?.startTime,
        endTime: a?.endTime,
      })),
    })
  } else if (c.type === 'ROOM_DOUBLE_BOOKED' && a0) {
    const members = ids.map((id) => assignmentById.get(id)).filter(Boolean)
    const sorted = [...members].sort((x, y) => {
      const sx = String(x?.startTime || '')
      const sy = String(y?.startTime || '')
      return sx.localeCompare(sy) || String(x?.id || '').localeCompare(String(y?.id || ''))
    })
    description = buildRoomDoubleBookedMessage({
      roomName: a0.classroomName || 'Room',
      dayOfWeek: a0.dayOfWeek,
      entries: sorted.map((a) => ({
        className: a?.className,
        subjectName: a?.subjectName,
        startTime: a?.startTime,
        endTime: a?.endTime,
      })),
    })
  } else if (c.type === 'TEACHER_CONSECUTIVE_LIMIT' && a0) {
    description = `${a0.teacherName || 'Teacher'} has too many consecutive teaching periods on ${a0.dayOfWeek} without a break`
  } else if ((c.type === 'TEACHER_DAY_OVERLOAD' || c.type === 'TEACHER_OVERLOAD') && a0) {
    description =
      c.message ||
      `${a0.teacherName || 'Teacher'} exceeds the daily period limit on ${a0.dayOfWeek}`
  } else if (c.type === 'TEACHER_BREAK_OVERLAP' && a0) {
    description =
      c.message ||
      `${a0.teacherName || 'Teacher'} is scheduled through a designated break/lunch on ${a0.dayOfWeek}`
  }

  const subjectNames = [
    ...new Set(ids.map((id) => assignmentById.get(id)?.subjectName).filter(Boolean)),
  ]
  const subjectIds = [
    ...new Set(
      ids
        .map((id) => assignmentById.get(id)?.subjectId)
        .filter(Boolean)
        .map(String)
    ),
  ]

  const row = {
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
    classroomId: a0?.classroomId || (c.type === 'ROOM_DOUBLE_BOOKED' ? c.entityId : undefined),
    classroomName: a0?.classroomName,
    day: a0?.dayOfWeek,
    startTime: a0?.startTime,
    subjectNames,
    subjectIds,
  }
  row.auditKey = getConflictAuditKey(row)
  return row
}

function serializeDetectorSuggestions(suggestions, entryId) {
  return (suggestions || [])
    .map((sug) => {
      const changed =
        (sug.preview || []).find((a) => String(a.id) === String(entryId)) || sug.preview?.[0]
      if (!changed) return null
      return {
        title: sug.title,
        description: sug.description,
        entryId: String(changed.id),
        newDayOfWeek: changed.dayOfWeek,
        newStartTime: changed.startTime,
        newEndTime: changed.endTime,
        newPeriodNumber: changed.period,
      }
    })
    .filter(Boolean)
}

/**
 * Compute concrete free-slot suggestions using the same CollisionDetector placement search
 * as auto-resolve / CP-SAT-adjacent canPlace validation (requires school bell timeSlots).
 */
function enrichConflictsWithSuggestions(conflicts, assignments, timeSlots = []) {
  if (!assignments?.length || !conflicts?.length) return conflicts
  try {
    const detector = new CollisionDetector({
      assignments,
      timeSlots: Array.isArray(timeSlots) ? timeSlots : [],
      seasonMode: 'normal',
    })
    const detectorConflicts = []
    for (const list of detector.detectAllConflicts().values()) {
      for (const c of list) detectorConflicts.push(c)
    }

    const assignmentById = new Map(assignments.map((a) => [String(a.id), a]))

    return conflicts.map((conf) => {
      if (
        !['TEACHER_DOUBLE_BOOKED', 'CLASS_DOUBLE_BOOKED', 'ROOM_DOUBLE_BOOKED'].includes(conf.type)
      ) {
        return conf
      }
      const entryId = conf.affectedEntryIds?.[0]
      if (!entryId) return conf

      let suggestions = []
      const match = detectorConflicts.find((c) => {
        const ids = (c.related?.assignmentIds || []).map(String)
        return (conf.affectedEntryIds || []).some((id) => ids.includes(String(id)))
      })
      if (match) {
        suggestions = serializeDetectorSuggestions(detector.suggestAlternatives(match), entryId)
      }

      // Fallback: search free slots for the first affected entry even if detector
      // conflict matching failed (still uses validateAssignment / availability).
      if (!suggestions.length) {
        const base = assignmentById.get(String(entryId))
        if (base) {
          suggestions = serializeDetectorSuggestions(
            detector.suggestMoveToAnyFreeSlotVariants(base, 3),
            entryId
          )
        }
      }

      // Also try the second conflicting entry if the first has no free slot
      if (!suggestions.length && conf.affectedEntryIds?.[1]) {
        const altId = String(conf.affectedEntryIds[1])
        const base = assignmentById.get(altId)
        if (base) {
          suggestions = serializeDetectorSuggestions(
            detector.suggestMoveToAnyFreeSlotVariants(base, 3),
            altId
          )
        }
      }

      return suggestions.length ? { ...conf, suggestions } : conf
    })
  } catch {
    return conflicts
  }
}

async function auditTeacherWorkload(prisma, schoolId, term, academicYear, assignments) {
  // After publish, allocations move to `scheduled` — include both so post-publish audits stay accurate.
  const allocations = await prisma.teacherAllocation.findMany({
    where: { schoolId, term, academicYear, status: { in: ['pushed', 'scheduled'] } },
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

  return withAuditKeys(conflicts)
}

/**
 * Expected weekly periods for an allocation — same resolver as generation
 * (singles/doubles/triples → total, with periodsPerWeek fallback).
 */
export function resolveExpectedPeriods(allocation) {
  return normalizeAllocationPeriods(allocation || {}).totalPeriods
}

/** Sum of period spans placed for one allocation (double=2, triple=3), not raw row count. */
export function countPlacedPeriodWeight(entries, allocationId, singleMin = 40) {
  const aid = String(allocationId || '')
  if (!aid) return 0
  let total = 0
  for (const e of entries || []) {
    if (String(e.allocationId) !== aid) continue
    total += inferPeriodSpan(e, singleMin)
  }
  return total
}

async function auditMissingPeriods(prisma, schoolId, term, academicYear, entries) {
  // Include `scheduled` so Conflict Centre still reports gaps after publish.
  const allocations = await prisma.teacherAllocation.findMany({
    where: { schoolId, term, academicYear, status: { in: ['pushed', 'scheduled'] } },
    include: {
      teacher: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      class: { select: { id: true, name: true, isActive: true } },
    },
  })

  const conflicts = []

  for (const alloc of allocations) {
    const expected = resolveExpectedPeriods(alloc)
    if (expected <= 0) continue
    if (alloc.class?.isActive === false) continue
    const placed = countPlacedPeriodWeight(entries, alloc.id)
    if (placed >= expected) continue

    const missing = expected - placed
    const className = alloc.class?.name || 'class'
    const subjectName = alloc.subject?.name || 'subject'
    const teacherName = alloc.teacher?.name || 'teacher'

    conflicts.push({
      id: `missing_${alloc.id}`,
      allocationId: alloc.id,
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
      subjectIds: [String(alloc.subjectId)],
      subjectNames: [subjectName],
      expectedPeriods: expected,
      placedPeriods: placed,
      reviewHref: buildAllocationReviewHref({
        className,
        subjectName,
        teacherName,
        classId: alloc.classId,
        subjectId: alloc.subjectId,
        teacherId: alloc.teacherId,
        term,
        academicYear,
      }),
    })
  }

  return withAuditKeys(conflicts)
}

/** Deep-link to headteacher Department Allocations focused on this class/subject. */
export function buildAllocationReviewHref({
  className,
  subjectName,
  teacherName,
  classId,
  subjectId,
  teacherId,
  term,
  academicYear,
} = {}) {
  const qs = new URLSearchParams()
  qs.set('tab', 'allocations')
  if (term) qs.set('term', String(term))
  if (academicYear) qs.set('academicYear', String(academicYear))
  if (classId) qs.set('focusClassId', String(classId))
  if (subjectId) qs.set('focusSubjectId', String(subjectId))
  if (teacherId) qs.set('focusTeacherId', String(teacherId))
  if (className) qs.set('focusClass', String(className))
  if (subjectName) qs.set('focusSubject', String(subjectName))
  if (teacherName) qs.set('focusTeacher', String(teacherName))
  return `/dashboard/headteacher/timetable?${qs.toString()}`
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
          classroom: { select: { id: true, name: true } },
        },
      },
      classroom: { select: { id: true, name: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
  })
}

/** Prefer draft rows; fall back to published when draft was cleared on publish. */
export async function loadTimetableEntriesForAudit(prisma, { schoolId, term, academicYear }) {
  const draft = await loadDraftTimetableEntries(prisma, { schoolId, term, academicYear })
  if (draft.length) {
    return { entries: draft, source: 'draft', canEditConflicts: true }
  }

  const { loadPublishedTimetableEntries } = await import('@/lib/timetable/clonePublishedToDraft')
  const published = await loadPublishedTimetableEntries(prisma, { schoolId, term, academicYear })
  if (published.length) {
    return {
      entries: published,
      source: 'published',
      canEditConflicts: false,
      message:
        'Showing conflicts in the published timetable. Create an editable draft to fix them here. Soft warnings can still be dismissed; dismissals persist for this term.',
    }
  }

  return {
    entries: [],
    source: 'none',
    canEditConflicts: false,
    message: 'No timetable found for this term. Generate a timetable first.',
  }
}

function buildAuditSummary({
  schoolId,
  term,
  academicYear,
  entries,
  source,
  canEditConflicts,
  message,
  teacherClassSessionRules,
  breakSlots,
}) {
  const assignments = mapDbEntriesToAssignments(entries)
  const raw = validateTimetable(assignments, {
    teacherClassSessionRules,
    teacherWorkloadRules: teacherClassSessionRules,
    breakSlots,
  })
  const deduped = dedupeValidationConflicts(raw)
  const assignmentById = new Map(assignments.map((a) => [String(a.id), a]))

  const validationConflicts = deduped.map((c, i) => mapValidationToUiConflict(c, assignmentById, i))

  return {
    schoolId,
    term,
    academicYear,
    entries,
    assignments,
    validationConflicts,
    raw,
    source,
    canEditConflicts,
    message,
  }
}

/**
 * Full server-side audit of timetable rows for a term (draft first, then published).
 */
export async function auditDraftTimetable(prisma, { schoolId, term, academicYear }) {
  const { purgeExactDuplicateDraftEntries } =
    await import('@/lib/timetable/purgeExactDuplicateDraftEntries')
  // Drop identical accumulated copies before scoring (generation replace is the
  // primary guard; this heals drafts that already have duplicate rows).
  try {
    await purgeExactDuplicateDraftEntries(prisma, { schoolId, term, academicYear })
  } catch (err) {
    console.error('[conflictAudit] Exact duplicate purge failed:', err)
  }

  const loaded = await loadTimetableEntriesForAudit(prisma, { schoolId, term, academicYear })
  const { entries, source, canEditConflicts, message: sourceMessage } = loaded

  let teacherClassSessionRules = parseSchedulingRulesJson(null)
  let breakSlots = []
  let timeSlots = []
  try {
    const cfg = await ensureTimetableConfig(prisma, schoolId)
    const normalized = normalizeTimetableConfig(cfg)
    teacherClassSessionRules = parseSchedulingRulesJson(normalized.schedulingRules)
    breakSlots = Array.isArray(normalized.breakSlots) ? normalized.breakSlots : []
    timeSlots = buildTimeSlotsFromConfig(normalized)
  } catch (err) {
    console.warn('[conflictAudit] Could not load schedulingRules:', err?.message)
  }

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
      source: 'none',
      canEditConflicts: false,
      message: sourceMessage || 'No timetable found for this term. Generate a timetable first.',
    }
  }

  const base = buildAuditSummary({
    schoolId,
    term,
    academicYear,
    entries,
    source,
    canEditConflicts,
    message: sourceMessage,
    teacherClassSessionRules,
    breakSlots,
  })

  const [workloadConflicts, missingConflicts] = await Promise.all([
    auditTeacherWorkload(prisma, schoolId, term, academicYear, base.assignments),
    auditMissingPeriods(prisma, schoolId, term, academicYear, entries),
  ])

  let conflicts = [...base.validationConflicts, ...workloadConflicts, ...missingConflicts]
  conflicts = filterConflictsForActiveClasses(conflicts, base.assignments)
  conflicts = withAuditKeys(conflicts)
  conflicts = enrichConflictsWithSuggestions(conflicts, base.assignments, timeSlots)

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
    missingPeriodsCount: missingConflicts.length,
    feasibilityNote:
      missingConflicts.length > 0
        ? `${missingConflicts.length} allocation(s) are missing scheduled periods — regenerate or place manually.`
        : null,
    canPublish: source === 'draft' && errorCount === 0,
    scannedAt: new Date().toISOString(),
    entryCount: entries.length,
    source,
    canEditConflicts,
    message: sourceMessage || null,
    hardValidation: getHardConflicts(base.raw),
    softValidation: getSoftConflicts(base.raw),
  }
}

export async function persistDraftConflictMeta(
  prisma,
  { schoolId, term, academicYear, summary, ignoredAuditKeys }
) {
  const existing = await getDraftConflictMeta(prisma, { schoolId, term, academicYear })
  const ignored =
    ignoredAuditKeys !== undefined
      ? parseIgnoredAuditKeys(ignoredAuditKeys)
      : parseIgnoredAuditKeys(existing?.ignoredAuditKeys)
  const shrunk = shrinkSummaryForIgnored(summary, ignored)
  const preview = (shrunk.conflicts || []).slice(0, 20)
  return prisma.timetableDraftMeta.upsert({
    where: {
      schoolId_term_academicYear: { schoolId, term, academicYear },
    },
    create: {
      schoolId,
      term,
      academicYear,
      conflictCount: shrunk.totalConflicts || 0,
      conflictErrors: shrunk.errorCount || 0,
      conflictWarnings: shrunk.warningCount || 0,
      conflictSummary: preview,
      ignoredAuditKeys: ignored,
      lastScannedAt: new Date(),
      canPublish: Boolean(shrunk.canPublish),
    },
    update: {
      conflictCount: shrunk.totalConflicts || 0,
      conflictErrors: shrunk.errorCount || 0,
      conflictWarnings: shrunk.warningCount || 0,
      conflictSummary: preview,
      ignoredAuditKeys: ignored,
      lastScannedAt: new Date(),
      canPublish: Boolean(shrunk.canPublish),
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

/** Shape stored meta for API responses. HOD gets counts only (no conflictSummary). */
export function formatDraftMetaResponse(meta, { term, academicYear, includeSummary = true } = {}) {
  if (!meta) {
    return {
      term,
      academicYear,
      conflictCount: 0,
      conflictErrors: 0,
      conflictWarnings: 0,
      canPublish: true,
      lastScannedAt: null,
      ignoredAuditKeys: [],
      ...(includeSummary ? { conflictSummary: [] } : {}),
    }
  }
  const ignored = parseIgnoredAuditKeys(meta.ignoredAuditKeys)
  const rawSummary = Array.isArray(meta.conflictSummary) ? meta.conflictSummary : []
  const conflictSummary = includeSummary ? filterIgnoredConflicts(rawSummary, ignored) : undefined
  return {
    term: meta.term || term,
    academicYear: meta.academicYear || academicYear,
    conflictCount: meta.conflictCount ?? 0,
    conflictErrors: meta.conflictErrors ?? 0,
    conflictWarnings: meta.conflictWarnings ?? 0,
    canPublish: meta.canPublish ?? true,
    lastScannedAt: meta.lastScannedAt ? new Date(meta.lastScannedAt).toISOString() : null,
    ignoredAuditKeys: ignored,
    ...(includeSummary ? { conflictSummary } : {}),
  }
}

/**
 * Dismiss or restore server audit rows (stored per term draft).
 * Only warnings are dismissible — hard errors must be fixed in the timetable.
 */
export async function updateIgnoredDraftAuditKeys(
  prisma,
  { schoolId, term, academicYear, auditKeys, mode = 'add' }
) {
  const summary = await auditDraftTimetable(prisma, { schoolId, term, academicYear })
  const meta = await getDraftConflictMeta(prisma, { schoolId, term, academicYear })
  let ignored = parseIgnoredAuditKeys(meta?.ignoredAuditKeys)

  if (mode === 'clear') {
    ignored = []
  } else {
    const keys = parseIgnoredAuditKeys(auditKeys)
    if (mode === 'remove') {
      const remove = new Set(keys)
      ignored = ignored.filter((k) => !remove.has(k))
    } else {
      for (const k of keys) {
        if (!isDismissibleAuditKey(k, summary.conflicts)) continue
        if (!ignored.includes(k)) ignored.push(k)
      }
    }
  }

  if (summary.entryCount > 0) {
    await persistDraftConflictMeta(prisma, {
      schoolId,
      term,
      academicYear,
      summary,
      ignoredAuditKeys: ignored,
    })
  } else if (meta) {
    await prisma.timetableDraftMeta.update({
      where: { schoolId_term_academicYear: { schoolId, term, academicYear } },
      data: { ignoredAuditKeys: ignored },
    })
  } else if (ignored.length) {
    // Allow dismiss while viewing published-only audit (creates meta row)
    await persistDraftConflictMeta(prisma, {
      schoolId,
      term,
      academicYear,
      summary: { ...summary, conflicts: summary.conflicts || [], totalConflicts: 0 },
      ignoredAuditKeys: ignored,
    })
  }

  const shrunk = shrinkSummaryForIgnored(summary, ignored)
  return { ignoredAuditKeys: ignored, summary: shrunk }
}

/**
 * Run full audit and persist TimetableDraftMeta. Shared by resolve, entries PATCH, sync-draft, publish.
 */
export async function rescanAndPersistDraftMeta(prisma, { schoolId, term, academicYear }) {
  const summary = await auditDraftTimetable(prisma, { schoolId, term, academicYear })
  if (summary.entryCount > 0) {
    await persistDraftConflictMeta(prisma, { schoolId, term, academicYear, summary })
  }
  return summary
}
