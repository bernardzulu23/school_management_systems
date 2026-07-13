/**
 * Promote draft TimetableAllocationEntry rows to published for a term.
 *
 * IMPORTANT: must replace the previous published set. A plain draft→published
 * status flip left old published rows in place, so every republish (~24h later
 * in production) appended another full copy of the timetable.
 *
 * Single transaction: delete prior published → promote draft → mark allocations scheduled.
 *
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 * @param {{ schoolId: string, term: string, academicYear: string }} opts
 */
export async function promoteDraftTimetableToPublished(db, { schoolId, term, academicYear }) {
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
      select: { allocationId: true },
    })
    const allocationIds = [...new Set(entries.map((e) => e.allocationId))]

    if (allocationIds.length) {
      await tx.teacherAllocation.updateMany({
        where: { id: { in: allocationIds } },
        data: { status: 'scheduled' },
      })
    }

    return {
      ok: true,
      published: updated.count,
      deletedPublished: deleted.count,
      allocationIdsUpdated: allocationIds.length,
    }
  }

  // Allow nesting inside an outer transaction (tx has no $transaction).
  if (typeof db.$transaction === 'function') {
    return db.$transaction(run, { maxWait: 15_000, timeout: 60_000 })
  }
  return run(db)
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
