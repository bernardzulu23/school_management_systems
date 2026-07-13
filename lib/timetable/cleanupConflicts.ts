import type { PrismaClient } from '@prisma/client'
import { syncClassActiveFlags } from '@/lib/timetable/getActiveClasses'
import {
  rescanAndPersistDraftMeta,
  getDraftConflictMeta,
  auditDraftTimetable,
  persistDraftConflictMeta,
  loadDraftTimetableEntries,
} from '@/lib/timetable/conflictAudit'
import { mapDbEntriesToAssignments } from '@/lib/timetable/mapEntriesToAssignments'
import {
  activeClassIdsFromAssignments,
  filterConflictsForActiveClasses,
} from '@/lib/timetable/filterActiveClassConflicts'

export {
  activeClassIdsFromAssignments,
  conflictReferencesInactiveClass,
  filterConflictsForActiveClasses,
  filterConflictMapForActiveClasses,
} from '@/lib/timetable/filterActiveClassConflicts'

export type CleanupStaleConflictsResult = {
  removed: number
  remaining: number
  deactivatedClasses: number
  activeClassCount: number
}

/**
 * Mark empty classes inactive, drop stale class conflicts, refresh draft meta.
 */
export async function cleanupStaleConflicts(
  prisma: PrismaClient,
  schoolId: string,
  opts: { term?: string; academicYear?: string } = {}
): Promise<CleanupStaleConflictsResult> {
  const term = String(opts.term || 'Term 1')
  const academicYear = String(opts.academicYear || new Date().getFullYear())

  const beforeMeta = await getDraftConflictMeta(prisma, { schoolId, term, academicYear })
  const beforeCount = Number(beforeMeta?.conflictCount || 0)

  const activeBefore = await prisma.class.count({
    where: { schoolId, isActive: true },
  })

  await syncClassActiveFlags(prisma, schoolId, {
    term,
    academicYear,
    assignmentsOnly: true,
  })

  const activeAfter = await prisma.class.count({
    where: { schoolId, isActive: true },
  })

  const entries = await loadDraftTimetableEntries(prisma, { schoolId, term, academicYear })
  const assignments = mapDbEntriesToAssignments(entries)
  const activeClassIds = activeClassIdsFromAssignments(assignments)

  let summary = await auditDraftTimetable(prisma, { schoolId, term, academicYear })
  if (assignments.length > 0) {
    const filtered = filterConflictsForActiveClasses(summary.conflicts, assignments)
    const errorCount = filtered.filter((c) => c.severity === 'error').length
    const warningCount = filtered.filter((c) => c.severity === 'warning').length
    summary = {
      ...summary,
      conflicts: filtered,
      totalConflicts: filtered.length,
      errorCount,
      warningCount,
      canPublish: summary.source === 'draft' && errorCount === 0,
    }
    if (summary.entryCount > 0) {
      await persistDraftConflictMeta(prisma, { schoolId, term, academicYear, summary })
    }
  } else {
    await rescanAndPersistDraftMeta(prisma, { schoolId, term, academicYear })
    summary = await auditDraftTimetable(prisma, { schoolId, term, academicYear })
  }

  return {
    removed: Math.max(0, beforeCount - (summary.totalConflicts || 0)),
    remaining: summary.totalConflicts || 0,
    deactivatedClasses: Math.max(0, activeBefore - activeAfter),
    activeClassCount: activeClassIds.size,
  }
}
