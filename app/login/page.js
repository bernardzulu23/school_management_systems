'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { GraduationCap, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import FormField from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [detectedSubdomain, setDetectedSubdomain] = useState('')
  const { login, logout } = useAuth()
  const router = useRouter()

  // Detect subdomain on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const parts = hostname.split('.')
      if (parts.length >= 3) {
        const sub = parts[0] === 'www' && parts.length >= 4 ? parts[1] : parts[0]
        setDetectedSubdomain(sub)
        console.log('Detected Subdomain:', sub)
      }
    }
  }, [])

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value) return 'Email is required'
    if (!emailRegex.test(value)) return 'Please enter a valid email address'
    return true
  }

  const validatePassword = (value) => {
    if (!value) return 'Password is required'
    if (value.length < 6) return 'Password must be at least 6 characters'
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Extract subdomain from current URL
      let subdomain = ''
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const parts = hostname.split('.')
        if (parts.length >= 3) {
          subdomain = parts[0] === 'www' && parts.length >= 4 ? parts[1] : parts[0]
        }
      }

      await login({ email, password, subdomain })
      toast.success('Login successful!')
      router.push('/')
    } catch (error) {
      console.error('Login failed:', error)
      // Extract specific message if available
      const msg = error.message || 'Login failed'
      toast.error(msg)
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
    <main
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat bg-fixed font-sans"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=2187&auto=format&fit=crop')`,
      }}
    >
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 text-white/80 hover:text-white transition-colors flex items-center gap-2 group"
        aria-label="Back to Home"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Home</span>
      </button>

      <section className="w-full max-w-md p-8 m-4 rounded-3xl bg-gray-900/60 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300">
        <header className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-600/30 transform hover:scale-110 transition-transform duration-300">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight text-center">Welcome Back</h1>
          <p className="mt-3 text-center text-gray-300 text-sm">
            Enter your credentials to access the portal
          </p>
          {detectedSubdomain && (
            <div className="mt-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30 text-xs text-blue-200">
              School: {detectedSubdomain}
            </div>
          )}
        </header>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormField
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              validate={validateEmail}
              className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
            />

            <div className="relative">
              <FormField
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                validate={validatePassword}
                className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
              />
              <button
                type="button"
                className="absolute right-3 top-[38px] text-gray-400 hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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

          <Button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            isLoading={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <footer className="mt-6 text-center">
          <button
            type="button"
            onClick={handleClearCache}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline"
          >
            Clear Cache & Reset
          </button>
        </footer>
      </section>
    </main>
  )
}
