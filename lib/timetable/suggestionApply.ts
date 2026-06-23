import type { Assignment } from './types'

const SLOT_FIELDS = ['dayOfWeek', 'startTime', 'endTime', 'period', 'isBreak'] as const

function patchSlotFields(target: Assignment, source: Assignment): Assignment {
  const patch: Partial<Assignment> = {}
  for (const key of SLOT_FIELDS) {
    patch[key] = source[key]
  }
  return { ...target, ...patch }
}

/** Apply a slot move onto the latest assignment list (fixes cascade collisions). */
export function mergeAssignmentMove(
  assignments: Assignment[],
  assignmentId: Assignment['id'],
  replacement: Assignment
): (current?: Assignment[]) => Assignment[] {
  const id = String(assignmentId)
  return (current) => {
    const list = current ?? assignments
    return list.map((a) => (String(a.id) === id ? patchSlotFields(a, replacement) : a))
  }
}

/** Apply preview slot/teacher/room changes onto the latest list. */
export function mergePreview(
  snapshot: Assignment[],
  preview: Assignment[]
): (current?: Assignment[]) => Assignment[] {
  const byId = new Map(preview.map((a) => [String(a.id), a]))
  return (current) => {
    const list = current ?? snapshot
    return list.map((a) => {
      const patch = byId.get(String(a.id))
      if (!patch) return a
      return {
        ...a,
        dayOfWeek: patch.dayOfWeek,
        startTime: patch.startTime,
        endTime: patch.endTime,
        period: patch.period,
        isBreak: patch.isBreak,
        classroomId: patch.classroomId,
        teacherId: patch.teacherId,
        classId: patch.classId,
        subjectId: patch.subjectId,
      }
    })
  }
}
