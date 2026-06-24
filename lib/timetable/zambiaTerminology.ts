import type { Assignment, Class } from './types'

/**
 * Zambian school terminology:
 * - Grade / Form = permanent student group (Form 1A, 10A) — stored as Prisma `Class`
 * - Class / Room = physical teaching space (stored as Prisma `Classroom`)
 */

export const STUDENT_GROUP = {
  singular: 'Grade',
  plural: 'Grades',
} as const

export const PHYSICAL_ROOM = {
  singular: 'Class',
  plural: 'Classes',
} as const

/** UI label for a list of student groups, e.g. "Grades:" */
export function studentGroupListLabel() {
  return `${STUDENT_GROUP.plural}:`
}

/** Compact key for deduplication: "Form 1A" / "FORM 1A" / "1A" → comparable token */
export function normalizeGradeLabel(raw: string): string {
  const s = String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!s) return ''

  const formMatch = s.match(/^form\s*(\d+)\s*([a-z])$/i)
  if (formMatch) {
    return `form${formMatch[1]}${formMatch[2].toLowerCase()}`
  }

  const gradeMatch = s.match(/^grade\s*(\d+)\s*([a-z])$/i)
  if (gradeMatch) {
    return `grade${gradeMatch[1]}${gradeMatch[2].toLowerCase()}`
  }

  const compactMatch = s.match(/^(\d+)\s*([a-z])$/i)
  if (compactMatch) {
    return `num${compactMatch[1]}${compactMatch[2].toLowerCase()}`
  }

  return s.replace(/\s+/g, '').toLowerCase()
}

/** Display-friendly canonical label from DB row fields */
export function formatStudentGroupName(row: {
  name?: string | null
  year_group?: string | null
  yearGroup?: string | null
  section?: string | null
}): string {
  const name = String(row?.name || '').trim()
  if (name) return name
  const yg = String(row?.year_group || row?.yearGroup || '').trim()
  const sec = String(row?.section || '').trim()
  if (yg && sec) return `${yg}${sec}`
  return yg || sec || 'Unknown'
}

/** Conflict display message for grade double-booking */
export function gradeDoubleBookedMessage(classLabel?: string | null) {
  const label = String(classLabel || '').trim()
  if (label) return `${label} is double-booked`
  return `${STUDENT_GROUP.singular} is double-booked`
}

type AssignmentWithClassName = Assignment & { className?: string | null }

/** Build minimal class rows for conflict labelling from assignment payloads. */
export function classesFromAssignments(
  assignments: Assignment[],
  existingClasses: Class[] = []
): Class[] {
  const byId = new Map<string, Class>()
  for (const c of existingClasses) {
    byId.set(String(c.id), c)
  }
  for (const a of assignments || []) {
    const id = String(a?.classId || '').trim()
    if (!id || byId.has(id)) continue
    const name = String((a as AssignmentWithClassName).className || '').trim()
    if (!name) continue
    byId.set(id, {
      id,
      name,
      grade: name,
      students: 0,
      subjects: [],
    })
  }
  return [...byId.values()]
}
