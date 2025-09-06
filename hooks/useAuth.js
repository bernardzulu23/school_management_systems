import { useState, useEffect, createContext, useContext } from 'react'

// Mock auth for development - replace with actual Supabase when ready
const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const signIn = async (email, password) => {
    // Mock sign in - replace with actual Supabase auth
    setLoading(true)
    setTimeout(() => {
      setUser({ email, id: '1' })
      setLoading(false)
    }, 1000)
    return { data: { user: { email } }, error: null }
  }

  const signUp = async (email, password, userData = {}) => {
    // Mock sign up - replace with actual Supabase auth
    return { data: { user: { email } }, error: null }
  }

  const signOut = async () => {
    setUser(null)
    return { error: null }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default useAuth
