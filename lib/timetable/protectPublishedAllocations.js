/**
 * Protect published TimetableAllocationEntry rows when removing TeacherAllocation inputs.
 * Cascade FK would otherwise wipe the live published master timetable.
 */

/**
 * Delete TeacherAllocation rows tagged to a department allocation, but keep any
 * that still underpin published timetable cells (and only drop their draft cells).
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} schoolId
 * @param {string} departmentAllocationId
 * @param {{ preservePublished?: boolean }} [opts]
 */
export async function removeSyncedTeacherAllocations(
  tx,
  schoolId,
  departmentAllocationId,
  opts = {}
) {
  const preservePublished = opts.preservePublished !== false
  const notesTag = `departmentAllocation:${departmentAllocationId}`

  const rows = await tx.teacherAllocation.findMany({
    where: { schoolId, notes: notesTag },
    select: { id: true },
  })
  const ids = rows.map((r) => r.id)
  if (!ids.length) return { count: 0, preserved: 0 }

  if (!preservePublished) {
    const result = await tx.teacherAllocation.deleteMany({
      where: { id: { in: ids }, schoolId },
    })
    return { count: result.count, preserved: 0 }
  }

  // Draft cells can go; published cells must keep their parent allocation row.
  await tx.timetableAllocationEntry.deleteMany({
    where: { schoolId, allocationId: { in: ids }, status: 'draft' },
  })

  const publishedParents = await tx.timetableAllocationEntry.findMany({
    where: { schoolId, allocationId: { in: ids }, status: 'published' },
    select: { allocationId: true },
    distinct: ['allocationId'],
  })
  const keep = new Set(publishedParents.map((e) => String(e.allocationId)))
  const deletable = ids.filter((id) => !keep.has(String(id)))

  if (!deletable.length) {
    return { count: 0, preserved: keep.size }
  }

  const result = await tx.teacherAllocation.deleteMany({
    where: { id: { in: deletable }, schoolId },
  })
  return { count: result.count, preserved: keep.size }
}

/**
 * Safe bulk delete of TeacherAllocations by notes tags (used by season clear).
 *
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 */
export async function removeTeacherAllocationsByNotesTags(db, schoolId, notesTags, opts = {}) {
  const preservePublished = opts.preservePublished !== false
  const tags = (notesTags || []).map(String).filter(Boolean)
  if (!tags.length) return { count: 0, preserved: 0 }

  const rows = await db.teacherAllocation.findMany({
    where: { schoolId, notes: { in: tags } },
    select: { id: true },
  })
  const ids = rows.map((r) => r.id)
  if (!ids.length) return { count: 0, preserved: 0 }

  if (!preservePublished) {
    const result = await db.teacherAllocation.deleteMany({
      where: { id: { in: ids }, schoolId },
    })
    return { count: result.count, preserved: 0 }
  }

  await db.timetableAllocationEntry.deleteMany({
    where: { schoolId, allocationId: { in: ids }, status: 'draft' },
  })

  const publishedParents = await db.timetableAllocationEntry.findMany({
    where: { schoolId, allocationId: { in: ids }, status: 'published' },
    select: { allocationId: true },
    distinct: ['allocationId'],
  })
  const keep = new Set(publishedParents.map((e) => String(e.allocationId)))
  const deletable = ids.filter((id) => !keep.has(String(id)))

  if (!deletable.length) {
    return { count: 0, preserved: keep.size }
  }

  const result = await db.teacherAllocation.deleteMany({
    where: { id: { in: deletable }, schoolId },
  })
  return { count: result.count, preserved: keep.size }
}
