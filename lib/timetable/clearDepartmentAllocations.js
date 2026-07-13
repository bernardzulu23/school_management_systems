import { resolveAllocationSeason } from '@/lib/timetable/allocationSeason'
import { removeTeacherAllocationsByNotesTags } from '@/lib/timetable/protectPublishedAllocations'

function matchesSeason(allocationData, term, academicYear) {
  const season = resolveAllocationSeason(allocationData, { term, academicYear })
  return season.term === term && season.academicYear === academicYear
}

/**
 * Remove HOD department allocation workflow rows for a season and clean synced solver inputs.
 * MasterTimetableEntry + AllocationNotification cascade when DepartmentAllocation is deleted.
 * TeacherAllocations that still underpin **published** timetable cells are preserved by default.
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
    /** If true, also allow deleting TeacherAllocations that still have published cells (dangerous). */
    includePublishedTimetable = false,
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
  let teacherAllocationsPreserved = 0
  let draftEntriesDeleted = 0

  if (includeSyncedTeacherAllocations && allocationIds.length > 0) {
    const notesTags = allocationIds.map((id) => `departmentAllocation:${id}`)
    const teacherResult = await removeTeacherAllocationsByNotesTags(db, schoolId, notesTags, {
      preservePublished: !includePublishedTimetable,
    })
    teacherAllocationsDeleted = teacherResult.count
    teacherAllocationsPreserved = teacherResult.preserved
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
    teacherAllocationsPreserved,
    draftEntriesDeleted,
  }
}
