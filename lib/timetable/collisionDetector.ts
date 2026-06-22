import type {
  AgriculturalCalendar,
  Assignment,
  Class,
  Classroom,
  Conflict,
  ConflictSeverity,
  ConflictSuggestion,
  ConflictType,
  DayOfWeek,
  LocalTimeHHMM,
  Teacher,
  TimeSlot,
  TravelingTeacherRoute,
} from './types'
import { TIMETABLE_CLASS_CENTRIC } from './classCentric'
import { assignmentsShareSlot, teacherClassSameDayConflict } from './constraintCheck'
import { rankTeachingSlots } from './slotScoring'

export interface WorkloadStatus {
  status: 'ok' | 'warning' | 'overload'
  currentPeriods: number
  maxPeriods?: number
  message?: string
}

export interface Suggestion {
  title: string
  description: string
  reason: string
  costReduction: number
  impactedAssignments: number
  preview: Assignment[]
  apply: () => Assignment[]
}

export interface CollisionDetectorOptions {
  assignments: Assignment[]
  timeSlots?: TimeSlot[]
  teachers?: Teacher[]
  classrooms?: Classroom[]
  classes?: Class[]
  agriculturalCalendar?: AgriculturalCalendar
  travelingTeacherRoutes?: TravelingTeacherRoute[]
  seasonMode?: 'normal' | 'planting' | 'harvest'
}

function genId() {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (c?.randomUUID) return c.randomUUID()
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function toMinutes(time: LocalTimeHHMM) {
  const [h, m] = String(time).split(':')
  const hh = Number(h)
  const mm = Number(m)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0
  return hh * 60 + mm
}

const PLACEHOLDER_ROOM_PREFIXES = ['room-unassigned', 'room-1', 'class-']

function isPlaceholderClassroom(roomId: string) {
  if (TIMETABLE_CLASS_CENTRIC) return true
  const id = String(roomId || '')
  return PLACEHOLDER_ROOM_PREFIXES.some((p) => id === p || id.startsWith(p))
}

function normalizeSeasonMode(mode: CollisionDetectorOptions['seasonMode']): Assignment['season'] {
  if (mode === 'planting') return 'planting'
  if (mode === 'harvest') return 'farming'
  return 'normal'
}

export class CollisionDetector {
  private assignments: Assignment[]
  private timeSlots: TimeSlot[]
  private teachers: Teacher[]
  private classrooms: Classroom[]
  private classes: Class[]
  private agriculturalCalendar?: AgriculturalCalendar
  private travelingTeacherRoutes: TravelingTeacherRoute[]
  private season: Assignment['season']

  private byTeacher: Map<string, Assignment[]>
  private byClassroom: Map<string, Assignment[]>
  private byClass: Map<string, Assignment[]>

  constructor(opts: CollisionDetectorOptions) {
    this.assignments = Array.isArray(opts.assignments) ? opts.assignments : []
    this.timeSlots = Array.isArray(opts.timeSlots) ? opts.timeSlots : []
    this.teachers = Array.isArray(opts.teachers) ? opts.teachers : []
    this.classrooms = Array.isArray(opts.classrooms) ? opts.classrooms : []
    this.classes = Array.isArray(opts.classes) ? opts.classes : []
    this.agriculturalCalendar = opts.agriculturalCalendar
    this.travelingTeacherRoutes = Array.isArray(opts.travelingTeacherRoutes)
      ? opts.travelingTeacherRoutes
      : []
    this.season = normalizeSeasonMode(opts.seasonMode)

    this.byTeacher = new Map()
    this.byClassroom = new Map()
    this.byClass = new Map()

    for (const a of this.assignments) {
      if (!a || a.season !== this.season) continue
      const tid = String(a.teacherId)
      const cid = String(a.classId)
      if (!this.byTeacher.has(tid)) this.byTeacher.set(tid, [])
      if (!this.byClass.has(cid)) this.byClass.set(cid, [])
      if (!TIMETABLE_CLASS_CENTRIC) {
        const rid = String(a.classroomId || '')
        if (rid) {
          if (!this.byClassroom.has(rid)) this.byClassroom.set(rid, [])
          this.byClassroom.get(rid)!.push(a)
        }
      }
      this.byTeacher.get(tid)!.push(a)
      this.byClass.get(cid)!.push(a)
    }
  }

  /**
   * Utility: checks whether two time ranges overlap.
   *
   * Example:
   * - 08:00–08:40 overlaps 08:20–09:00 => true
   * - 08:00–08:40 overlaps 08:40–09:20 => false
   */
  timeSlotsOverlap(
    slot1: Pick<Assignment, 'startTime' | 'endTime'>,
    slot2: Pick<Assignment, 'startTime' | 'endTime'>
  ): boolean {
    const a0 = toMinutes(slot1.startTime)
    const a1 = toMinutes(slot1.endTime)
    const b0 = toMinutes(slot2.startTime)
    const b1 = toMinutes(slot2.endTime)
    if (a1 <= a0 || b1 <= b0) return false
    return a0 < b1 && b0 < a1
  }

  private sameDay(a: Assignment, day: DayOfWeek) {
    return String(a.dayOfWeek) === String(day)
  }

  private findTeacher(id: string) {
    return this.teachers.find((t) => String(t.id) === id)
  }

  private findClass(id: string) {
    return this.classes.find((c) => String(c.id) === id)
  }

  private findClassroom(id: string) {
    return this.classrooms.find((r) => String(r.id) === id)
  }

  checkTeacherConflict(teacher: Teacher, timeSlot: TimeSlot): boolean
  checkTeacherConflict(teacher: Teacher, timeSlot: TimeSlot, detailed: true): Conflict[]
  checkTeacherConflict(
    teacher: Teacher,
    timeSlot: TimeSlot,
    detailed?: true
  ): boolean | Conflict[] {
    const teacherId = String(teacher?.id)
    const list = this.byTeacher.get(teacherId) || []
    const conflicts: Conflict[] = []
    for (const a of list) {
      if (!this.sameDay(a, timeSlot.dayOfWeek)) continue
      if (!this.timeSlotsOverlap(a, timeSlot)) continue
      conflicts.push(
        this.makeConflict('TeacherDoubleBooked', 'critical', 'Teacher is double-booked', {
          assignmentIds: [a.id],
          teacherIds: [teacherId],
        })
      )
    }
    return detailed ? conflicts : conflicts.length > 0
  }

  checkClassroomConflict(classroom: Classroom, timeSlot: TimeSlot): boolean
  checkClassroomConflict(classroom: Classroom, timeSlot: TimeSlot, detailed: true): Conflict[]
  checkClassroomConflict(
    classroom: Classroom,
    timeSlot: TimeSlot,
    detailed?: true
  ): boolean | Conflict[] {
    if (TIMETABLE_CLASS_CENTRIC) return detailed ? [] : false
    const roomId = String(classroom?.id)
    if (isPlaceholderClassroom(roomId)) {
      return detailed ? [] : false
    }
    const list = this.byClassroom.get(roomId) || []
    const conflicts: Conflict[] = []
    for (const a of list) {
      if (!this.sameDay(a, timeSlot.dayOfWeek)) continue
      if (!this.timeSlotsOverlap(a, timeSlot)) continue
      conflicts.push(
        this.makeConflict('RoomDoubleBooked', 'critical', 'Classroom is double-booked', {
          assignmentIds: [a.id],
          classroomIds: [roomId],
        })
      )
    }
    return detailed ? conflicts : conflicts.length > 0
  }

  checkStudentGroupConflict(studentClass: Class, timeSlot: TimeSlot): boolean
  checkStudentGroupConflict(studentClass: Class, timeSlot: TimeSlot, detailed: true): Conflict[]
  checkStudentGroupConflict(
    studentClass: Class,
    timeSlot: TimeSlot,
    detailed?: true
  ): boolean | Conflict[] {
    const classId = String(studentClass?.id)
    const list = this.byClass.get(classId) || []
    const conflicts: Conflict[] = []
    for (const a of list) {
      if (!this.sameDay(a, timeSlot.dayOfWeek)) continue
      if (!this.timeSlotsOverlap(a, timeSlot)) continue
      conflicts.push(
        this.makeConflict('ClassDoubleBooked', 'critical', 'Grade is double-booked', {
          assignmentIds: [a.id],
          classIds: [classId],
        })
      )
    }
    return detailed ? conflicts : conflicts.length > 0
  }

  checkTeacherAvailability(teacher: Teacher, timeSlot: TimeSlot): boolean
  checkTeacherAvailability(teacher: Teacher, timeSlot: TimeSlot, detailed: true): Conflict[]
  checkTeacherAvailability(
    teacher: Teacher,
    timeSlot: TimeSlot,
    detailed?: true
  ): boolean | Conflict[] {
    const teacherId = String(teacher?.id)
    const windows = Array.isArray(teacher?.availability) ? teacher.availability : []
    if (windows.length === 0) return detailed ? [] : true

    const conflicts: Conflict[] = []
    const slotStart = toMinutes(timeSlot.startTime)
    const slotEnd = toMinutes(timeSlot.endTime)

    const ok = windows.some((w) => {
      const season = w.season || 'all'
      if (season !== 'all' && season !== this.season) return false
      if (String(w.dayOfWeek) !== String(timeSlot.dayOfWeek)) return false
      const wStart = toMinutes(w.startTime)
      const wEnd = toMinutes(w.endTime)
      if (wEnd <= wStart) return false
      const available = w.available !== false
      return available && wStart <= slotStart && slotEnd <= wEnd
    })

    if (!ok) {
      conflicts.push(
        this.makeConflict(
          'TeacherUnavailable',
          'critical',
          'Teacher is unavailable during this time',
          {
            teacherIds: [teacherId],
          }
        )
      )
    }
    return detailed ? conflicts : ok
  }

  checkClassroomCapacity(classroom: Classroom, studentCount: number): boolean
  checkClassroomCapacity(classroom: Classroom, studentCount: number, detailed: true): Conflict[]
  checkClassroomCapacity(
    classroom: Classroom,
    studentCount: number,
    detailed?: true
  ): boolean | Conflict[] {
    if (TIMETABLE_CLASS_CENTRIC) return detailed ? [] : true
    const cap = Number(classroom?.capacity || 0)
    const n = Number(studentCount || 0)
    const ok = cap <= 0 ? true : n <= cap
    if (!detailed) return ok
    if (ok) return []
    return [
      this.makeConflict(
        'CapacityExceeded',
        'high',
        `Class size (${n}) exceeds classroom capacity (${cap})`,
        { classroomIds: [String(classroom?.id)] }
      ),
    ]
  }

  checkTeacherWorkload(teacher: Teacher, assignment: Assignment): WorkloadStatus {
    const teacherId = String(teacher?.id)
    const list = (this.byTeacher.get(teacherId) || []).filter((a) => a.season === assignment.season)
    const maxPerWeek = Number(teacher?.maxHours?.perWeek || 0)
    const current = list.length
    if (!maxPerWeek) return { status: 'ok', currentPeriods: current }
    if (current + 1 > maxPerWeek) {
      return { status: 'overload', currentPeriods: current + 1, maxPeriods: maxPerWeek }
    }
    if (current + 1 >= Math.floor(maxPerWeek * 0.9)) {
      return { status: 'warning', currentPeriods: current + 1, maxPeriods: maxPerWeek }
    }
    return { status: 'ok', currentPeriods: current + 1, maxPeriods: maxPerWeek }
  }

  /**
   * Validates a single assignment against current schedule state.
   * Use for real-time drag-drop validation by passing the "what-if" assignment.
   */
  validateAssignment(assignment: Assignment): Conflict[] {
    if (!assignment) return []
    const conflicts: Conflict[] = []
    if (assignment.isBreak) return conflicts

    const listTeacher = this.byTeacher.get(String(assignment.teacherId)) || []
    for (const a of listTeacher) {
      if (a.id === assignment.id) continue
      if (a.season !== assignment.season) continue
      if (String(a.classId) !== String(assignment.classId)) continue
      if (teacherClassSameDayConflict(assignment, a, this.timeSlots)) {
        conflicts.push(
          this.makeConflict('ClassDoubleBooked', 'critical', 'Grade is double-booked', {
            assignmentIds: [assignment.id, a.id],
            classIds: [String(assignment.classId)],
            teacherIds: [String(assignment.teacherId)],
          })
        )
        break
      }
    }

    for (const a of listTeacher) {
      if (a.id === assignment.id) continue
      if (a.season !== assignment.season) continue
      if (String(a.classId) === String(assignment.classId)) continue
      if (!assignmentsShareSlot(a, assignment, this.timeSlots)) continue
      conflicts.push(
        this.makeConflict('TeacherDoubleBooked', 'critical', 'Teacher is double-booked', {
          assignmentIds: [assignment.id, a.id],
          teacherIds: [String(assignment.teacherId)],
        })
      )
      break
    }

    if (!TIMETABLE_CLASS_CENTRIC) {
      const roomId = String(assignment.classroomId || '')
      if (roomId && !isPlaceholderClassroom(roomId)) {
        const listRoom = this.byClassroom.get(roomId) || []
        for (const a of listRoom) {
          if (a.id === assignment.id) continue
          if (a.season !== assignment.season) continue
          if (!assignmentsShareSlot(a, assignment, this.timeSlots)) continue
          conflicts.push(
            this.makeConflict('RoomDoubleBooked', 'critical', 'Classroom is double-booked', {
              assignmentIds: [assignment.id, a.id],
              classroomIds: [roomId],
            })
          )
          break
        }
      }
    }

    const listClass = this.byClass.get(String(assignment.classId)) || []
    for (const a of listClass) {
      if (a.id === assignment.id) continue
      if (a.season !== assignment.season) continue
      if (!assignmentsShareSlot(a, assignment, this.timeSlots)) continue
      conflicts.push(
        this.makeConflict('ClassDoubleBooked', 'critical', 'Grade is double-booked', {
          assignmentIds: [assignment.id, a.id],
          classIds: [String(assignment.classId)],
        })
      )
      break
    }

    const teacher = this.findTeacher(String(assignment.teacherId))
    if (teacher && this.timeSlots.length > 0) {
      const slot = this.timeSlots.find(
        (s) =>
          s.dayOfWeek === assignment.dayOfWeek &&
          s.startTime === assignment.startTime &&
          s.endTime === assignment.endTime
      )
      if (slot)
        conflicts.push(...(this.checkTeacherAvailability(teacher, slot, true) as Conflict[]))
    }

    const studentClass = this.findClass(String(assignment.classId))
    if (!TIMETABLE_CLASS_CENTRIC) {
      const room = this.findClassroom(String(assignment.classroomId))
      if (studentClass && room) {
        const count = Array.isArray(studentClass.students)
          ? studentClass.students.length
          : Number(studentClass.students)
        conflicts.push(...(this.checkClassroomCapacity(room, count, true) as Conflict[]))
      }
    }

    conflicts.push(...this.validateTravelingTeacherAssignment(assignment))
    conflicts.push(...this.validateAgriculturalRisk(assignment))

    return conflicts
  }

  validateTravelingTeacherRoute(route: TravelingTeacherRoute): Conflict[] {
    if (!route) return []
    const conflicts: Conflict[] = []
    if (!Array.isArray(route.travelTimes) || route.travelTimes.length === 0) return conflicts
    for (const leg of route.travelTimes) {
      const minutes = Number(leg.minutes)
      if (!Number.isFinite(minutes) || minutes < 0) {
        conflicts.push(
          this.makeConflict('TravelTimeImpossible', 'high', 'Invalid travel time configuration', {
            teacherIds: [String(route.teacherId)],
          })
        )
        break
      }
    }
    return conflicts
  }

  getConflictSeverity(conflict: Conflict): number {
    const map: Record<ConflictSeverity, number> = {
      low: 10,
      medium: 30,
      high: 70,
      critical: 100,
    }
    return map[conflict.severity] || 0
  }

  suggestAlternatives(conflict: Conflict): Suggestion[] {
    const suggestions: Suggestion[] = []
    const related = conflict.related || {}
    const assignmentId = related.assignmentIds?.[0]
    if (!assignmentId) return suggestions
    const base = this.assignments.find((a) => String(a.id) === String(assignmentId))
    if (!base) return suggestions

    const moveAnyDay = this.suggestMoveToAnyFreeSlot(base)
    if (moveAnyDay) suggestions.push(moveAnyDay)

    const move = this.suggestMoveToFreeSlot(base)
    if (move) suggestions.push(move)

    const swap = this.suggestSwap(base)
    if (swap) suggestions.push(swap)

    if (!TIMETABLE_CLASS_CENTRIC) {
      const changeRoom = this.suggestAlternativeRoom(base)
      if (changeRoom) suggestions.push(changeRoom)
    }

    return suggestions.slice(0, 3)
  }

  isTeacherAvailable(
    teacherId: string,
    dayOfWeek: DayOfWeek,
    startTime: LocalTimeHHMM,
    endTime: LocalTimeHHMM
  ): boolean {
    const teacher = this.findTeacher(String(teacherId))
    if (!teacher) return true
    const slot: TimeSlot = { dayOfWeek, startTime, endTime, period: 0, isBreak: false }
    return (this.checkTeacherAvailability(teacher, slot) as boolean) === true
  }

  /**
   * Detects conflicts for all assignments in the current season.
   * Optimized to scale for 1000+ assignments by indexing by resource id.
   */
  detectAllConflicts(): Map<string, Conflict[]> {
    const out = new Map<string, Conflict[]>()
    const teacherIndex = new Map<string, Assignment[]>()
    const roomIndex = new Map<string, Assignment[]>()
    const classIndex = new Map<string, Assignment[]>()

    const push = (assignmentId: string, conflict: Conflict) => {
      const key = String(assignmentId)
      if (!out.has(key)) out.set(key, [])
      out.get(key)!.push(conflict)
    }

    const list = this.assignments.filter((a) => a && a.season === this.season && !a.isBreak)
    for (const a of list) {
      const tid = String(a.teacherId)
      const cid = String(a.classId)

      for (const prev of teacherIndex.get(tid) || []) {
        if (String(prev.classId) === cid && teacherClassSameDayConflict(a, prev, this.timeSlots)) {
          const c = this.makeConflict('ClassDoubleBooked', 'critical', 'Grade is double-booked', {
            assignmentIds: [prev.id, a.id],
            classIds: [cid],
            teacherIds: [tid],
          })
          push(String(prev.id), c)
          push(String(a.id), c)
          continue
        }
        if (!assignmentsShareSlot(prev, a, this.timeSlots)) continue
        const c = this.makeConflict('TeacherDoubleBooked', 'critical', 'Teacher is double-booked', {
          assignmentIds: [prev.id, a.id],
          teacherIds: [tid],
        })
        push(String(prev.id), c)
        push(String(a.id), c)
      }

      if (!TIMETABLE_CLASS_CENTRIC) {
        const rid = String(a.classroomId || '')
        if (rid && !isPlaceholderClassroom(rid)) {
          for (const prev of roomIndex.get(rid) || []) {
            if (!assignmentsShareSlot(prev, a, this.timeSlots)) continue
            const c = this.makeConflict(
              'RoomDoubleBooked',
              'critical',
              'Classroom is double-booked',
              {
                assignmentIds: [prev.id, a.id],
                classroomIds: [rid],
              }
            )
            push(String(prev.id), c)
            push(String(a.id), c)
          }
        }
      }

      for (const prev of classIndex.get(cid) || []) {
        if (!assignmentsShareSlot(prev, a, this.timeSlots)) continue
        const c = this.makeConflict('ClassDoubleBooked', 'critical', 'Grade is double-booked', {
          assignmentIds: [prev.id, a.id],
          classIds: [cid],
        })
        push(String(prev.id), c)
        push(String(a.id), c)
      }

      for (const c of this.validateTravelingTeacherAssignment(a)) push(String(a.id), c)
      for (const c of this.validateAgriculturalRisk(a)) push(String(a.id), c)

      if (!teacherIndex.has(tid)) teacherIndex.set(tid, [])
      if (!classIndex.has(cid)) classIndex.set(cid, [])
      teacherIndex.get(tid)!.push(a)
      classIndex.get(cid)!.push(a)
      if (!TIMETABLE_CLASS_CENTRIC) {
        const rid = String(a.classroomId || '')
        if (rid) {
          if (!roomIndex.has(rid)) roomIndex.set(rid, [])
          roomIndex.get(rid)!.push(a)
        }
      }
    }

    return out
  }

  private validateTravelingTeacherAssignment(assignment: Assignment): Conflict[] {
    const routes = this.travelingTeacherRoutes.filter(
      (r) => String(r.teacherId) === String(assignment.teacherId)
    )
    if (routes.length === 0) return []
    if (!Array.isArray(routes[0].travelTimes) || routes[0].travelTimes.length === 0) return []

    const conflicts: Conflict[] = []
    const teacherAssignments = (this.byTeacher.get(String(assignment.teacherId)) || []).filter(
      (a) => a.season === assignment.season && a.dayOfWeek === assignment.dayOfWeek
    )

    if (teacherAssignments.length <= 1) return conflicts
    const sorted = [...teacherAssignments].sort(
      (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)
    )
    const idx = sorted.findIndex((x) => String(x.id) === String(assignment.id))
    const prev = idx > 0 ? sorted[idx - 1] : null
    const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null
    if (!prev && !next) return conflicts

    const route = routes[0]
    const buffer = Number(route.optimization?.estimatedMinutesPerDay || 0)
    const addBuffer = Number.isFinite(buffer) && buffer > 0 ? buffer : 0

    const travelNeeded = (fromSchoolId: string, toSchoolId: string) => {
      const leg = route.travelTimes.find(
        (t) =>
          String(t.fromSchoolId) === String(fromSchoolId) &&
          String(t.toSchoolId) === String(toSchoolId)
      )
      return Number(leg?.minutes || 0)
    }

    const checkLeg = (a1: Assignment, a2: Assignment) => {
      const s1 = String((a1 as unknown as { schoolId?: string }).schoolId || '')
      const s2 = String((a2 as unknown as { schoolId?: string }).schoolId || '')
      if (!s1 || !s2 || s1 === s2) return
      const travel = travelNeeded(s1, s2)
      const gap = toMinutes(a2.startTime) - toMinutes(a1.endTime)
      if (travel > 0 && gap < travel + addBuffer) {
        conflicts.push(
          this.makeConflict(
            'TravelTimeImpossible',
            'high',
            'Travel time makes this schedule infeasible',
            { assignmentIds: [a1.id, a2.id], teacherIds: [String(assignment.teacherId)] }
          )
        )
      }
    }

    if (prev) checkLeg(prev, assignment)
    if (next) checkLeg(assignment, next)

    return conflicts
  }

  private validateAgriculturalRisk(assignment: Assignment): Conflict[] {
    const cal = this.agriculturalCalendar
    if (!cal || !Array.isArray(cal.months) || cal.months.length === 0) return []
    if (assignment.season !== 'farming' && assignment.season !== 'planting') return []
    const seasonByMonth = cal.seasonByMonth || {}
    const peakMonths = cal.months.filter((m) => m.intensity >= 0.8)
    if (peakMonths.length === 0) return []

    const mappedSeasonMonths = peakMonths.filter(
      (m) => seasonByMonth?.[m.month] === assignment.season
    )
    if (mappedSeasonMonths.length === 0) return []

    return [
      this.makeConflict(
        'AgriculturalAttendanceRisk',
        'medium',
        'High agricultural workload may reduce attendance for this schedule period',
        { assignmentIds: [assignment.id], classIds: [String(assignment.classId)] }
      ),
    ]
  }

  private makeConflict(
    type: ConflictType,
    severity: ConflictSeverity,
    message: string,
    related?: Conflict['related'],
    suggestions?: ConflictSuggestion[]
  ): Conflict {
    return {
      id: genId(),
      type,
      severity,
      season: this.season,
      message,
      related,
      suggestions,
    }
  }

  private suggestMoveToFreeSlot(base: Assignment): Suggestion | null {
    if (!Array.isArray(this.timeSlots) || this.timeSlots.length === 0) return null
    const classAssignments = this.byClass.get(String(base.classId)) || []
    const sameDaySlots = rankTeachingSlots(
      this.timeSlots.filter((s) => s.dayOfWeek === base.dayOfWeek),
      base,
      classAssignments,
      { penalizeSameDay: false, excludeSameSlot: true }
    )

    for (const candidate of sameDaySlots) {
      const whatIf: Assignment = {
        ...base,
        startTime: candidate.startTime,
        endTime: candidate.endTime,
        period: candidate.period,
        isBreak: candidate.isBreak,
      }
      if (this.validateAssignment(whatIf).length !== 0) continue

      const previewAssignment: Assignment = { ...whatIf }
      const preview = this.assignments.map((a) => (a.id === base.id ? previewAssignment : a))

      return {
        title: `Move to ${String(base.dayOfWeek)} period ${candidate.period}`,
        description: 'Moves the lesson to an available slot on the same day.',
        reason: 'Minimizes disruption while resolving the conflict.',
        costReduction: 50,
        impactedAssignments: 1,
        preview,
        apply: () => preview,
      }
    }

    return null
  }

  /** Search all days/periods for a conflict-free slot (Zambian auto-resolve). */
  suggestMoveToAnyFreeSlot(base: Assignment): Suggestion | null {
    if (!Array.isArray(this.timeSlots) || this.timeSlots.length === 0) return null
    const classAssignments = this.byClass.get(String(base.classId)) || []
    const teachingSlots = rankTeachingSlots(this.timeSlots, base, classAssignments, {
      penalizeSameDay: true,
      excludeSameSlot: true,
    })

    for (const slot of teachingSlots) {
      const whatIf: Assignment = {
        ...base,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        period: slot.period,
        isBreak: slot.isBreak,
      }
      if (this.validateAssignment(whatIf).length !== 0) continue

      const preview = this.assignments.map((a) => (a.id === base.id ? whatIf : a))
      return {
        title: `Move to ${String(slot.dayOfWeek)} period ${slot.period}`,
        description: 'Moves the lesson to a free slot on another day or period.',
        reason: 'Resolves double-booking with better weekly distribution.',
        costReduction: 40,
        impactedAssignments: 1,
        preview,
        apply: () => preview,
      }
    }
    return null
  }

  private suggestAlternativeRoom(base: Assignment): Suggestion | null {
    if (TIMETABLE_CLASS_CENTRIC) return null
    if (!Array.isArray(this.classrooms) || this.classrooms.length === 0) return null
    const candidates = this.classrooms.filter((r) => String(r.id) !== String(base.classroomId))
    const room = candidates.find((r) => {
      const whatIf: Assignment = { ...base, classroomId: r.id }
      return this.validateAssignment(whatIf).every(
        (c) => c.type !== 'RoomDoubleBooked' && c.type !== 'CapacityExceeded'
      )
    })
    if (!room) return null
    const previewAssignment: Assignment = { ...base, classroomId: room.id }
    const preview = this.assignments.map((a) => (a.id === base.id ? previewAssignment : a))
    return {
      title: `Use ${room.name} instead`,
      description: 'Changes the classroom to a free alternative.',
      reason: 'Resolves room conflicts with minimal schedule movement.',
      costReduction: 30,
      impactedAssignments: 1,
      preview,
      apply: () => preview,
    }
  }

  private suggestSwap(base: Assignment): Suggestion | null {
    const dayAssignments = this.assignments.filter(
      (a) =>
        a.season === base.season && a.dayOfWeek === base.dayOfWeek && a.id !== base.id && !a.isBreak
    )
    const target = dayAssignments.find((a) => {
      const a1: Assignment = {
        ...base,
        startTime: a.startTime,
        endTime: a.endTime,
        period: a.period,
      }
      const a2: Assignment = {
        ...a,
        startTime: base.startTime,
        endTime: base.endTime,
        period: base.period,
      }
      return this.validateAssignment(a1).length === 0 && this.validateAssignment(a2).length === 0
    })
    if (!target) return null
    const a1: Assignment = {
      ...base,
      startTime: target.startTime,
      endTime: target.endTime,
      period: target.period,
    }
    const a2: Assignment = {
      ...target,
      startTime: base.startTime,
      endTime: base.endTime,
      period: base.period,
    }
    const preview = this.assignments.map((x) =>
      x.id === base.id ? a1 : x.id === target.id ? a2 : x
    )
    return {
      title: 'Swap with another class',
      description: 'Swaps time slots with another assignment to remove conflicts.',
      reason: 'Keeps overall timetable density stable while resolving a collision.',
      costReduction: 40,
      impactedAssignments: 2,
      preview,
      apply: () => preview,
    }
  }
}
