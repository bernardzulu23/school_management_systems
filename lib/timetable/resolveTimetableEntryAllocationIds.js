/**
 * Ensure TimetableAllocationEntry.allocationId references a real TeacherAllocation row.
 */
export async function remapEntriesToValidAllocationIds(db, schoolId, entries, term, academicYear) {
  if (!Array.isArray(entries) || entries.length === 0) return { entries: [], invalid: [] }

  const uniqueIds = [
    ...new Set(entries.map((e) => String(e.allocationId || '').trim()).filter(Boolean)),
  ]
  const existingRows =
    uniqueIds.length > 0
      ? await db.teacherAllocation.findMany({
          where: { schoolId, id: { in: uniqueIds } },
          select: { id: true },
        })
      : []
  const validIds = new Set(existingRows.map((r) => r.id))

  const remapCache = new Map()
  const invalid = []

  async function resolveId(entry) {
    const raw = String(entry.allocationId || '').trim()
    if (!raw) return null
    if (validIds.has(raw)) return raw

    const cacheKey = `${entry.teacherId}|${entry.subjectId}|${entry.classId}|${term}|${academicYear}`
    if (remapCache.has(cacheKey)) return remapCache.get(cacheKey)

    const match = await db.teacherAllocation.findFirst({
      where: {
        schoolId,
        teacherId: String(entry.teacherId),
        subjectId: String(entry.subjectId),
        classId: String(entry.classId),
        term,
        academicYear,
      },
      select: { id: true },
    })

    if (match?.id) {
      validIds.add(match.id)
      remapCache.set(cacheKey, match.id)
      return match.id
    }

    return null
  }

  const remapped = []
  for (const entry of entries) {
    const allocationId = await resolveId(entry)
    if (!allocationId) {
      invalid.push(entry)
      continue
    }
    remapped.push({ ...entry, allocationId })
  }

  return { entries: remapped, invalid }
}
