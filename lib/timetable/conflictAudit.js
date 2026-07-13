import { mapDbEntriesToAssignments } from '@/lib/timetable/mapEntriesToAssignments'
import {
  validateTimetable,
  getHardConflicts,
  getSoftConflicts,
} from '@/lib/timetable/validateTimetable'
import { CollisionDetector } from '@/lib/timetable/collisionDetector'
import { filterConflictsForActiveClasses } from '@/lib/timetable/filterActiveClassConflicts'

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

export function parseIgnoredAuditKeys(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((k) => String(k || '').trim()).filter(Boolean)
}

/** Stable key for dismiss / restore of a server audit row. */
export function getConflictAuditKey(conflict) {
  if (!conflict || typeof conflict !== 'object') return ''
  if (conflict.allocationId) return `MISSING_PERIODS:${conflict.allocationId}`
  const ids = [...(conflict.affectedEntryIds || [])].map(String).sort()
  if (ids.length) return `${conflict.type}:${ids.join(',')}`
  if (conflict.classId && conflict.teacherId) {
    return `${conflict.type}:${conflict.classId}:${conflict.teacherId}`
  }
  return `${conflict.type}:${conflict.id || conflict.description || 'unknown'}`
}

export function filterIgnoredConflicts(conflicts, ignoredKeys) {
  const ignored = new Set(parseIgnoredAuditKeys(ignoredKeys))
  if (!ignored.size) return conflicts || []
  return (conflicts || []).filter((c) => !ignored.has(getConflictAuditKey(c)))
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

function enrichConflictsWithSuggestions(conflicts, assignments) {
  if (!assignments?.length || !conflicts?.length) return conflicts
  try {
    const detector = new CollisionDetector({ assignments, seasonMode: 'normal' })
    const detectorConflicts = []
    for (const list of detector.detectAllConflicts().values()) {
      for (const c of list) detectorConflicts.push(c)
    }

    return conflicts.map((conf) => {
      if (!['TEACHER_DOUBLE_BOOKED', 'CLASS_DOUBLE_BOOKED'].includes(conf.type)) return conf
      const entryId = conf.affectedEntryIds?.[0]
      if (!entryId) return conf

      const match = detectorConflicts.find((c) => {
        const ids = (c.related?.assignmentIds || []).map(String)
        return conf.affectedEntryIds.some((id) => ids.includes(String(id)))
      })
      if (!match) return conf

      const suggestions = serializeDetectorSuggestions(detector.suggestAlternatives(match), entryId)
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

  return conflicts
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

  const countByAllocation = new Map()
  for (const e of entries || []) {
    const aid = String(e.allocationId)
    countByAllocation.set(aid, (countByAllocation.get(aid) || 0) + 1)
  }

  const conflicts = []

  for (const alloc of allocations) {
    const expected = Number(alloc.periodsPerWeek || 0)
    if (expected <= 0) continue
    if (alloc.class?.isActive === false) continue
    const placed = countByAllocation.get(String(alloc.id)) || 0
    if (placed >= expected) continue

    const missing = expected - placed
    const className = alloc.class?.name || 'class'
    const subjectName = alloc.subject?.name || 'subject'
    const teacherName = alloc.teacher?.name || 'teacher'

    conflicts.push({
      id: `missing_${alloc.id}`,
      allocationId: alloc.id,
      auditKey: `MISSING_PERIODS:${alloc.id}`,
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
        'Showing conflicts in the published timetable. Create an editable draft to fix them here.',
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
}) {
  const assignments = mapDbEntriesToAssignments(entries)
  const raw = validateTimetable(assignments, { includeRoomChecks: false })
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
  const loaded = await loadTimetableEntriesForAudit(prisma, { schoolId, term, academicYear })
  const { entries, source, canEditConflicts, message: sourceMessage } = loaded

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
  })

  const [workloadConflicts, missingConflicts] = await Promise.all([
    auditTeacherWorkload(prisma, schoolId, term, academicYear, base.assignments),
    auditMissingPeriods(prisma, schoolId, term, academicYear, entries),
  ])

  let conflicts = [...base.validationConflicts, ...workloadConflicts, ...missingConflicts]
  conflicts = filterConflictsForActiveClasses(conflicts, base.assignments)
  conflicts = enrichConflictsWithSuggestions(conflicts, base.assignments)

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
 */
export async function updateIgnoredDraftAuditKeys(
  prisma,
  { schoolId, term, academicYear, auditKeys, mode = 'add' }
) {
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
        if (!ignored.includes(k)) ignored.push(k)
      }
    }
  }

  const summary = await auditDraftTimetable(prisma, { schoolId, term, academicYear })
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
