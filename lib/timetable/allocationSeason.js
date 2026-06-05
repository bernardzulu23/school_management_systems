/**
 * Resolve term/year for syncing approved department allocations into TeacherAllocation rows.
 * Allocation payload is authoritative — headteacher UI season is only a fallback.
 */
export function resolveAllocationSeason(allocationData, body = {}) {
  const dataObj = allocationData && typeof allocationData === 'object' ? allocationData : {}
  const term = String(dataObj.term || body.term || 'Term 1').trim()
  const academicYear = String(
    dataObj.academicYear || body.academicYear || new Date().getFullYear()
  ).trim()
  return { term, academicYear }
}
