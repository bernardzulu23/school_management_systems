import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from './api'
import { secureStorage } from './security'

const DEMO_USERS = {
  'headteacher@school.com': {
    id: '1',
    name: 'Headteacher Demo',
    role: 'headteacher',
    password: 'password123',
  },
  'hod@school.com': {
    id: '2',
    name: 'HOD Demo',
    role: 'hod',
    password: 'password123',
  },
  'teacher@school.com': {
    id: '3',
    name: 'Teacher Demo',
    role: 'teacher',
    password: 'password123',
  },
  'student@school.com': {
    id: '4',
    name: 'Student Demo',
    role: 'student',
    password: 'password123',
  },
}

export const useAuth = create()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        try {
          const response = await api.login(credentials)
          const { user, token } = response.data

          set({
            user,
            token,
            isAuthenticated: true
          })

          api.setAuthToken(token)

          return { success: true, user, token }
        } catch (error) {
          if (!error.response && process.env.NODE_ENV === 'development') {
            const demoUser = DEMO_USERS[credentials.email]
            if (demoUser && demoUser.password === credentials.password) {
              const user = {
                id: demoUser.id,
                name: demoUser.name,
                email: credentials.email,
                role: demoUser.role,
              }
              const token = `demo-token-${demoUser.role}`

              set({
                user,
                token,
                isAuthenticated: true,
              })

              api.setAuthToken(token)

              return { success: true, user, token }
            }
          }

          throw new Error(error.response?.data?.message || 'Login failed')
        }
      },

      register: async (userData) => {
        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
          })

          const data = await response.json()

          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Registration failed')
          }

          return { message: data.message || 'Registration successful' }
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
