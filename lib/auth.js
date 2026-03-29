import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from './api'
import { secureStorage } from './security'
import axios from 'axios'

const DEMO_USERS = {}

let sessionSyncInFlight = null
let sessionSyncLastAt = 0

export const useAuth = create()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        try {
          const response = await api.login(credentials)
          const { user } = response.data

          set({
            user,
            token: null, // Token is now in HTTP-only cookie
            isAuthenticated: true,
          })

          return { success: true, user }
        } catch (error) {
          if (error?.response?.status === 429) {
            const retryAfter = Number(error.response.headers?.['retry-after'])
            const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 15 * 60
            throw new Error(
              `Too many login attempts. Try again in ${Math.ceil(seconds / 60)} minutes.`
            )
          }
          const errorMessage =
            error.response?.data?.error || error.response?.data?.message || 'Login failed'
          throw new Error(errorMessage)
        }
      },

      syncSession: async ({ force = false } = {}) => {
        try {
          const now = Date.now()
          const minIntervalMs = 5000

          if (!force && sessionSyncInFlight) return sessionSyncInFlight
          if (!force && now - sessionSyncLastAt < minIntervalMs) {
            const state = get()
            return { success: Boolean(state.isAuthenticated), user: state.user }
          }

          sessionSyncLastAt = now
          sessionSyncInFlight = (async () => {
            try {
              const refreshResponse = await axios.post('/api/auth/refresh')
              const accessToken = refreshResponse.data?.accessToken

              if (accessToken) {
                set({
                  token: accessToken,
                  isAuthenticated: true,
                })
                return { success: true }
              }

              if (!refreshResponse.data?.success) {
                return { success: false }
              }
            } catch (error) {
              if (error?.response?.status === 429) {
                const state = get()
                return {
                  success: Boolean(state.isAuthenticated),
                  user: state.user,
                  rateLimited: true,
                }
              }
              set({ user: null, token: null, isAuthenticated: false })
              return { success: false }
            }

            const res = await fetch('/api/auth/me', { cache: 'no-store' })

            if (res.status === 429) {
              const state = get()
              return {
                success: Boolean(state.isAuthenticated),
                user: state.user,
                rateLimited: true,
              }
            }

            if (!res.ok) {
              set({ user: null, token: null, isAuthenticated: false })
              return { success: false }
            }

            const data = await res.json()
            if (data?.user) {
              set({ user: data.user, token: null, isAuthenticated: true })
              return { success: true, user: data.user }
            }

            set({ user: null, token: null, isAuthenticated: false })
            return { success: false }
          })()

          return await sessionSyncInFlight
        } catch {
          return { success: false }
        } finally {
          sessionSyncInFlight = null
        }
      },

      register: async (userData) => {
        try {
          const response = await api.register(userData)
          return { message: response.data?.message || 'Registration successful' }
        } catch (error) {
          throw new Error(error.message || 'Registration failed')
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch (error) {
          console.error('Logout failed:', error)
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          })
          // Clear any local storage if needed
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
      },

      updateUser: (user) => {
        set({ user })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => async (state) => {
        if (state?.token) {
          // For simple API, assume token is valid
          // In a real implementation, you might validate the token with the API
        }
      },
      storage: createJSONStorage(() => secureStorage),
    }
  )
)
