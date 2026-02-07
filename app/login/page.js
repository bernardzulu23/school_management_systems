'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { GraduationCap, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login, logout } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login({ email, password })
      toast.success('Login successful!')
      router.push('/')
    } catch (error) {
      toast.error(error.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearCache = () => {
    logout()
    localStorage.clear()
    sessionStorage.clear()
    toast.success('Cache cleared! Please login again.')
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat bg-fixed font-sans"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=2187&auto=format&fit=crop')` 
      }}
    >
      <button 
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 text-white/80 hover:text-white transition-colors flex items-center gap-2 group"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </button>

      <div className="w-full max-w-md p-8 m-4 rounded-3xl bg-gray-900/60 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-600/30 transform hover:scale-110 transition-transform duration-300">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight text-center">
            Welcome Back
          </h2>
          <p className="mt-3 text-center text-gray-300 text-sm">
            Enter your credentials to access the portal
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="block w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0"
              />
              <label htmlFor="remember-me" className="ml-2 block text-gray-300">
                Remember me
              </label>
            </div>

            <a href="#" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleClearCache}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline"
          >
            Clear Cache & Reset
          </button>
        </div>

        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/20 rounded-xl backdrop-blur-sm">
          <p className="text-xs text-blue-300 font-semibold mb-2 uppercase tracking-wide">Demo Credentials:</p>
          <div className="grid grid-cols-1 gap-1 text-xs text-blue-200/80 font-mono">
            <div className="flex justify-between"><span>Headteacher:</span> <span>headteacher@school.com</span></div>
            <div className="flex justify-between"><span>HOD:</span> <span>hod@school.com</span></div>
            <div className="flex justify-between"><span>Teacher:</span> <span>teacher@school.com</span></div>
            <div className="flex justify-between"><span>Student:</span> <span>student@school.com</span></div>
            <div className="mt-1 pt-1 border-t border-blue-500/20 text-center opacity-70">Pass: password123</div>
          </div>
        </div>
      </div>
    </div>
  )
}
