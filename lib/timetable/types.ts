/**
 * ZSMS Timetable System — Core Type Definitions
 *
 * Designed for:
 * - multi-season scheduling (normal, farming, planting)
 * - Zambian constraints (traveling teachers, agricultural calendar)
 * - offline-first operation with sync-friendly identifiers
 * - hard/soft constraints for feasibility + optimization
 *
 * UI colors must reference the existing global design system (CSS variables / utility classes)
 * defined in app/globals.css (e.g. kpi-* classes, brand/dash tokens).
 */

export type UUID = string

/**
 * Days used for scheduling. Zambia schools typically operate Monday–Friday,
 * but Saturday/Sunday are included for flexibility (weekend study, exams, make-up lessons).
 */
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

/**
 * Timetable seasons. "Farming" and "planting" are supported as first-class season modes
 * to reflect attendance variation and teacher availability in rural Zambia.
 */
export type TimetableSeason = 'normal' | 'farming' | 'planting'

/**
 * Time string in 24-hour local format.
 * Example: "08:40"
 */
export type LocalTimeHHMM = `${number}${number}:${number}${number}`

/**
 * ISO date string.
 * Example: "2026-04-18"
 */
export type ISODate = `${number}-${number}-${number}`

/**
 * Weekday-aligned time slot definition.
 */
export interface TimeSlot {
  /** Stable identifier for referencing a slot from assignments. */
  id?: string | number
  /** Day of week the slot belongs to. */
  dayOfWeek: DayOfWeek
  /** Slot start time in local 24h format. */
  startTime: LocalTimeHHMM
  /** Slot end time in local 24h format. */
  endTime: LocalTimeHHMM
  /** Ordinal lesson period number (e.g., 1..12). Breaks may share this number or omit it. */
  period: number
  /** Whether this slot is a break/lunch/assembly slot. */
  isBreak: boolean
  /** When true, this period spans two consecutive teachable rows (double period). */
  isDouble?: boolean
  /** Duration in minutes (from DB TimeSlot). */
  duration?: number
  /** Optional label for UI (e.g. "Period 1", "Break"). */
  label?: string
}

/**
 * References existing global CSS token system.
 * Prefer token/className/cssVar; hex exists only for legacy imports.
 */
export type UiColorToken =
  | 'brand.primary'
  | 'brand.hover'
  | 'brand.light'
  | 'brand.accent'
  | 'dash.bg'
  | 'dash.card'
  | 'dash.text'
  | 'dash.muted'
  | 'kpi.zero'
  | 'kpi.fail'
  | 'kpi.warn'
  | 'kpi.pass'

export type CssVarRef = `--${string}`

export type CssClassRef =
  | 'kpi-zero'
  | 'kpi-fail'
  | 'kpi-warn'
  | 'kpi-pass'
  | 'badge-brand'
  | 'avatar'
  | 'date-widget'
  | 'btn-primary'
  | 'btn-ghost'
  | 'dash-text'
  | 'dash-muted'
  | 'dash-subtext'
  | 'form-card'
  | 'form-page'
  | 'form-input'
  | 'zsms-table'
  | 'zsms-select'

export type ColorRef =
  | { kind: 'token'; token: UiColorToken }
  | { kind: 'cssVar'; value: CssVarRef }
  | { kind: 'className'; value: CssClassRef }
  | { kind: 'hex'; value: `#${string}` }

export type GradeBand = 'primary' | 'secondary' | 'combined'

export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

/**
 * Minimal subject reference for the timetable layer.
 * Real subject metadata lives in the Subjects module/API, but schedule engines need a stable view.
 */
export interface SubjectRef {
  id: UUID | string
  name: string
  /** Optional department for HOD-level analytics & constraints. */
  department?: string
  /** Optional semantic color reference for UI. */
  color?: ColorRef
  /** Flag for local language offerings (Bemba, Tonga, Nyanja, Lozi, etc.). */
  isLocalLanguage?: boolean
}

export interface StudentRef {
  id: UUID | string
  fullName?: string
  /** Optional exam number or school identifier. */
  examNumber?: string
}

export interface SchoolRef {
  id: UUID | string
  name: string
  district?: string
  province?: string
  /** Optional coordinates for travel-time estimation. */
  geo?: { lat: number; lng: number }
}

/**
 * Availability windows for teachers/rooms/classes.
 * Allows both season-specific and global (all seasons) windows.
 */
export interface AvailabilityWindow {
  season?: TimetableSeason | 'all'
  dayOfWeek: DayOfWeek
  startTime: LocalTimeHHMM
  endTime: LocalTimeHHMM
  /** Whether the resource is available during the window. Defaults to true. */
  available?: boolean
  /** Optional reason metadata (e.g., "Travel day", "Clinic", "Market day"). */
  reason?: string
}

/**
 * Teacher preferences are treated as soft constraints.
 */
export interface TeacherPreferences {
  /** Prefer to teach in the morning (before break/lunch). */
  preferMorning?: boolean
  /** Prefer contiguous blocks (minimize idle gaps). */
  minimizeGaps?: boolean
  /** Prefer certain rooms/equipment (e.g. lab) for specific subjects. */
  preferredEquipment?: ClassroomEquipment[]
  /** Prefer specific days for certain subjects (e.g. practicals). */
  preferredDays?: Partial<Record<DayOfWeek, SubjectRef['id'][] | 'any'>>
  /** Avoid last period assignments. */
  avoidLastPeriod?: boolean
  /** Preferred max travel legs per day for traveling teachers. */
  maxTravelLegsPerDay?: number
}

/**
 * Teacher definition for timetable generation and conflict analysis.
 */
export interface Teacher {
  id: UUID | string
  fullName: string
  /** Subjects the teacher is qualified/approved to teach. */
  subjects: SubjectRef[]
  /** Availability windows (season-aware). */
  availability: AvailabilityWindow[]
  /** Maximum teaching load. */
  maxHours: {
    perDay?: number
    perWeek?: number
    perTerm?: number
  }
  /** Optional soft preferences (used by optimization). */
  preferences?: TeacherPreferences
  /**
   * Traveling teacher configuration (Zambian feature).
   * Teachers can be shared between schools (rural clusters) and may need travel-time feasibility checks.
   */
  traveling?: {
    enabled: boolean
    /** Schools served by the teacher in addition to the home school. */
    schools: SchoolRef[]
    /** Optional route reference describing typical travel plan. */
    routeId?: UUID | string
    /** Travel time buffer in minutes to add around trips. */
    bufferMinutes?: number
  }
}

export type ClassroomEquipment =
  | 'chalkboard'
  | 'whiteboard'
  | 'projector'
  | 'computer'
  | 'internet'
  | 'science-lab'
  | 'computer-lab'
  | 'home-economics-lab'
  | 'library'
  | 'music'
  | 'sports-equipment'
  | 'power-backup'

export type AccessibilityFeature =
  | 'wheelchair-access'
  | 'hearing-support'
  | 'vision-support'
  | 'near-entrance'
  | 'ground-floor'
  | 'accessible-restroom'

/**
 * Classroom definition for scheduling and capacity conflicts.
 */
export interface Classroom {
  id: UUID | string
  name: string
  capacity: number
  equipment: ClassroomEquipment[]
  accessibility: AccessibilityFeature[]
  /** Optional availability windows (maintenance, exams, community meetings). */
  availability?: AvailabilityWindow[]
}

/**
 * School class/group definition (e.g., "Grade 9A", "Form 2B").
 */
export interface Class {
  id: UUID | string
  name: string
  grade: GradeLevel
  band?: GradeBand
  color?: ColorRef
  students: number | StudentRef[]
  subjects: SubjectRef[]
}

/**
 * Assignment links a class (grade/form), teacher, and subject to a time slot.
 * Zambian schools schedule by class — not by physical room.
 */
export interface Assignment {
  id: UUID | string
  season: TimetableSeason
  dayOfWeek: DayOfWeek
  timeSlotId?: TimeSlot['id']
  startTime: LocalTimeHHMM
  endTime: LocalTimeHHMM
  period: number
  isBreak?: boolean
  teacherId: Teacher['id']
  classId: Class['id']
  subjectId: SubjectRef['id']
  /** Legacy field — not used in class-centric (Zambian) timetables. */
  classroomId?: Classroom['id']
  /** Optional extra metadata for UI and audits. */
  notes?: string
  /** Whether this assignment is user-edited (manual override) vs auto-generated. */
  source?: 'manual' | 'generated' | 'imported'
}

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ConflictType =
  | 'TeacherDoubleBooked'
  | 'ClassDoubleBooked'
  | 'RoomDoubleBooked'
  | 'TeacherUnavailable'
  | 'RoomUnavailable'
  | 'CapacityExceeded'
  | 'EquipmentMissing'
  | 'BreakViolation'
  | 'TravelTimeImpossible'
  | 'AgriculturalAttendanceRisk'
  | 'HardConstraintViolation'
  | 'SoftConstraintPenalty'

export interface ConflictSuggestion {
  /** Human-readable action suggestion. */
  label: string
  /** Optional recommended change payload for auto-fix tooling. */
  proposedChange?:
    | { kind: 'swapAssignments'; a: Assignment['id']; b: Assignment['id'] }
    | {
        kind: 'moveAssignment'
        assignmentId: Assignment['id']
        to: Partial<
          Pick<
            Assignment,
            'dayOfWeek' | 'startTime' | 'endTime' | 'period' | 'classroomId' | 'teacherId'
          >
        >
      }
    | { kind: 'addBuffer'; teacherId: Teacher['id']; minutes: number }
    | { kind: 'changeRoom'; assignmentId: Assignment['id']; classroomId: Classroom['id'] }
  /** Confidence score for automated suggestions (0..1). */
  confidence?: number
}

/**
 * A detected issue within a schedule (hard violation or optimization penalty).
 */
export interface Conflict {
  id: UUID | string
  type: ConflictType
  severity: ConflictSeverity
  /** Which season the conflict applies to (if scoped). */
  season?: TimetableSeason
  /** Human readable explanation. */
  message: string
  /** References to impacted resources. */
  related?: {
    assignmentIds?: Array<Assignment['id']>
    teacherIds?: Array<Teacher['id']>
    classIds?: Array<Class['id']>
    classroomIds?: Array<Classroom['id']>
    subjectIds?: Array<SubjectRef['id']>
  }
  /** Suggestions to resolve or reduce the issue. */
  suggestions?: ConflictSuggestion[]
  /** Optional numeric impact value (minutes, students affected, penalty points). */
  impact?: number
}

/**
 * Summary + full list of conflicts for a schedule run.
 */
export interface ConflictReport {
  id: UUID | string
  scheduleId: TimetableSchedule['id']
  generatedAt: string
  season?: TimetableSeason | 'all'
  conflicts: Conflict[]
  summary: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
    byType: Partial<Record<ConflictType, number>>
  }
  /** Hard constraints that failed feasibility. */
  hardViolations: Array<{
    constraintId: HardConstraint['id']
    type: HardConstraint['type']
    message: string
    related?: Conflict['related']
  }>
  /** Soft constraint scoring output (lower is better if using penalties). */
  optimization?: {
    score: number
    breakdown?: Array<{
      constraintId: SoftConstraint['id']
      type: SoftConstraint['type']
      weight: number
      penalty: number
    }>
  }
  /** High-level recommendations. */
  recommendations?: string[]
}

export type AgriculturalMonth =
  | 'jan'
  | 'feb'
  | 'mar'
  | 'apr'
  | 'may'
  | 'jun'
  | 'jul'
  | 'aug'
  | 'sep'
  | 'oct'
  | 'nov'
  | 'dec'

/**
 * Agricultural calendar used to model seasonal attendance and staffing impacts.
 */
export interface AgriculturalCalendar {
  id: UUID | string
  schoolId?: SchoolRef['id']
  year: number
  months: Array<{
    month: AgriculturalMonth
    /** 0..1 where 1 is peak agricultural workload. */
    intensity: number
    /**
     * Expected attendance multiplier (0..1+). Example: 0.85 means 15% lower attendance.
     * This can influence soft constraints (avoid heavy exams during peak).
     */
    attendanceImpact: number
    /**
     * Optional notes (e.g., "Harvest period", "Planting peak", "Farming season begins").
     */
    notes?: string
  }>
  /**
   * Season mapping used by timetable generation to choose the right season schedule.
   */
  seasonByMonth?: Partial<Record<AgriculturalMonth, TimetableSeason>>
}

export interface TravelLeg {
  fromSchoolId: SchoolRef['id']
  toSchoolId: SchoolRef['id']
  /** Travel time in minutes (includes typical road conditions). */
  minutes: number
  /** Optional distance (km) for analytics. */
  distanceKm?: number
  /** Optional transport mode constraints. */
  mode?: 'walk' | 'bicycle' | 'motorbike' | 'car' | 'bus' | 'boat'
}

/**
 * Traveling teacher route model (schools served + travel time feasibility).
 */
export interface TravelingTeacherRoute {
  id: UUID | string
  teacherId: Teacher['id']
  /** Ordered list of schools in the planned route. */
  schools: SchoolRef[]
  /** Pairwise travel legs (may be sparse). */
  travelTimes: TravelLeg[]
  optimization?: {
    /** Optimization objective. */
    objective: 'minTravelTime' | 'minTravelLegs' | 'maximizeCoverage' | 'balanced'
    /** Optional solver metadata. */
    solver?: 'heuristic' | 'ilp' | 'cp-sat' | 'genetic' | 'manual'
    /** If computed, total daily travel time estimate (minutes). */
    estimatedMinutesPerDay?: number
  }
}

export interface ConstraintContext {
  season: TimetableSeason
  timeSlots: TimeSlot[]
  assignments: Assignment[]
  teachers: Teacher[]
  classes: Class[]
  classrooms: Classroom[]
  subjects: SubjectRef[]
  agriculturalCalendar?: AgriculturalCalendar
  travelingRoutes?: TravelingTeacherRoute[]
}

export type ConstraintResult =
  | { ok: true }
  | {
      ok: false
      message: string
      related?: Conflict['related']
      suggestions?: ConflictSuggestion[]
    }

export type HardConstraintType =
  | 'NoTeacherDoubleBooking'
  | 'NoClassDoubleBooking'
  | 'NoRoomDoubleBooking'
  | 'TeacherMustBeAvailable'
  | 'RoomMustBeAvailable'
  | 'RoomCapacityMustFit'
  | 'BreaksMustBeRespected'
  | 'TravelTimeMustBeFeasible'

/**
 * A hard constraint must always be satisfied. Any violation invalidates the schedule.
 */
export interface HardConstraint {
  id: UUID | string
  type: HardConstraintType
  description: string
  /** If true, applies across all seasons; otherwise only the current season evaluation. */
  appliesToAllSeasons?: boolean
  /** Optional evaluator function signature (for engines that run constraints in-process). */
  evaluate?: (context: ConstraintContext) => ConstraintResult
}

export type SoftConstraintType =
  | 'MinimizeTeacherGaps'
  | 'PreferMorningForCoreSubjects'
  | 'DistributeDifficultSubjects'
  | 'ReduceTeacherTravel'
  | 'PreferHomeRoom'
  | 'BalanceRoomUtilization'
  | 'AvoidLatePeriods'
  | 'AvoidPeakAgricultureForExams'

/**
 * Soft constraints are optimization goals. They may be violated with a penalty score.
 */
export interface SoftConstraint {
  id: UUID | string
  type: SoftConstraintType
  description: string
  /** Weight (importance) used by optimizers. Higher = more important. */
  weight: number
  /**
   * Penalty scoring function (0+). Lower is better.
   * If omitted, engines may use built-in heuristics for the constraint type.
   */
  score?: (context: ConstraintContext) => number
}

export interface OfflineMetadata {
  /** Indicates that schedule data can be used without network connectivity. */
  offlineCapable: boolean
  /** Revision used for conflict-free offline edits. */
  revision: number
  /** Client-generated id used before server persistence. */
  localId?: UUID | string
  /** If true, local edits exist that are not synchronized to the server. */
  hasPendingSync?: boolean
  /** Optional last sync timestamp. */
  lastSyncedAt?: string
}

export interface SeasonSchedule {
  season: TimetableSeason
  /** Optional effective date range for the season. */
  dateRange?: { from: ISODate; to: ISODate }
  timeSlots: TimeSlot[]
  assignments: Assignment[]
  /** Constraint set used when generating or validating this season schedule. */
  constraints?: {
    hard: HardConstraint[]
    soft: SoftConstraint[]
  }
  /** Optional report produced by a validation run. */
  conflictReport?: ConflictReport
}

/**
 * Master timetable schedule supporting multiple seasons and offline operation.
 */
export interface TimetableSchedule {
  id: UUID | string
  schoolId: SchoolRef['id']
  academicYear: string
  term?: 1 | 2 | 3
  /** Multi-season schedules keyed by season. */
  seasons: Record<TimetableSeason, SeasonSchedule>
  /** Zambian agricultural calendar that may influence season selection and attendance. */
  agriculturalCalendar?: AgriculturalCalendar
  /** Traveling teacher routes used for feasibility + optimization. */
  travelingTeacherRoutes?: TravelingTeacherRoute[]
  /** Offline-first metadata for device caching/sync. */
  offline?: OfflineMetadata
  createdAt?: string
  updatedAt?: string
}
