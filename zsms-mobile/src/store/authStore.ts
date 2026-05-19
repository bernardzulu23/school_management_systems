import { create } from 'zustand'
import { login as apiLogin, logout as apiLogout, type LoginCredentials } from '@/api/auth'
import { getAccessToken } from '@/storage/secure'
import type { AuthUser, SchoolSummary } from '@/types'

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
    set({ isReady: true, isAuthenticated: !!token })
  },

  login: async (credentials) => {
    const res = await apiLogin(credentials)
    set({ user: res.user, school: res.school, isAuthenticated: true })
  },

  logout: async () => {
    await apiLogout()
    set({ user: null, school: null, isAuthenticated: false })
  },
}))
