import { create } from 'zustand'
import { login as apiLogin, logout as apiLogout, type LoginCredentials } from '@/api/auth'
import { loadSessionContext } from '@/api/session'
import { ApiError } from '@/api/client'
import { getAccessToken, getSubdomain, clearAuth } from '@/storage/secure'
import type { AuthUser, SchoolSummary } from '@/types'
import { isStaffRole } from '@/lib/security/roleGuards'
import { markAuthOkNow } from '@/lib/authGrace'
import { clearPushToken } from '@/api/push'
import { useOfflineQueue } from '@/store/offlineQueue'

interface AuthState {
  user: AuthUser | null
  school: SchoolSummary | null
  isReady: boolean
  isAuthenticated: boolean
  hydrate: () => Promise<void>
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  markSessionExpired: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  school: null,
  isReady: false,
  isAuthenticated: false,

  markSessionExpired: async () => {
    await clearAuth()
    set({ user: null, school: null, isAuthenticated: false, isReady: true })
  },

  hydrate: async () => {
    const token = await getAccessToken()
    if (!token) {
      // Don't clobber a login that just completed (race with SecureStore / navigation).
      if (get().isAuthenticated) {
        set({ isReady: true })
        return
      }
      set({ isReady: true, isAuthenticated: false, user: null, school: null })
      return
    }
    try {
      const context = await loadSessionContext()
      const role = context?.user?.role
      if (role && !isStaffRole(role)) {
        await apiLogout()
        set({ isReady: true, isAuthenticated: false, user: null, school: null })
        return
      }
      const subdomain = (await getSubdomain()) || ''
      set({
        isReady: true,
        isAuthenticated: true,
        user: {
          id: context.user.id,
          email: '',
          name: context.user.name,
          role: context.user.role,
          schoolId: '',
        },
        school: {
          id: '',
          name: context.school?.name || '',
          subdomain,
          logoUrl: context.school?.logoUrl ?? null,
        },
      })
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0
      // Only a real auth failure should force logout. 403 = role/tenant gate, keep session.
      if (status === 401 && !get().isAuthenticated) {
        // Cold start with dead token
        await clearAuth()
        set({ isReady: true, isAuthenticated: false, user: null, school: null })
        return
      }
      if (status === 401 && get().isAuthenticated) {
        // Just logged in — keep login user; Home can retry session-context.
        set({ isReady: true })
        return
      }
      set({ isReady: true, isAuthenticated: Boolean(token) || get().isAuthenticated })
    }
  },

  login: async (credentials) => {
    const res = await apiLogin(credentials)
    if (res.user?.role && !isStaffRole(res.user.role)) {
      await apiLogout()
      throw new Error('You are not authorized. Please log in again.')
    }
    markAuthOkNow()
    set({
      user: res.user,
      school: res.school,
      isAuthenticated: true,
      isReady: true,
    })
    useOfflineQueue.getState().clearLastSyncError()
  },

  logout: async () => {
    await clearPushToken()
    await apiLogout()
    set({ user: null, school: null, isAuthenticated: false })
  },
}))
