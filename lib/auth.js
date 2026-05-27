import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useEffect, useState } from 'react'
import { api } from './api'
import { secureStorage } from './security'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const DEMO_USERS = {}

let sessionSyncInFlight = null
let sessionSyncLastAt = 0

export const useAuth = create()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      lastActivityAt: 0,

      setUser: (user) => set({ user, isAuthenticated: !!user, lastActivityAt: Date.now() }),
      markActivity: () => set({ lastActivityAt: Date.now() }),

      login: async (credentials) => {
        try {
          const response = await api.login(credentials)
          const { user } = response.data

          set({
            user,
            token: null, // Token is now in HTTP-only cookie
            isAuthenticated: true,
            lastActivityAt: Date.now(),
          })

          return { success: true, user }
        } catch (error) {
          if (
            !error?.response &&
            String(error?.message || '')
              .toLowerCase()
              .includes('network')
          ) {
            throw new Error(
              'Cannot reach the server. If you use a school subdomain URL, DNS may not be set up yet — try https://bluepeacktechnologies.com/login?subdomain=your-school or contact your administrator.'
            )
          }
          if (error?.response?.status === 429) {
            const retryAfter = Number(error.response.headers?.['retry-after'])
            const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 15 * 60
            throw new Error(
              `Too many login attempts. Try again in ${Math.ceil(seconds / 60)} minutes.`
            )
          }
          if (error?.response?.status === 402) {
            const msg =
              error.response?.data?.message ||
              error.response?.data?.error ||
              'Your school subscription has expired. Please upgrade to continue.'
            throw new Error(msg)
          }
          const errorMessage =
            error.response?.data?.error || error.response?.data?.message || 'Login failed'
          throw new Error(errorMessage)
        }
      },

      syncSession: async ({ force = false, strict = false } = {}) => {
        try {
          const now = Date.now()
          const minIntervalMs = 5000
          const stateSnapshot = get()
          const idleMs =
            stateSnapshot.lastActivityAt && stateSnapshot.lastActivityAt > 0
              ? now - stateSnapshot.lastActivityAt
              : stateSnapshot.isAuthenticated
                ? 0
                : Number.POSITIVE_INFINITY
          const maxIdleMs = 2 * 60 * 60 * 1000

          if (!force && sessionSyncInFlight) return sessionSyncInFlight
          if (!force && now - sessionSyncLastAt < minIntervalMs) {
            const state = get()
            return { success: Boolean(state.isAuthenticated), user: state.user }
          }

          sessionSyncLastAt = now
          sessionSyncInFlight = (async () => {
            try {
              const meRes = await fetch('/api/auth/me', {
                cache: 'no-store',
                credentials: 'include',
              })
              if (meRes.ok) {
                const data = await meRes.json()
                if (data?.user) {
                  set({ user: data.user, token: null, isAuthenticated: true })
                  return { success: true, user: data.user }
                }
              }

              if (meRes.status === 429) {
                if (strict) {
                  set({ user: null, token: null, isAuthenticated: false })
                  return { success: false, rateLimited: true }
                }
                const state = get()
                return {
                  success: Boolean(state.isAuthenticated),
                  user: state.user,
                  rateLimited: true,
                }
              }

              if (meRes.status !== 401 && meRes.status !== 403) {
                if (strict) {
                  set({ user: null, token: null, isAuthenticated: false })
                  return { success: false }
                }
                const state = get()
                return { success: Boolean(state.isAuthenticated), user: state.user }
              }

              const refreshResponse = await axios.post('/api/auth/refresh', undefined, {
                withCredentials: true,
                validateStatus: () => true,
              })

              if (refreshResponse.status === 429) {
                if (strict) {
                  set({ user: null, token: null, isAuthenticated: false })
                  return { success: false, rateLimited: true }
                }
                const state = get()
                return {
                  success: Boolean(state.isAuthenticated),
                  user: state.user,
                  rateLimited: true,
                }
              }

              if (refreshResponse.status !== 200 || !refreshResponse.data?.success) {
                const state = get()
                if (!strict && state.isAuthenticated && idleMs < maxIdleMs) {
                  return { success: true, user: state.user, transient: true }
                }
                set({ user: null, token: null, isAuthenticated: false })
                return { success: false }
              }
            } catch (error) {
              if (error?.response?.status === 429) {
                if (strict) {
                  set({ user: null, token: null, isAuthenticated: false })
                  return { success: false, rateLimited: true }
                }
                const state = get()
                return {
                  success: Boolean(state.isAuthenticated),
                  user: state.user,
                  rateLimited: true,
                }
              }
              if (strict) {
                set({ user: null, token: null, isAuthenticated: false })
                return { success: false }
              }
              const state = get()
              return { success: Boolean(state.isAuthenticated), user: state.user }
            }

            const res = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' })

            if (res.status === 429) {
              if (strict) {
                set({ user: null, token: null, isAuthenticated: false })
                return { success: false, rateLimited: true }
              }
              const state = get()
              return {
                success: Boolean(state.isAuthenticated),
                user: state.user,
                rateLimited: true,
              }
            }

            if (!res.ok) {
              const state = get()
              if (!strict && state.isAuthenticated && idleMs < maxIdleMs) {
                return { success: true, user: state.user, transient: true }
              }
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
            lastActivityAt: 0,
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
        lastActivityAt: state.lastActivityAt,
      }),
      onRehydrateStorage: () => async (state) => {
        if (state?.isAuthenticated) {
          state.markActivity?.()
        }
      },
      storage: createJSONStorage(() => secureStorage),
    }
  )
)

/** Wait for persisted auth state before trusting isAuthenticated (avoids hydration redirect flashes). */
export function useAuthHasHydrated() {
  const [hydrated, setHydrated] = useState(() => useAuth.persist?.hasHydrated?.() ?? false)

  useEffect(() => {
    if (useAuth.persist?.hasHydrated?.()) {
      setHydrated(true)
      return undefined
    }
    return useAuth.persist?.onFinishHydration?.(() => {
      setHydrated(true)
    })
  }, [])

  return hydrated
}

export const useMe = () => {
  const setUser = useAuth((state) => state.setUser)
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const fetchMe = async () =>
        fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' })

      let res = await fetchMe()
      if (res.status === 401 || res.status === 403) {
        const refreshResponse = await axios.post('/api/auth/refresh', undefined, {
          withCredentials: true,
          validateStatus: () => true,
        })
        if (refreshResponse.status === 200 && refreshResponse.data?.success) {
          res = await fetchMe()
        }
      }

      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json()
    },
    onSuccess: (data) => {
      if (data?.user) {
        setUser(data.user)
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}
