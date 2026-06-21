/**
 * Ensure each approved department allocation produces one pushed TeacherAllocation row
 * per class. Repairs legacy rows where only the first class was synced.
 */
import {
  dedupeGradeLabels,
  unwrapDepartmentAllocationData,
} from '@/lib/timetable/departmentApprovalSync'
import { normalizeGradeLabel } from '@/lib/timetable/zambiaTerminology'

const DEPT_NOTE_RE = /^departmentAllocation:([0-9a-f-]{36})$/i

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
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 */
export async function normalizePushedAllocations(db, schoolId, allocations) {
  if (!Array.isArray(allocations) || allocations.length === 0) return []

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
      const row = existing || {
        ...template,
        id: `${template.id}-${classId}`,
        classId,
        class: { id: classId, name: label },
      }

      const key = allocationKey(row)
      if (seen.has(key)) continue
      seen.add(key)
      result.push(row)
    }
  }

  return result
}

/** @deprecated Use normalizePushedAllocations — kept for callers that only need passthrough. */
export function enrichAllocationsForExpansion(allocations) {
  return allocations || []
}
