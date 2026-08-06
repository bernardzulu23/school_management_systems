/**
 * Batch upsert daily Attendance rows (avoids N individual INSERT statements).
 * Every write is scoped to `schoolId`; unknown studentIds for the tenant are skipped.
 */
export async function bulkUpsertAttendance(prisma, schoolId, writes) {
  const sid = String(schoolId || '').trim()
  if (!sid) throw new Error('schoolId is required for bulkUpsertAttendance')
  if (!writes?.length) return { created: 0, updated: 0 }

  const date = writes[0].date
  const studentIds = [
    ...new Set(writes.map((w) => String(w.studentId || '').trim()).filter(Boolean)),
  ]
  if (!studentIds.length) return { created: 0, updated: 0 }

  // Only mutate students that belong to this school (blocks cross-tenant studentId).
  const owned = await prisma.student.findMany({
    where: { schoolId: sid, id: { in: studentIds } },
    select: { id: true },
  })
  const ownedIds = new Set(owned.map((s) => String(s.id)))
  const scopedWrites = writes.filter((w) => ownedIds.has(String(w.studentId)))
  if (!scopedWrites.length) return { created: 0, updated: 0 }

  const scopedIds = scopedWrites.map((w) => w.studentId)

  const existingRows = await prisma.attendance.findMany({
    where: { schoolId: sid, date, studentId: { in: scopedIds } },
    select: { studentId: true },
  })
  const existingIds = new Set(existingRows.map((r) => String(r.studentId)))

  const creates = scopedWrites.filter((w) => !existingIds.has(String(w.studentId)))
  const updates = scopedWrites.filter((w) => existingIds.has(String(w.studentId)))

  const ops = []
  if (creates.length) {
    ops.push(
      prisma.attendance.createMany({
        data: creates.map((r) => ({
          schoolId: sid,
          studentId: r.studentId,
          date: r.date,
          status: r.status,
          remarks: r.remarks,
        })),
      })
    )
  }
  for (const r of updates) {
    // updateMany + schoolId: Attendance @@unique is only [studentId, date]
    ops.push(
      prisma.attendance.updateMany({
        where: { studentId: r.studentId, date: r.date, schoolId: sid },
        data: { status: r.status, remarks: r.remarks },
      })
    )
  }

  if (ops.length) await prisma.$transaction(ops)

  return { created: creates.length, updated: updates.length }
}
