/**
 * Promote draft TimetableAllocationEntry rows to published for a term.
 *
 * IMPORTANT: must replace the previous published set. A plain draft→published
 * status flip left old published rows in place, so every republish (~24h later
 * in production) appended another full copy of the timetable.
 *
 * Single transaction: delete prior published → promote draft → mark allocations scheduled.
 * SMS to affected teachers runs after the transaction (diff of before/after slots).
 */

import {
  diffAffectedTeacherIds,
  snapshotPublishedScheduleSlots,
} from '@/lib/timetable/scheduleDiff'

/**
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 * @param {{
 *   schoolId: string
 *   term: string
 *   academicYear: string
 *   actor?: { userId?: string|null, id?: string|null, name?: string|null, role?: string|null, department?: string|null }
 *   notifyTeachers?: boolean
 * }} opts
 */
export async function promoteDraftTimetableToPublished(
  db,
  { schoolId, term, academicYear, actor, notifyTeachers = true }
) {
  const draftCount = await db.timetableAllocationEntry.count({
    where: { schoolId, term, academicYear, status: 'draft' },
  })
  if (draftCount === 0) {
    return {
      ok: false,
      code: 'NO_DRAFT',
      published: 0,
      deletedPublished: 0,
      error: 'No draft timetable to publish.',
    }
  }

  // Snapshot BEFORE delete — ChangeLog cannot reconstruct this cheaply.
  const beforeEntries = await snapshotPublishedScheduleSlots(db, {
    schoolId,
    term,
    academicYear,
  })

  const run = async (tx) => {
    const deleted = await tx.timetableAllocationEntry.deleteMany({
      where: { schoolId, term, academicYear, status: 'published' },
    })

    const updated = await tx.timetableAllocationEntry.updateMany({
      where: { schoolId, term, academicYear, status: 'draft' },
      data: { status: 'published', publishedAt: new Date() },
    })

    const entries = await tx.timetableAllocationEntry.findMany({
      where: { schoolId, term, academicYear, status: 'published' },
      select: {
        allocationId: true,
        teacherId: true,
        classId: true,
        subjectId: true,
        dayOfWeek: true,
        periodNumber: true,
        startTime: true,
        endTime: true,
        classroomId: true,
      },
    })
    const allocationIds = [...new Set(entries.map((e) => e.allocationId))]

    if (allocationIds.length) {
      await tx.teacherAllocation.updateMany({
        where: { id: { in: allocationIds } },
        data: { status: 'scheduled' },
      })
    }

    const slotDiff = diffAffectedTeacherIds(beforeEntries, entries)

    const result = {
      ok: true,
      published: updated.count,
      deletedPublished: deleted.count,
      allocationIdsUpdated: allocationIds.length,
      affectedTeacherIds: slotDiff.affectedTeacherIds,
      afterEntries: entries,
      beforeEntries,
    }

    if (actor) {
      const { recordChangeLog, actorFromUser } = await import('@/lib/changelog/record')
      const { CHANGE_LOG_ACTIONS, CHANGE_LOG_MODULES, buildActorLabel } =
        await import('@/lib/changelog/constants')
      const a = actorFromUser(actor)
      await recordChangeLog({
        db: tx,
        schoolId,
        actor: a,
        action: CHANGE_LOG_ACTIONS.PUBLISHED,
        module: CHANGE_LOG_MODULES.TIMETABLE,
        entityType: 'Timetable',
        entityId: `${term}|${academicYear}`,
        entityLabel: `${term} ${academicYear} timetable`,
        summary: `${buildActorLabel(a)} published the ${term} ${academicYear} timetable (${result.published} period${result.published === 1 ? '' : 's'}; ${slotDiff.affectedTeacherIds.length} teacher schedule${slotDiff.affectedTeacherIds.length === 1 ? '' : 's'} changed)`,
        after: {
          term,
          academicYear,
          published: result.published,
          replacedPublished: result.deletedPublished,
          affectedTeacherCount: slotDiff.affectedTeacherIds.length,
          affectedTeacherIds: slotDiff.affectedTeacherIds.slice(0, 200),
        },
        metadata: { term, academicYear },
      })
    }

    return result
  }

  // Allow nesting inside an outer transaction (tx has no $transaction).
  const result =
    typeof db.$transaction === 'function'
      ? await db.$transaction(run, { maxWait: 15_000, timeout: 60_000 })
      : await run(db)

  if (!result.ok || !notifyTeachers) {
    return result
  }

  try {
    const { notifyTeachersOnTimetablePublish } =
      await import('@/lib/timetable/notifyTeachersOnPublish')
    const sms = await notifyTeachersOnTimetablePublish({
      schoolId,
      term,
      academicYear,
      beforeEntries: result.beforeEntries || beforeEntries,
      afterEntries: result.afterEntries || null,
    })
    result.sms = {
      ok: sms.ok,
      skipped: sms.skipped || false,
      reason: sms.reason || null,
      affectedTeacherCount: (sms.affectedTeacherIds || result.affectedTeacherIds || []).length,
      smsQueued: sms.smsQueued || 0,
      noPhoneCount: Array.isArray(sms.noPhone) ? sms.noPhone.length : 0,
    }
  } catch (err) {
    console.error('[timetable publish SMS]', err?.message || err)
    result.sms = { ok: false, reason: err?.message || 'sms_notify_failed', smsQueued: 0 }
  }

  // Strip heavy payloads from API response helpers
  delete result.beforeEntries
  delete result.afterEntries

  return result
}

/**
 * Count exact same-slot published duplicates for a term (diagnostic / tests).
 */
export async function countExactPublishedSlotDupes(db, { schoolId, term, academicYear }) {
  const rows = await db.$queryRaw`
    SELECT COUNT(*)::int AS "groupCount"
    FROM (
      SELECT 1
      FROM "TimetableAllocationEntry" e
      WHERE e."schoolId" = ${schoolId}
        AND e.term = ${term}
        AND e."academicYear" = ${academicYear}
        AND e.status = 'published'
      GROUP BY e."classId", e."dayOfWeek", e."periodNumber", e."startTime", e."endTime"
      HAVING COUNT(*) > 1
    ) d
  `
  return Number(rows?.[0]?.groupCount || 0)
}
