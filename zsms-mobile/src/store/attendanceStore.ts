import { create } from 'zustand'
import {
  buildDefaultRecords,
  loadExistingAttendance,
  loadRoster,
  markAllPresent,
  saveAttendance,
  setStudentStatus,
} from '@/api/attendance'
import { useOfflineQueue } from './offlineQueue'
import type { AttendanceRecord, AttendanceStatus, RosterStudent } from '@/types'
import { ApiError } from '@/api/client'

interface AttendanceDraft {
  classId: string
  subjectId?: string
  date: string
  students: RosterStudent[]
  records: AttendanceRecord[]
  loading: boolean
  saving: boolean
  error: string | null
}

interface AttendanceState {
  draft: AttendanceDraft | null
  historyCache: Record<string, AttendanceRecord[]>
  loadRegister: (classId: string, date: string, subjectId?: string) => Promise<void>
  setStatus: (studentId: string, status: AttendanceStatus) => void
  markAllPresent: () => void
  save: (online?: boolean) => Promise<'saved' | 'queued'>
  cacheHistory: (key: string, records: AttendanceRecord[]) => void
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  draft: null,
  historyCache: {},

  loadRegister: async (classId, date, subjectId) => {
    set({
      draft: {
        classId,
        subjectId,
        date,
        students: [],
        records: [],
        loading: true,
        saving: false,
        error: null,
      },
    })
    try {
      const [students, existing] = await Promise.all([
        loadRoster(classId, subjectId),
        loadExistingAttendance(classId, date).catch(() => []),
      ])
      const records = buildDefaultRecords(students, existing)
      set({
        draft: {
          classId,
          subjectId,
          date,
          students,
          records,
          loading: false,
          saving: false,
          error: null,
        },
      })
    } catch (e) {
      set({
        draft: {
          classId,
          subjectId,
          date,
          students: [],
          records: [],
          loading: false,
          saving: false,
          error: e instanceof Error ? e.message : 'Failed to load roster',
        },
      })
    }
  },

  setStatus: (studentId, status) => {
    const draft = get().draft
    if (!draft) return
    set({
      draft: {
        ...draft,
        records: setStudentStatus(draft.records, studentId, status),
      },
    })
  },

  markAllPresent: () => {
    const draft = get().draft
    if (!draft) return
    set({ draft: { ...draft, records: markAllPresent(draft.records) } })
  },

  save: async (online = true) => {
    const draft = get().draft
    if (!draft) return 'queued'
    set({ draft: { ...draft, saving: true, error: null } })
    const payload = { date: draft.date, records: draft.records }
    try {
      if (online) {
        await saveAttendance(payload)
      } else {
        throw new ApiError('Offline', 0)
      }
      get().cacheHistory(`${draft.classId}:${draft.date}`, draft.records)
      set({ draft: { ...draft, saving: false } })
      return 'saved'
    } catch {
      await useOfflineQueue.getState().enqueueAttendance(payload)
      set({ draft: { ...draft, saving: false } })
      return 'queued'
    }
  },

  cacheHistory: (key, records) => {
    set({ historyCache: { ...get().historyCache, [key]: records } })
  },
}))
