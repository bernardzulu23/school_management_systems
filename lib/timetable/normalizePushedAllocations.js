/**
 * Ensure each approved department allocation produces one pushed TeacherAllocation row
 * per class. Repairs legacy rows where only the first class was synced.
 *
 * Use `{ deferWrites: true }` during generate so upserts only commit with draft entries
 * in the same transaction (no orphan rows if generation fails).
 */
import {
  dedupeGradeLabels,
  unwrapDepartmentAllocationData,
} from '@/lib/timetable/departmentApprovalSync'
import { normalizeGradeLabel } from '@/lib/timetable/zambiaTerminology'

const DEPT_NOTE_RE = /^departmentAllocation:([0-9a-f-]{36})$/i

const ALLOCATION_INCLUDE = {
  teacher: { select: { id: true, name: true } },
  subject: { select: { id: true, name: true, code: true } },
  class: { select: { id: true, name: true } },
  hod: { select: { hodProfile: { select: { department: true } } } },
}

export function pendingAllocationId(deptAllocationId, classId) {
  return `pending:${deptAllocationId}:${classId}`
}

export function isPendingAllocationId(id) {
  return String(id || '').startsWith('pending:')
}

async function resolveClassIdForSchool(tx, schoolId, label) {
  const raw = String(label || '').trim()
  if (!raw) return null

  const exact = await tx.class.findFirst({
    where: { schoolId, name: { equals: raw, mode: 'insensitive' } },
    select: { id: true, name: true },
  })
  if (exact) return exact.id

  const targetKey = normalizeGradeLabel(raw)
  const compact = raw.replace(/\s+/g, '').toLowerCase()
  const rows = await tx.class.findMany({
    where: { schoolId },
    select: { id: true, name: true, year_group: true, section: true },
    take: 800,
  })

  const matches = []
  for (const row of rows) {
    const n = String(row.name || '')
      .replace(/\s+/g, '')
      .toLowerCase()
    const y = `${String(row.year_group || '').trim()}${String(row.section || '').trim()}`
      .replace(/\s+/g, '')
      .toLowerCase()
    const keys = [
      normalizeGradeLabel(row.name || ''),
      normalizeGradeLabel(`${row.year_group || ''} ${row.section || ''}`),
      normalizeGradeLabel(`${row.year_group || ''}${row.section || ''}`),
    ]
    if (n === compact || y === compact || keys.includes(targetKey)) {
      matches.push(row)
    }
  }

  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0].id
  const exactName = matches.find((m) => String(m.name || '').toLowerCase() === raw.toLowerCase())
  return exactName?.id || matches[0].id
}

function allocationKey(row) {
  return `${row.teacherId}|${row.subjectId}|${row.classId}|${row.term}|${row.academicYear}`
}

/**
 * Upsert a missing per-class pushed row so TimetableAllocationEntry FK is valid.
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 */
export async function upsertPushedRowForClass(
  db,
  schoolId,
  template,
  classId,
  className,
  deptAllocationId
) {
  const notesTag = `departmentAllocation:${deptAllocationId}`
  const pushedAt = new Date()

  return db.teacherAllocation.upsert({
    where: {
      schoolId_teacherId_subjectId_classId_term_academicYear: {
        schoolId,
        teacherId: template.teacherId,
        subjectId: template.subjectId,
        classId,
        term: template.term,
        academicYear: template.academicYear,
      },
    },
    update: {
      hodId: template.hodId,
      periodsPerWeek: template.periodsPerWeek,
      blockType: template.blockType,
      singlePeriods: template.singlePeriods,
      doublePeriods: template.doublePeriods,
      triplePeriods: template.triplePeriods,
      status: 'pushed',
      pushedAt,
      notes: notesTag,
    },
    create: {
      schoolId,
      hodId: template.hodId,
      teacherId: template.teacherId,
      subjectId: template.subjectId,
      classId,
      periodsPerWeek: template.periodsPerWeek,
      blockType: template.blockType,
      singlePeriods: template.singlePeriods,
      doublePeriods: template.doublePeriods,
      triplePeriods: template.triplePeriods,
      term: template.term,
      academicYear: template.academicYear,
      status: 'pushed',
      pushedAt,
      notes: notesTag,
    },
    include: ALLOCATION_INCLUDE,
  })
}

/**
 * Apply deferred multi-class upserts (same shape as normalize pendingUpserts).
 * @returns {Promise<Map<string, string>>} pending id → real TeacherAllocation.id
 */
export async function applyPendingPushedAllocationUpserts(db, schoolId, pendingUpserts) {
  const idMap = new Map()
  for (const item of pendingUpserts || []) {
    const pendingId = pendingAllocationId(item.deptAllocationId, item.classId)
    const row = await upsertPushedRowForClass(
      db,
      schoolId,
      item.template,
      item.classId,
      item.className,
      item.deptAllocationId
    )
    idMap.set(pendingId, row.id)
  }
  return idMap
}

/**
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 * @param {{ deferWrites?: boolean }} [opts]
 * @returns {Promise<any[] | { allocations: any[], pendingUpserts: any[] }>}
 */
export async function normalizePushedAllocations(db, schoolId, allocations, opts = {}) {
  const deferWrites = opts.deferWrites === true
  if (!Array.isArray(allocations) || allocations.length === 0) {
    return deferWrites ? { allocations: [], pendingUpserts: [] } : []
  }

  const byDept = new Map()
  const passthrough = []

  for (const row of allocations) {
    const note = String(row.notes || '').trim()
    const match = note.match(DEPT_NOTE_RE)
    if (match) {
      const deptId = match[1]
      if (!byDept.has(deptId)) byDept.set(deptId, [])
      byDept.get(deptId).push(row)
    } else {
      passthrough.push(row)
    }
  }

  const result = [...passthrough]
  const seen = new Set(result.map(allocationKey))
  const pendingUpserts = []

  for (const [deptId, rows] of byDept.entries()) {
    const dept = await db.departmentAllocation.findFirst({
      where: { id: deptId, schoolId },
      select: { allocationData: true },
    })

    const gradeLabels = dept
      ? dedupeGradeLabels(unwrapDepartmentAllocationData(dept.allocationData).classes)
      : []

    if (gradeLabels.length <= 1) {
      for (const row of rows) {
        const key = allocationKey(row)
        if (!seen.has(key)) {
          seen.add(key)
          result.push(row)
        }
      }
      continue
    }

    const template = rows[0]
    for (const label of gradeLabels) {
      const classId = await resolveClassIdForSchool(db, schoolId, label)
      if (!classId) continue

      const existing = rows.find((r) => String(r.classId) === String(classId))
      let row = existing
      if (!row) {
        if (deferWrites) {
          const pendingId = pendingAllocationId(deptId, classId)
          row = {
            ...template,
            id: pendingId,
            classId,
            class: { id: classId, name: label },
          }
          pendingUpserts.push({
            template,
            classId,
            className: label,
            deptAllocationId: deptId,
          })
        } else {
          row = await upsertPushedRowForClass(db, schoolId, template, classId, label, deptId)
        }
      }

      const key = allocationKey(row)
      if (seen.has(key)) continue
      seen.add(key)
      result.push(row)
    }
  }

  if (deferWrites) return { allocations: result, pendingUpserts }
  return result
}

/** @deprecated Use normalizePushedAllocations — kept for callers that only need passthrough. */
export function enrichAllocationsForExpansion(allocations) {
  return allocations || []
}
