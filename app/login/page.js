'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FEATURE_LOGIN_REDIRECTS } from '@/lib/marketing/featureCatalog'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { GraduationCap, Loader2, ArrowLeft } from 'lucide-react'
import { useSchool } from '@/lib/context/SchoolContext'
import toast from 'react-hot-toast'
import FormField from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { setTopLoading, startTopLoading, stopTopLoading } from '@/lib/uiProgress'
import { SchoolLogo } from '@/components/SchoolLogo'
import LocalDevLoginHint from '@/components/dev/LocalDevLoginHint'

function LoginPageContent() {
  const { school, isLoading: isSchoolLoading } = useSchool()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loginPercent, setLoginPercent] = useState(0)
  const [detectedSubdomain, setDetectedSubdomain] = useState('')
  const { login, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectFrom = searchParams.get('from')

  // Detect subdomain on mount (client-side only)
  useEffect(() => {
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
    if (isLoading) return

    const emailValidation = validateEmail(email)
    if (emailValidation !== true) {
      toast.error(emailValidation)
      return
    }

    const passwordValidation = validatePassword(password)
    if (passwordValidation !== true) {
      toast.error(passwordValidation)
      return
    }

    setIsLoading(true)
    setLoginPercent(0)
    startTopLoading('Signing in')
    setTopLoading(0)
    let interval

    try {
      interval = setInterval(() => {
        setLoginPercent((p) => {
          if (p >= 95) return p
          const step = Math.floor(Math.random() * 7) + 1
          const next = Math.min(95, p + step)
          setTopLoading(next)
          return next
        })
      }, 220)

      // Extract subdomain from current URL
      let subdomain = ''
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const parts = hostname.split('.')
        if (parts.length >= 3) {
          subdomain = parts[0] === 'www' && parts.length >= 4 ? parts[1] : parts[0]
        }
      }

      const result = await login({ email, password, subdomain })
      toast.success('Login successful!')
      const role = String(result?.user?.role || '')
        .trim()
        .toLowerCase()
      setLoginPercent(100)
      setTopLoading(100)
      stopTopLoading()

      const featurePath =
        redirectFrom && FEATURE_LOGIN_REDIRECTS[redirectFrom]
          ? FEATURE_LOGIN_REDIRECTS[redirectFrom]
          : null

      if (featurePath) {
        router.push(featurePath)
      } else if (['headteacher', 'admin', 'administrator', 'superadmin'].includes(role)) {
        router.push('/dashboard/admin')
      } else if (['hod', 'head of department'].includes(role)) {
        router.push('/dashboard/hod')
      } else if (role === 'teacher') {
        router.push('/dashboard/teacher')
      } else if (role === 'student') {
        router.push('/dashboard/student')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Login failed:', error)
      // Extract specific message if available
      const msg = error.message || 'Login failed'
      toast.error(msg)
      stopTopLoading()
    } finally {
      if (interval) clearInterval(interval)
      setIsLoading(false)
      setLoginPercent(0)
    }
  }

  const handleClearCache = () => {
    logout()
    localStorage.clear()
    sessionStorage.clear()
    toast.success('Cache cleared! Please login again.')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#EFECE5] font-sans p-4">
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 text-ink/70 hover:text-ink transition-colors flex items-center gap-2 group"
        aria-label="Back to Home"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Home</span>
      </button>

      <section className="w-full max-w-md p-8 rounded-2xl bg-white border border-ink/20">
        <header className="flex flex-col items-center mb-8">
          {school ? (
            <>
              {school.logo_url && (
                <SchoolLogo
                  src={school.logo_url}
                  alt={school.name}
                  className="h-16 w-auto mx-auto mb-4"
                  priority
                />
              )}
              <h2 className="text-2xl font-bold text-center text-ink">{school.name}</h2>
            </>
          ) : (
            <>
              <div className="bg-[#F5F2EB] border border-ink/20 rounded-lg p-3 w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-6 w-6 text-ink/70" />
              </div>
              <h1 className="text-2xl font-bold text-ink mb-2">Welcome Back</h1>
            </>
          )}
          <p className="mt-3 text-center text-ink/70 text-sm">
            Enter your credentials to access the portal
          </p>
          {detectedSubdomain && (
            <div className="mt-2 px-3 py-1 bg-accent/10 rounded-full border border-accent text-xs text-accent">
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
            />

            <FormField
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              validate={validatePassword}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-ink/30 bg-[#F5F2EB] text-accent focus:ring-1 focus:ring-accent focus:ring-offset-0"
              />
              <label htmlFor="remember-me" className="ml-2 block text-ink/70">
                Remember me
              </label>
            </div>

            <Link
              href="/forgot-password"
              className="font-medium text-accent hover:text-[#cc2f00] transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full py-3.5"
            style={{
              backgroundColor: '#111111',
              color: '#EFECE5',
              border: '2px solid #111111',
              boxShadow: '4px 4px 0 0 #FF3B00',
            }}
            disabled={isLoading}
          >
            {isLoading ? `Signing in... ${loginPercent}%` : 'Sign In'}
          </Button>
        </form>

        <LocalDevLoginHint />

        <footer className="mt-6 text-center">
          <button
            type="button"
            onClick={handleClearCache}
            className="text-xs text-accent hover:text-[#cc2f00] transition-colors underline"
          >
            Clear Cache & Reset
          </button>
        </footer>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-[#EFECE5]">
          <Loader2 className="h-8 w-8 animate-spin text-ink/50" />
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
