import { create } from 'zustand'
import { loadSessionContext } from '@/api/session'
import type { SessionContext, TeachingAssignment } from '@/types'

interface SessionState {
  context: SessionContext | null
  loading: boolean
  error: string | null
  load: () => Promise<void>
  getTodaySummary: () => { assignmentCount: number; message: string }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  context: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const context = await loadSessionContext()
      set({ context, loading: false })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load session',
      })
    }
  },

  getTodaySummary: () => {
    const assignments = get().context?.assignments || []
    return {
      assignmentCount: assignments.length,
      message:
        assignments.length === 0
          ? 'No classes assigned yet'
          : `${assignments.length} class${assignments.length === 1 ? '' : 'es'} ready for attendance`,
    }
  },
}))

export function getAssignments(): TeachingAssignment[] {
  return useSessionStore.getState().context?.assignments || []
}
