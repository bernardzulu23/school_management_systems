export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface SchoolSummary {
  id: string
  name: string
  subdomain: string
  logoUrl?: string | null
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  schoolId: string
}

export interface LoginResponse {
  success: boolean
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
  school: SchoolSummary
}

export interface TeachingAssignment {
  id: string
  classId: string
  className: string | null
  subjectId: string
  subjectName: string | null
}

export interface SessionContext {
  user: { id: string; name: string; role: string }
  school: { name: string | null; logoUrl: string | null }
  assignments: TeachingAssignment[]
}

export interface RosterStudent {
  id: string
  name: string
  class: string | null
  qrCode: string | null
  faceEmbedding?: string | null
  /** Present when roster is loaded with face data; false = no active parental consent. */
  hasFacialConsent?: boolean | null
  twinGroupId?: string | null
  requiresSecondaryAuth?: boolean
  secondaryAuthMethod?: string | null
}

export interface LessonSessionMark {
  studentId: string
  status?: AttendanceStatus
  method?: 'MANUAL' | 'FACE' | 'FINGERPRINT'
  faceMatchScore?: number
  /** @deprecated Not trusted by server */
  secondaryVerified?: boolean
  /** From twin-verify PIN success — required when twin secondary auth is needed */
  twinAuthToken?: string
}

export interface LessonSessionSyncPayload {
  sessionId: string
  classId: string
  subjectId: string
  marks: LessonSessionMark[]
  close?: boolean
  sendAbsentSms?: boolean
}

export interface AttendanceRecord {
  studentId: string
  status: AttendanceStatus
  remarks?: string | null
}

export interface AttendanceBatch {
  date: string
  records: AttendanceRecord[]
}

export interface SbaTask {
  id: string
  title: string
  formLevel: number
  component: string
  subject: { id: string; name: string }
  rubric?: {
    criteria: Array<{ id: string; description: string; maxMarks: number }>
  }
}

export interface SbaScoreSubmit {
  assessmentId: string
  studentId: string
  formLevel: number
  academicYear: number
  taskNumber: 1 | 2 | 3 | 4
  score?: number
  excellentCount?: number
  goodCount?: number
  fairCount?: number
  needsImprovementCount?: number
  rubricBreakdown?: Record<string, unknown>
}

export type OfflineQueueItem =
  | { type: 'attendance'; id: string; createdAt: string; payload: AttendanceBatch }
  | { type: 'score'; id: string; createdAt: string; payload: SbaScoreSubmit }
  | { type: 'lessonSession'; id: string; createdAt: string; payload: LessonSessionSyncPayload }

export interface SyncResult {
  success: boolean
  attendance: { synced: number; failed: Array<{ index: number; error: string }> }
  scores: { synced: number; failed: Array<{ index: number; error: string }> }
  lessonSessions?: { synced: number; failed: Array<{ index: number; error: string }> }
}

// --- Student feature screens (Task 31) ---

export interface TimetableAssignment {
  id: string
  dayOfWeek: string
  period: number
  startTime?: string | null
  endTime?: string | null
  subjectId?: string
  subjectName?: string
  className?: string
  teacherName?: string
}

export interface TimetableTimeSlot {
  period: number
  startTime?: string | null
  endTime?: string | null
  label?: string | null
}

export interface TimetableView {
  assignments: TimetableAssignment[]
  timeSlots: TimetableTimeSlot[]
  term: string
  academicYear: string
  status: string
  message?: string
}

export interface StudentResult {
  id: string
  subject: string
  subjectCode: string
  score: number | null
  grade: string | null
  term: string | null
  year: number | null
  comments: string | null
  date: string
}

export interface EczQuestion {
  id: string
  type: 'mcq' | 'short' | 'structured'
  question: string
  options?: string[]
  marks: number
  answer: string
  explanation?: string
}

export interface EczPaper {
  examInfo: {
    subject: string
    level: string
    topic: string
    totalMarks: number
    timeAllowed: string
  }
  questions: EczQuestion[]
}

export interface EczGenerateInput {
  subject: string
  topic: string
  examLevel?: string
  questionCount?: number
}

export interface Notice {
  id: string
  title: string
  description: string
  date: string
  location: string
  type: string
  organizer: string | null
  upcoming: boolean
}

export interface LessonPlanSummary {
  id: string
  status: string
  grade: string
  subject: string
  topic: string
  subTopic?: string | null
  duration?: number | null
  term?: string | null
  templateType?: string | null
  createdAt: string
  version?: number
}

export interface LessonPlanDetail extends LessonPlanSummary {
  content: string
}
