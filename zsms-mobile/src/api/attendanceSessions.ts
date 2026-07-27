import { api } from './client'
import type { AttendanceStatus } from '@/types'

export interface AttendanceSessionDto {
  id: string
  classId: string
  subjectId: string
  status: 'OPEN' | 'CLOSED'
  periodLabel?: string | null
  startedAt: string
  endedAt?: string | null
  class?: { name: string | null }
  subject?: { name: string | null }
  marks?: Array<{
    studentId: string
    status: string
    method?: string
    markedAt?: string
  }>
}

export interface SessionMarkDto {
  id: string
  sessionId: string
  studentId: string
  status: string
}

export async function openLessonSession(input: {
  classId: string
  subjectId: string
  periodLabel?: string
  term?: number
  academicYear?: string
}): Promise<AttendanceSessionDto> {
  const res = await api<{ success?: boolean; data?: AttendanceSessionDto } & AttendanceSessionDto>(
    '/api/mobile/attendance/sessions',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
  const session = res?.data && res.data.id ? res.data : (res as AttendanceSessionDto)
  if (!session?.id) {
    throw new Error('Could not open lesson session')
  }
  return session
}

export async function listOpenSessions(): Promise<AttendanceSessionDto[]> {
  const res = await api<{ success: boolean; data: AttendanceSessionDto[] }>(
    '/api/mobile/attendance/sessions?status=OPEN'
  )
  return res.data || []
}

export async function markLessonAttendance(input: {
  sessionId: string
  studentId: string
  method?: 'MANUAL' | 'FACE' | 'FINGERPRINT'
  status?: AttendanceStatus
  faceMatchScore?: number
  /** @deprecated Ignored by server — use twinAuthToken from verifyTwinAuth */
  secondaryVerified?: boolean
  twinAuthToken?: string
}): Promise<SessionMarkDto> {
  const res = await api<{ success: boolean; data: SessionMarkDto }>(
    `/api/mobile/attendance/sessions/${input.sessionId}/marks`,
    {
      method: 'POST',
      body: JSON.stringify({
        studentId: input.studentId,
        method: input.method || 'MANUAL',
        status: input.status,
        faceMatchScore: input.faceMatchScore,
        twinAuthToken: input.twinAuthToken,
      }),
    }
  )
  return res.data
}

export async function closeLessonSession(
  sessionId: string,
  sendAbsentSms = true
): Promise<AttendanceSessionDto> {
  const res = await api<{ success: boolean; data: AttendanceSessionDto }>(
    `/api/mobile/attendance/sessions/${sessionId}/close`,
    {
      method: 'POST',
      body: JSON.stringify({ sendAbsentSms }),
    }
  )
  return res.data
}

export async function verifyFaceMatch(input: {
  sessionId: string
  probeEmbedding: number[]
}): Promise<{
  studentId: string
  name: string
  score: number
  twinGroupId: string | null
  requiresSecondaryAuth: boolean
  secondaryAuthMethod: string | null
}> {
  const res = await api<{
    success: boolean
    data: {
      studentId: string
      name: string
      score: number
      twinGroupId: string | null
      requiresSecondaryAuth: boolean
      secondaryAuthMethod: string | null
    }
  }>('/api/mobile/attendance/verify-face', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function loadRosterWithFace(
  classId: string,
  subjectId: string
): Promise<
  Array<{
    id: string
    name: string
    class: string | null
    qrCode: string | null
    faceEmbedding?: string | null
    hasFacialConsent?: boolean | null
    twinGroupId?: string | null
    requiresSecondaryAuth?: boolean
    secondaryAuthMethod?: string | null
  }>
> {
  const params = new URLSearchParams({
    classId,
    subjectId,
    includeFaceData: 'true',
  })
  const res = await api<
    | Array<Record<string, unknown>>
    | { data?: Array<Record<string, unknown>>; students?: Array<Record<string, unknown>> }
  >(`/api/mobile/class-roster?${params}`)

  const list = Array.isArray(res)
    ? res
    : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.students)
        ? res.students
        : []

  return list
    .map((s) => ({
      id: String(s.id || s.serverId || ''),
      name: String(s.name || s.displayName || 'Student'),
      class: (s.class as string | null) ?? null,
      qrCode: (s.qrCode as string | null) ?? null,
      faceEmbedding: (s.faceEmbedding as string | null) ?? null,
      hasFacialConsent: (s.hasFacialConsent as boolean | null) ?? null,
      twinGroupId: (s.twinGroupId as string | null) ?? null,
      requiresSecondaryAuth: Boolean(s.requiresSecondaryAuth),
      secondaryAuthMethod: (s.secondaryAuthMethod as string | null) ?? null,
    }))
    .filter((s) => s.id)
}
