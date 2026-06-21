import type { Assignment, Class } from './types'

type ClassLike = Pick<Class, 'id' | 'name'> & { students?: number; studentCount?: number }

function studentCount(c: ClassLike): number {
  const n = Number(c.students ?? c.studentCount ?? 0)
  return Number.isFinite(n) ? n : 0
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
  } = {}
): T[] {
  if (!Array.isArray(classes) || classes.length === 0) return []

  const byId = new Set<string>()
  const byName = new Set<string>()

  for (const a of opts.assignments || []) {
    if (a?.classId) byId.add(String(a.classId))
  }
  for (const raw of opts.allocationClassNames || []) {
    const name = String(raw || '')
      .trim()
      .toLowerCase()
    if (name) byName.add(name)
  }

  const filtered = classes.filter((c) => {
    const id = String(c.id)
    const name = String(c.name || '')
      .trim()
      .toLowerCase()
    if (byId.has(id)) return true
    if (name && byName.has(name)) return true
    if (studentCount(c) > 0) return true
    return false
  })

  return filtered.length > 0 ? filtered : classes.filter((c) => studentCount(c) > 0)
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
