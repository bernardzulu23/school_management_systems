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
  twinGroupId?: string | null
  requiresSecondaryAuth?: boolean
  secondaryAuthMethod?: string | null
}

export interface LessonSessionMark {
  studentId: string
  status?: AttendanceStatus
  method?: 'MANUAL' | 'FACE' | 'FINGERPRINT'
  faceMatchScore?: number
  secondaryVerified?: boolean
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
