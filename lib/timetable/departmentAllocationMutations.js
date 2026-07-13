import { formatPeriodConfigLabel } from '@/lib/timetable/formatPeriodConfig'
import { resolveAllocationSeason } from '@/lib/timetable/allocationSeason'
import {
  syncDepartmentApprovalToTeacherAllocations,
  unwrapDepartmentAllocationData,
} from '@/lib/timetable/departmentApprovalSync'
import { resolveTeacherUserId } from '@/lib/utils/resolveTeacherId'
import { removeSyncedTeacherAllocations as removeSyncedTeacherAllocationsSafe } from '@/lib/timetable/protectPublishedAllocations'

function normalizeString(v) {
  return String(v || '').trim()
}

function normalizeClasses(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  const raw = String(v || '').trim()
  if (!raw) return null
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

/**
 * Merge an allocation update payload into existing allocationData.
 * @param {object} current
 * @param {object} body
 */
export function mergeAllocationPayload(current, body) {
  const nextTeacherIdRaw = normalizeString(body?.teacherId)
  const nextSubject = normalizeString(body?.subject)
  const nextClasses = normalizeClasses(body?.classes)
  const nextPeriodConfig = Object.prototype.hasOwnProperty.call(body || {}, 'periodConfig')
    ? (body?.periodConfig ?? null)
    : undefined
  const nextTerm = normalizeString(body?.term)
  const nextYear = normalizeString(body?.academicYear)

  return {
    ...(current && typeof current === 'object' ? current : {}),
    ...(nextTeacherIdRaw ? { teacherId: nextTeacherIdRaw } : {}),
    ...(nextSubject ? { subject: nextSubject } : {}),
    ...(Array.isArray(nextClasses) ? { classes: nextClasses } : {}),
    ...(nextPeriodConfig !== undefined ? { periodConfig: nextPeriodConfig } : {}),
    ...(nextTerm ? { term: nextTerm } : {}),
    ...(nextYear ? { academicYear: nextYear } : {}),
  }
}

export function departmentAllocationNotesTag(departmentAllocationId) {
  return `departmentAllocation:${departmentAllocationId}`
}

/** @param {import('@prisma/client').Prisma.TransactionClient} tx */
export async function removeSyncedTeacherAllocations(tx, schoolId, departmentAllocationId, opts) {
  return removeSyncedTeacherAllocationsSafe(tx, schoolId, departmentAllocationId, opts)
}

/**
 * After editing an APPROVED allocation, refresh master entry + pushed TeacherAllocation rows.
 * Preserves published timetable cells for allocations that still exist.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
export async function resyncApprovedDepartmentAllocation(tx, params) {
  const { schoolId, allocation, mergedData } = params
  if (allocation.status !== 'APPROVED') {
    return { resynced: false, count: 0 }
  }

  const { term, academicYear } = resolveAllocationSeason(mergedData)
  const details = unwrapDepartmentAllocationData(mergedData)
  const teacherUser = await resolveTeacherUserId(tx, schoolId, details.teacherId)
  if (!teacherUser?.id) {
    throw new Error(
      `Teacher not found in this school (id: ${details.teacherId}). Re-select the teacher and save again.`
    )
  }

  await removeSyncedTeacherAllocations(tx, schoolId, allocation.id, { preservePublished: true })

  const periodConfiguration = formatPeriodConfigLabel(details.periodConfig)
  await tx.masterTimetableEntry.updateMany({
    where: { schoolId, allocationId: allocation.id },
    data: {
      teacherId: teacherUser.id,
      classes: details.classes,
      subject: details.subject,
      periodConfiguration,
    },
  })

  const sync = await syncDepartmentApprovalToTeacherAllocations(tx, {
    schoolId,
    departmentAllocationId: allocation.id,
    allocationData: mergedData,
    teacherUserId: teacherUser.id,
    hodUserId: allocation.createdByUserId,
    term,
    academicYear,
  })

  return { resynced: true, count: sync.count, teacherAllocationIds: sync.teacherAllocationIds }
}

/** @param {import('@prisma/client').Prisma.TransactionClient} tx */
export async function deleteDepartmentAllocationCascade(tx, schoolId, allocationId) {
  await removeSyncedTeacherAllocations(tx, schoolId, allocationId, { preservePublished: true })
  await tx.masterTimetableEntry.deleteMany({ where: { schoolId, allocationId } })
  await tx.allocationNotification.deleteMany({ where: { schoolId, allocationId } })
  await tx.departmentAllocation.delete({ where: { id: allocationId, schoolId } })
}
