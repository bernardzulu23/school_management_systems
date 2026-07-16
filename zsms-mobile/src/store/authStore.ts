import { create } from 'zustand'
import { login as apiLogin, logout as apiLogout, type LoginCredentials } from '@/api/auth'
import { loadSessionContext } from '@/api/session'
import { getAccessToken } from '@/storage/secure'
import type { AuthUser, SchoolSummary } from '@/types'
import { isStaffRole } from '@/lib/security/roleGuards'

interface AuthState {
  user: AuthUser | null
  school: SchoolSummary | null
  isReady: boolean
  isAuthenticated: boolean
  hydrate: () => Promise<void>
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  school: null,
  isReady: false,
  isAuthenticated: false,

  hydrate: async () => {
    const token = await getAccessToken()
    if (!token) {
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
          subdomain: '',
          logoUrl: context.school?.logoUrl ?? null,
        },
      })
    } catch {
      // Token present but session failed — keep authenticated; AuthGuard + API sanitize errors.
      set({ isReady: true, isAuthenticated: true })
    }
  },

  login: async (credentials) => {
    const res = await apiLogin(credentials)
    if (res.user?.role && !isStaffRole(res.user.role)) {
      await apiLogout()
      throw new Error('You are not authorized. Please log in again.')
    }
    set({ user: res.user, school: res.school, isAuthenticated: true })
  },

  logout: async () => {
    await apiLogout()
    set({ user: null, school: null, isAuthenticated: false })
  },
}))
