import { resolveAllocationSeason } from '@/lib/timetable/allocationSeason'

function matchesSeason(allocationData, term, academicYear) {
  const season = resolveAllocationSeason(allocationData, { term, academicYear })
  return season.term === term && season.academicYear === academicYear
}

/**
 * Remove HOD department allocation workflow rows for a season and clean synced solver inputs.
 * MasterTimetableEntry + AllocationNotification cascade when DepartmentAllocation is deleted.
 *
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 */
export async function clearDepartmentAllocations(db, params) {
  const {
    schoolId,
    term,
    academicYear,
    departmentId = null,
    includeSyncedTeacherAllocations = true,
    includeDraftTimetable = false,
  } = params

  const normalizedTerm = String(term || 'Term 1').trim()
  const normalizedYear = String(academicYear || new Date().getFullYear()).trim()
  const deptFilter = departmentId ? String(departmentId).trim() : ''

  const candidates = await db.departmentAllocation.findMany({
    where: {
      schoolId,
      ...(deptFilter ? { departmentId: deptFilter } : {}),
    },
    select: { id: true, allocationData: true },
  })

  const allocationIds = candidates
    .filter((row) => matchesSeason(row.allocationData, normalizedTerm, normalizedYear))
    .map((row) => row.id)

  let teacherAllocationsDeleted = 0
  let draftEntriesDeleted = 0

  if (includeSyncedTeacherAllocations && allocationIds.length > 0) {
    const notesTags = allocationIds.map((id) => `departmentAllocation:${id}`)
    const teacherResult = await db.teacherAllocation.deleteMany({
      where: {
        schoolId,
        notes: { in: notesTags },
      },
    })
    teacherAllocationsDeleted = teacherResult.count
  }

  if (includeDraftTimetable) {
    const draftResult = await db.timetableAllocationEntry.deleteMany({
      where: {
        schoolId,
        term: normalizedTerm,
        academicYear: normalizedYear,
        status: 'draft',
      },
    })
    draftEntriesDeleted = draftResult.count
  }

  let departmentAllocationsDeleted = 0
  if (allocationIds.length > 0) {
    const allocationResult = await db.departmentAllocation.deleteMany({
      where: { id: { in: allocationIds }, schoolId },
    })
    departmentAllocationsDeleted = allocationResult.count
  }

  return {
    term: normalizedTerm,
    academicYear: normalizedYear,
    departmentId: deptFilter || null,
    departmentAllocationsDeleted,
    teacherAllocationsDeleted,
    draftEntriesDeleted,
  }
}
