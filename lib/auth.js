import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from './api'
import { secureStorage } from './security'

const DEMO_USERS = {}

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
            isAuthenticated: true
          })

          return { success: true, user }
        } catch (error) {
          throw new Error(error.response?.data?.message || 'Login failed')
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
          // For simple API, just clear local state
          // In a real implementation, you might call an API endpoint
        } catch (error) {
          console.error('Logout failed:', error)
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false
          })
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
        isAuthenticated: state.isAuthenticated 
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
