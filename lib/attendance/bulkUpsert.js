/**
 * Batch upsert daily Attendance rows (avoids N individual INSERT statements).
 */
export async function bulkUpsertAttendance(prisma, schoolId, writes) {
  if (!writes?.length) return { created: 0, updated: 0 }

  const date = writes[0].date
  const studentIds = writes.map((w) => w.studentId)

  const existingRows = await prisma.attendance.findMany({
    where: { schoolId, date, studentId: { in: studentIds } },
    select: { studentId: true },
  })
  const existingIds = new Set(existingRows.map((r) => String(r.studentId)))

  const creates = writes.filter((w) => !existingIds.has(String(w.studentId)))
  const updates = writes.filter((w) => existingIds.has(String(w.studentId)))

  const ops = []
  if (creates.length) {
    ops.push(
      prisma.attendance.createMany({
        data: creates.map((r) => ({
          schoolId,
          studentId: r.studentId,
          date: r.date,
          status: r.status,
          remarks: r.remarks,
        })),
      })
    )
  }
  for (const r of updates) {
    ops.push(
      prisma.attendance.update({
        where: { studentId_date: { studentId: r.studentId, date: r.date } },
        data: { status: r.status, remarks: r.remarks },
      })
    )
  }

  if (ops.length) await prisma.$transaction(ops)

  return { created: creates.length, updated: updates.length }
}
