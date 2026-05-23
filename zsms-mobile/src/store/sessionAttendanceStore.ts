import { create } from 'zustand'
import {
  closeLessonSession,
  loadRosterWithFace,
  markLessonAttendance,
  openLessonSession,
} from '@/api/attendanceSessions'
import { ApiError } from '@/api/client'
import { useOfflineQueue } from './offlineQueue'
import type { AttendanceStatus, LessonSessionMark, RosterStudent } from '@/types'

export type SessionMarkStatus = 'unmarked' | AttendanceStatus

interface SessionStudent {
  id: string
  name: string
  class: string | null
  mark: SessionMarkStatus
  qrCode?: string | null
  faceEmbedding?: string | null
  twinGroupId?: string | null
  requiresSecondaryAuth?: boolean
  secondaryAuthMethod?: string | null
}

interface SessionDraft {
  sessionId: string
  classId: string
  subjectId: string
  className: string
  subjectName: string
  students: SessionStudent[]
  roster: RosterStudent[]
  pendingMarks: LessonSessionMark[]
  loading: boolean
  closing: boolean
  error: string | null
}

interface TwinPending {
  studentId: string
  studentName: string
  score: number
  secondaryAuthMethod?: string | null
}

interface SessionAttendanceState {
  draft: SessionDraft | null
  twinPending: TwinPending | null
  startSession: (input: {
    classId: string
    subjectId: string
    className?: string
    subjectName?: string
  }) => Promise<void>
  markPresent: (studentId: string, status?: AttendanceStatus) => Promise<void>
  markByFace: (student: RosterStudent, score: number, secondaryVerified?: boolean) => Promise<void>
  completeTwinVerification: () => Promise<void>
  clearTwinPending: () => void
  endSession: () => Promise<'closed' | 'failed' | 'queued'>
}

function mapApiStatus(status: string): SessionMarkStatus {
  const s = String(status || '').toLowerCase()
  if (s === 'present' || s === 'late' || s === 'absent' || s === 'excused') return s
  return 'unmarked'
}

async function applyMarkOnline(
  draft: SessionDraft,
  mark: LessonSessionMark
): Promise<'ok' | 'twin' | 'offline'> {
  try {
    await markLessonAttendance({
      sessionId: draft.sessionId,
      studentId: mark.studentId,
      method: mark.method || 'MANUAL',
      status: mark.status,
      faceMatchScore: mark.faceMatchScore,
      secondaryVerified: mark.secondaryVerified,
    })
    return 'ok'
  } catch (e) {
    if (e instanceof ApiError && (e.code === 'TWIN_SECONDARY_AUTH_REQUIRED' || e.status === 409)) {
      return 'twin'
    }
    const offline =
      (e instanceof ApiError && (e.status === 0 || e.status >= 500)) ||
      (e instanceof TypeError && /fetch|network/i.test(String(e.message)))
    if (offline) return 'offline'
    throw e
  }
}

export const useSessionAttendanceStore = create<SessionAttendanceState>((set, get) => ({
  draft: null,
  twinPending: null,

  startSession: async ({ classId, subjectId, className, subjectName }) => {
    set({ draft: null, twinPending: null })
    set({
      draft: {
        sessionId: '',
        classId,
        subjectId,
        className: className || '',
        subjectName: subjectName || '',
        students: [],
        roster: [],
        pendingMarks: [],
        loading: true,
        closing: false,
        error: null,
      },
    })
    try {
      const [session, roster] = await Promise.all([
        openLessonSession({ classId, subjectId }),
        loadRosterWithFace(classId, subjectId),
      ])
      const markByStudent = new Map(
        (session.marks || []).map((m) => [m.studentId, mapApiStatus(m.status)])
      )
      const students: SessionStudent[] = roster.map((s) => ({
        id: s.id,
        name: s.name,
        class: s.class,
        mark: markByStudent.get(s.id) || 'unmarked',
        qrCode: s.qrCode,
        faceEmbedding: s.faceEmbedding,
        twinGroupId: s.twinGroupId,
        requiresSecondaryAuth: s.requiresSecondaryAuth,
        secondaryAuthMethod: s.secondaryAuthMethod,
      }))
      set({
        draft: {
          sessionId: session.id,
          classId,
          subjectId,
          className: className || session.class?.name || '',
          subjectName: subjectName || session.subject?.name || '',
          students,
          roster,
          pendingMarks: [],
          loading: false,
          closing: false,
          error: null,
        },
      })
    } catch (e) {
      set({
        draft: {
          sessionId: '',
          classId,
          subjectId,
          className: className || '',
          subjectName: subjectName || '',
          students: [],
          roster: [],
          pendingMarks: [],
          loading: false,
          closing: false,
          error: e instanceof Error ? e.message : 'Failed to start session',
        },
      })
    }
  },

  markPresent: async (studentId, status = 'present') => {
    const draft = get().draft
    if (!draft?.sessionId) return
    const mark: LessonSessionMark = { studentId, status, method: 'MANUAL' }
    try {
      const result = await applyMarkOnline(draft, mark)
      if (result === 'twin') {
        const student = draft.students.find((s) => s.id === studentId)
        set({
          twinPending: {
            studentId,
            studentName: student?.name || 'Pupil',
            score: 1,
            secondaryAuthMethod: student?.secondaryAuthMethod,
          },
        })
        return
      }
      if (result === 'offline') {
        await queueMark(draft, mark)
      }
      updateStudentMark(set, get, studentId, status)
    } catch (e) {
      set({ draft: { ...draft, error: e instanceof Error ? e.message : 'Mark failed' } })
    }
  },

  markByFace: async (student, score, secondaryVerified = false) => {
    const draft = get().draft
    if (!draft?.sessionId) return
    const mark: LessonSessionMark = {
      studentId: student.id,
      status: 'present',
      method: 'FACE',
      faceMatchScore: score,
      secondaryVerified,
    }
    try {
      const result = await applyMarkOnline(draft, mark)
      if (result === 'twin' && !secondaryVerified) {
        set({
          twinPending: {
            studentId: student.id,
            studentName: student.name,
            score,
            secondaryAuthMethod: student.secondaryAuthMethod,
          },
        })
        return
      }
      if (result === 'offline') {
        await queueMark(draft, mark)
      }
      updateStudentMark(set, get, student.id, 'present')
    } catch (e) {
      set({ draft: { ...draft, error: e instanceof Error ? e.message : 'Face mark failed' } })
    }
  },

  completeTwinVerification: async () => {
    const draft = get().draft
    const twin = get().twinPending
    if (!draft?.sessionId || !twin) return
    const mark: LessonSessionMark = {
      studentId: twin.studentId,
      status: 'present',
      method: 'FACE',
      faceMatchScore: twin.score,
      secondaryVerified: true,
    }
    try {
      const result = await applyMarkOnline(draft, mark)
      if (result === 'offline') await queueMark(draft, mark)
      updateStudentMark(set, get, twin.studentId, 'present')
      set({ twinPending: null })
    } catch (e) {
      set({ draft: { ...draft, error: e instanceof Error ? e.message : 'Verification failed' } })
    }
  },

  clearTwinPending: () => set({ twinPending: null }),

  endSession: async () => {
    const draft = get().draft
    if (!draft?.sessionId) return 'failed'
    set({ draft: { ...draft, closing: true, error: null } })
    try {
      await closeLessonSession(draft.sessionId)
      set({ draft: null, twinPending: null })
      return 'closed'
    } catch (e) {
      const isOffline = e instanceof ApiError && e.status === 0
      if (isOffline) {
        await useOfflineQueue.getState().mergeLessonSession(draft.sessionId, {
          sessionId: draft.sessionId,
          classId: draft.classId,
          subjectId: draft.subjectId,
          marks: draft.pendingMarks,
          close: true,
          sendAbsentSms: true,
        })
        set({ draft: null, twinPending: null })
        return 'queued'
      }
      set({
        draft: {
          ...draft,
          closing: false,
          error: e instanceof Error ? e.message : 'Failed to close session',
        },
      })
      return 'failed'
    }
  },
}))

function updateStudentMark(
  set: (partial: Partial<SessionAttendanceState>) => void,
  get: () => SessionAttendanceState,
  studentId: string,
  status: AttendanceStatus
) {
  const draft = get().draft
  if (!draft) return
  set({
    draft: {
      ...draft,
      students: draft.students.map((s) => (s.id === studentId ? { ...s, mark: status } : s)),
      error: null,
    },
  })
}

async function queueMark(draft: SessionDraft, mark: LessonSessionMark) {
  const marks = [...draft.pendingMarks.filter((m) => m.studentId !== mark.studentId), mark]
  await useOfflineQueue.getState().mergeLessonSession(draft.sessionId, {
    sessionId: draft.sessionId,
    classId: draft.classId,
    subjectId: draft.subjectId,
    marks,
  })
  const d = useSessionAttendanceStore.getState().draft
  if (d) {
    useSessionAttendanceStore.setState({ draft: { ...d, pendingMarks: marks } })
  }
}
