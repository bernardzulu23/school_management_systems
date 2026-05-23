import type {
  Assignment,
  Classroom,
  Conflict,
  Teacher,
  TimeSlot,
  TravelingTeacherRoute,
} from './types'
import { CollisionDetector, type Suggestion } from './collisionDetector'
import { TIMETABLE_CLASS_CENTRIC } from './classCentric'

export type { Suggestion } from './collisionDetector'

export interface SuggestionEngineOptions {
  assignments: Assignment[]
  timeSlots?: TimeSlot[]
  teachers?: Teacher[]
  classrooms?: Classroom[]
  travelingTeacherRoutes?: TravelingTeacherRoute[]
  seasonMode?: 'normal' | 'planting' | 'harvest'
}

function estimateImpact(assignments: Assignment[], changedIds: Array<Assignment['id']>) {
  const set = new Set(changedIds.map(String))
  return assignments.filter((a) => set.has(String(a.id))).length
}

export class SuggestionEngine {
  private detector: CollisionDetector
  private assignments: Assignment[]
  private timeSlots: TimeSlot[]
  private teachers: Teacher[]
  private classrooms: Classroom[]

  constructor(opts: SuggestionEngineOptions) {
    this.assignments = Array.isArray(opts.assignments) ? opts.assignments : []
    this.timeSlots = Array.isArray(opts.timeSlots) ? opts.timeSlots : []
    this.teachers = Array.isArray(opts.teachers) ? opts.teachers : []
    this.classrooms = Array.isArray(opts.classrooms) ? opts.classrooms : []
    this.detector = new CollisionDetector({
      assignments: this.assignments,
      timeSlots: this.timeSlots,
      teachers: this.teachers,
      classrooms: this.classrooms,
      travelingTeacherRoutes: opts.travelingTeacherRoutes,
      seasonMode: opts.seasonMode,
    })
  }

  suggestBestSolutionsForAssignment(assignmentId: string, conflicts: Conflict[]): Suggestion[] {
    const base = this.assignments.find((a) => String(a.id) === String(assignmentId))
    if (!base) return []

    const generated: Suggestion[] = []
    for (const c of conflicts) {
      generated.push(...this.suggestBestSolutions(c))
    }

    const unique = new Map<string, Suggestion>()
    for (const s of generated) unique.set(`${s.title}|${s.impactedAssignments}`, s)

    return this.rankSuggestions(Array.from(unique.values()), base).slice(0, 3)
  }

  suggestAlternativeTimeSlots(assignment: Assignment): Suggestion[] {
    if (!this.timeSlots.length) return []
    const slots = this.timeSlots
      .filter((s) => s.dayOfWeek === assignment.dayOfWeek && !s.isBreak)
      .sort((a, b) => a.period - b.period)

    const out: Suggestion[] = []
    for (const slot of slots) {
      if (slot.startTime === assignment.startTime && slot.endTime === assignment.endTime) continue
      const candidate: Assignment = {
        ...assignment,
        startTime: slot.startTime,
        endTime: slot.endTime,
        period: slot.period,
      }
      const issues = this.detector.validateAssignment(candidate)
      if (issues.length > 0) continue
      const preview = this.assignments.map((a) => (a.id === assignment.id ? candidate : a))
      out.push({
        title: `Move to ${assignment.dayOfWeek} ${slot.startTime}`,
        description: 'Moves the lesson to an available time slot.',
        reason: 'Avoids collisions while keeping the day unchanged.',
        costReduction: 40,
        impactedAssignments: estimateImpact(preview, [assignment.id]),
        preview,
        apply: () => preview,
      })
      if (out.length >= 2) break
    }
    return out
  }

  suggestAlternativeClassrooms(assignment: Assignment): Suggestion[] {
    if (TIMETABLE_CLASS_CENTRIC || !this.classrooms.length) return []
    const out: Suggestion[] = []
    for (const room of this.classrooms) {
      if (String(room.id) === String(assignment.classroomId)) continue
      const candidate: Assignment = { ...assignment, classroomId: room.id }
      const issues = this.detector
        .validateAssignment(candidate)
        .filter((c) => c.type === 'RoomDoubleBooked' || c.type === 'CapacityExceeded')
      if (issues.length > 0) continue
      const preview = this.assignments.map((a) => (a.id === assignment.id ? candidate : a))
      out.push({
        title: `Use ${room.name} instead`,
        description: 'Switches to an alternative available room.',
        reason: 'Fixes room/capacity issues with minimal disruption.',
        costReduction: 25,
        impactedAssignments: estimateImpact(preview, [assignment.id]),
        preview,
        apply: () => preview,
      })
      if (out.length >= 2) break
    }
    return out
  }

  suggestAlternativeTeachers(assignment: Assignment): Suggestion[] {
    if (!this.teachers.length) return []
    const out: Suggestion[] = []
    for (const t of this.teachers) {
      if (String(t.id) === String(assignment.teacherId)) continue
      const canTeach = t.subjects?.some((s) => String(s.id) === String(assignment.subjectId))
      if (!canTeach) continue
      const candidate: Assignment = { ...assignment, teacherId: t.id }
      const issues = this.detector
        .validateAssignment(candidate)
        .filter((c) => c.type === 'TeacherDoubleBooked' || c.type === 'TeacherUnavailable')
      if (issues.length > 0) continue
      const preview = this.assignments.map((a) => (a.id === assignment.id ? candidate : a))
      out.push({
        title: `Assign to ${t.fullName}`,
        description: 'Uses an alternative qualified teacher.',
        reason: 'Resolves teacher conflicts while preserving slot and room.',
        costReduction: 25,
        impactedAssignments: estimateImpact(preview, [assignment.id]),
        preview,
        apply: () => preview,
      })
      if (out.length >= 2) break
    }
    return out
  }

  suggestSwaps(assignment: Assignment): Suggestion[] {
    const out: Suggestion[] = []
    const sameDay = this.assignments.filter(
      (a) =>
        a.dayOfWeek === assignment.dayOfWeek &&
        a.season === assignment.season &&
        a.id !== assignment.id
    )
    for (const other of sameDay) {
      if (this.detector.timeSlotsOverlap(assignment, other)) continue
      const a1: Assignment = {
        ...assignment,
        startTime: other.startTime,
        endTime: other.endTime,
        period: other.period,
      }
      const a2: Assignment = {
        ...other,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        period: assignment.period,
      }
      if (this.detector.validateAssignment(a1).length > 0) continue
      if (this.detector.validateAssignment(a2).length > 0) continue
      const preview = this.assignments.map((a) =>
        a.id === assignment.id ? a1 : a.id === other.id ? a2 : a
      )
      out.push({
        title: 'Swap with another assignment',
        description: 'Swaps two lessons to remove conflicts without changing total load.',
        reason: 'Often resolves collisions while keeping daily structure intact.',
        costReduction: 35,
        impactedAssignments: estimateImpact(preview, [assignment.id, other.id]),
        preview,
        apply: () => preview,
      })
      if (out.length >= 1) break
    }
    return out
  }

  suggestBestSolutions(conflict: Conflict): Suggestion[] {
    const assignmentId = conflict.related?.assignmentIds?.[0]
    if (!assignmentId) return []
    const base = this.assignments.find((a) => String(a.id) === String(assignmentId))
    if (!base) return []

    const list: Suggestion[] = []
    list.push(...this.suggestAlternativeTimeSlots(base))
    list.push(...this.suggestAlternativeClassrooms(base))
    list.push(...this.suggestAlternativeTeachers(base))
    list.push(...this.suggestSwaps(base))
    return this.rankSuggestions(list, base).slice(0, 3)
  }

  rankSuggestions(suggestions: Suggestion[], base: Assignment): Suggestion[] {
    const seen = new Set<string>()
    const scored = suggestions
      .filter((s) => {
        const k = `${s.title}|${s.impactedAssignments}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      .map((s) => {
        const impactPenalty = s.impactedAssignments * 10
        const sameDayBonus = s.title.toLowerCase().includes(String(base.dayOfWeek)) ? 5 : 0
        const score = impactPenalty - s.costReduction - sameDayBonus
        return { s, score }
      })
      .sort((a, b) => a.score - b.score)
      .map((x) => x.s)

    return scored
  }

  estimateSuggestionImpact(suggestion: Suggestion): number {
    return suggestion.impactedAssignments
  }
}
