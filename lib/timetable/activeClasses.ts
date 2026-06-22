import type { Assignment, Class } from './types'

type ClassLike = Pick<Class, 'id' | 'name'> & {
  students?: number
  studentCount?: number
  isActive?: boolean
  yearGroup?: string
  year_group?: string
  assignmentCount?: number
}

function studentCount(c: ClassLike): number {
  const n = Number(c.students ?? c.studentCount ?? 0)
  return Number.isFinite(n) ? n : 0
}

function extractSection(name: string): string {
  const m = String(name || '')
    .trim()
    .match(/([A-Za-z])$/)
  return m ? m[1].toLowerCase() : ''
}

/**
 * Canonical label for deduping "10A" vs "Grade 10A" vs "Form 1B".
 * Returns keys like `form-1-b`, `grade-10-a`, or a normalized fallback.
 */
export function normalizeClassLabel(name: string, yearGroup?: string): string {
  const combined = `${yearGroup || ''} ${name || ''}`.trim().toLowerCase().replace(/\s+/g, ' ')

  const form =
    combined.match(/form\s*([1-6])\s*([a-z])?/) ||
    String(name || '')
      .trim()
      .match(/^form\s*([1-6])\s*([a-z])?/i)
  if (form) {
    const section = (form[2] || extractSection(name) || 'a').toLowerCase()
    return `form-${form[1]}-${section}`
  }

  const grade =
    combined.match(/grade\s*(1[0-2])\s*([a-z])?/) || combined.match(/\bgrade\s*(1[0-2])([a-z])\b/)
  if (grade) {
    const section = (grade[2] || extractSection(name) || 'a').toLowerCase()
    return `grade-${grade[1]}-${section}`
  }

  const compact = String(name || '')
    .trim()
    .match(/^([1-9]|1[0-2])([a-z])$/i)
  if (compact) {
    const n = Number(compact[1])
    const section = compact[2].toLowerCase()
    if (n >= 10) return `grade-${n}-${section}`
    if (n <= 6) return `form-${n}-${section}`
  }

  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

function classRank(c: ClassLike): number {
  let score = Number(c.assignmentCount || 0) * 1000
  score += studentCount(c) * 10
  if (/^(form|grade)\s/i.test(String(c.name || ''))) score += 5
  if (c.isActive === false) score -= 10000
  return score
}

/** When two DB rows share the same canonical label, keep the best candidate. */
export function dedupeClassesByLabel<T extends ClassLike>(classes: T[]): T[] {
  const best = new Map<string, T>()
  for (const c of classes || []) {
    const key = normalizeClassLabel(String(c.name || ''), c.yearGroup || c.year_group)
    const prev = best.get(key)
    if (!prev || classRank(c) > classRank(prev)) best.set(key, c)
  }
  return Array.from(best.values())
}

export function attachAssignmentCounts<T extends ClassLike>(
  classes: T[],
  assignments: Assignment[] = []
): Array<T & { assignmentCount: number }> {
  const byId = new Map<string, number>()
  const byLabel = new Map<string, number>()

  for (const a of assignments || []) {
    const id = String(a?.classId || '').trim()
    if (id) byId.set(id, (byId.get(id) || 0) + 1)
    const lbl = normalizeClassLabel(String(a?.className || ''))
    if (lbl) byLabel.set(lbl, (byLabel.get(lbl) || 0) + 1)
  }

  return (classes || []).map((c) => {
    const id = String(c.id)
    const lbl = normalizeClassLabel(String(c.name || ''), c.yearGroup || c.year_group)
    const count = byId.get(id) || byLabel.get(lbl) || 0
    return { ...c, assignmentCount: count }
  })
}

/**
 * Timetable class tabs — only classes with ≥1 assignment (by id or normalized name).
 */
export function filterClassesForTimetablePicker<T extends ClassLike>(
  classes: T[],
  assignments: Assignment[] = []
): Array<T & { assignmentCount: number }> {
  const withCounts = attachAssignmentCounts(classes, assignments)
  const labelTotals = new Map<string, number>()
  for (const c of withCounts) {
    const key = normalizeClassLabel(String(c.name || ''), c.yearGroup || c.year_group)
    labelTotals.set(key, (labelTotals.get(key) || 0) + Number(c.assignmentCount || 0))
  }
  const merged = withCounts.map((c) => {
    const key = normalizeClassLabel(String(c.name || ''), c.yearGroup || c.year_group)
    return { ...c, assignmentCount: labelTotals.get(key) || Number(c.assignmentCount || 0) }
  })
  return dedupeClassesByLabel(
    merged.filter((c) => c.isActive !== false && Number(c.assignmentCount) > 0)
  )
}

/**
 * Class wall / master grid — only rows with ≥1 timetable assignment (deduped labels).
 */
export function filterClassesForWallGrid<T extends ClassLike>(
  classes: T[],
  assignments: Assignment[] = []
): Array<T & { assignmentCount: number }> {
  return filterClassesForTimetablePicker(classes, assignments)
}

/**
 * Keep only classes that exist for this school in practice: enrolled learners,
 * timetable assignments, or HOD allocation rows — not every unused Class record.
 */
export function filterClassesInUse<T extends ClassLike>(
  classes: T[],
  opts: {
    assignments?: Assignment[]
    allocationClassNames?: string[]
    /** When true, skip classes with only enrolment (no timetable/allocation match). */
    requireAssignments?: boolean
  } = {}
): T[] {
  if (!Array.isArray(classes) || classes.length === 0) return []

  const byId = new Set<string>()
  const byName = new Set<string>()

  for (const a of opts.assignments || []) {
    if (a?.classId) byId.add(String(a.classId))
    const lbl = normalizeClassLabel(String(a?.className || ''))
    if (lbl) byName.add(lbl)
  }
  for (const raw of opts.allocationClassNames || []) {
    const name = String(raw || '')
      .trim()
      .toLowerCase()
    if (name) byName.add(normalizeClassLabel(name))
  }

  const filtered = classes.filter((c) => {
    if (c.isActive === false) return false
    const id = String(c.id)
    const name = normalizeClassLabel(String(c.name || ''), c.yearGroup || c.year_group)
    if (byId.has(id)) return true
    if (name && byName.has(name)) return true
    if (opts.requireAssignments) return false
    if (studentCount(c) > 0) return true
    return false
  })

  const base =
    filtered.length > 0
      ? filtered
      : opts.requireAssignments
        ? []
        : classes.filter((c) => c.isActive !== false && studentCount(c) > 0)

  return dedupeClassesByLabel(base)
}

export function collectAllocationClassNames(rows: unknown[]): string[] {
  const names: string[] = []
  for (const row of rows || []) {
    const data =
      row && typeof row === 'object' && (row as any).allocationData
        ? (row as any).allocationData
        : row
    const classes = (data as any)?.classes
    if (Array.isArray(classes)) {
      names.push(...classes.map((x: unknown) => String(x || '').trim()).filter(Boolean))
    } else if (typeof classes === 'string' && classes.trim()) {
      names.push(
        ...classes
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
      )
    }
  }
  return names
}

/** Infer numeric grade for timetable UI (Forms 1–6, Grades 10–12). */
export function inferClassGrade(name: string, yearGroup?: string): number {
  const source = String(yearGroup || name || '').trim()
  const form = source.match(/form\s*([1-6])/i)
  if (form) return Number(form[1])
  const grade = source.match(/grade\s*(1[0-2])/i)
  if (grade) return Number(grade[1])
  const compact = source.match(/^(1[0-2]|[1-6])[a-z]?$/i)
  if (compact) return Number(compact[1])
  return 10
}
