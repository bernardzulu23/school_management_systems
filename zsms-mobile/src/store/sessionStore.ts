import { create } from 'zustand'
import { loadSessionContext } from '@/api/session'
import { ApiError } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import type { SessionContext, TeachingAssignment } from '@/types'
import { ERROR_MESSAGES } from '@/lib/security/userFacingErrors'
import { markAuthOkNow, wasRecentlyAuthenticated, msSinceAuthOk } from '@/lib/authGrace'

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
      markAuthOkNow()
      set({ context, loading: false, error: null })
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0
      const message = e instanceof Error ? e.message : 'Failed to load session'

      if (status === 401) {
        // Grace window after login — SecureStore / host redirect races should not log out.
        if (wasRecentlyAuthenticated() || useAuthStore.getState().isAuthenticated) {
          try {
            await new Promise((r) => setTimeout(r, 400))
            const context = await loadSessionContext()
            markAuthOkNow()
            set({ context, loading: false, error: null })
            return
          } catch (retryErr) {
            const retryStatus = retryErr instanceof ApiError ? retryErr.status : 0
            if (retryStatus === 401 && msSinceAuthOk() > 15_000) {
              await useAuthStore.getState().markSessionExpired()
              set({
                context: null,
                loading: false,
                error: ERROR_MESSAGES.SESSION_EXPIRED,
              })
              return
            }
            set({
              loading: false,
              error:
                retryErr instanceof Error
                  ? retryErr.message
                  : 'Could not load your classes. Pull to refresh.',
            })
            return
          }
        }

        await useAuthStore.getState().markSessionExpired()
        set({
          context: null,
          loading: false,
          error: ERROR_MESSAGES.SESSION_EXPIRED,
        })
        return
      }

      set({
        loading: false,
        error: message,
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
