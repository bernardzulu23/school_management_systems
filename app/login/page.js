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

const REMEMBER_EMAIL_KEY = 'zsms_remember_email'

function LoginPageContent() {
  const { school, isLoading: isSchoolLoading } = useSchool()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginPercent, setLoginPercent] = useState(0)
  const [detectedSubdomain, setDetectedSubdomain] = useState('')
  const { login, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectFrom = searchParams.get('from')
  const subdomainFromQuery = String(searchParams.get('subdomain') || '')
    .trim()
    .toLowerCase()

  function resolveSubdomainFromHost() {
    if (typeof window === 'undefined') return ''
    const hostname = window.location.hostname
    const parts = hostname.split('.')
    if (parts.length >= 3) {
      return parts[0] === 'www' && parts.length >= 4 ? parts[1] : parts[0]
    }
    return ''
  }

  // Subdomain: hostname (school.ndake.com) or ?subdomain= on apex / Vercel preview
  useEffect(() => {
    const fromHost = resolveSubdomainFromHost()
    const sub = fromHost || subdomainFromQuery
    if (sub) setDetectedSubdomain(sub)
  }, [subdomainFromQuery])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY)
      if (saved) {
        setEmail(saved)
        setRememberMe(true)
      }
    } catch {
      /* ignore */
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

      const subdomain = resolveSubdomainFromHost() || subdomainFromQuery || detectedSubdomain || ''

      const result = await login({
        email,
        password,
        ...(subdomain ? { subdomain } : {}),
        rememberMe,
      })
      if (typeof window !== 'undefined') {
        try {
          if (rememberMe) {
            localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase())
          } else {
            localStorage.removeItem(REMEMBER_EMAIL_KEY)
          }
        } catch {
          /* ignore */
        }
      }
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

      if (result?.user?.isPlatform) {
        router.push('/platform/overview')
      } else if (featurePath) {
        router.push(featurePath)
      } else if (['headteacher', 'admin', 'administrator', 'superadmin'].includes(role)) {
        router.push('/dashboard/admin')
      } else if (['hod', 'head of department'].includes(role)) {
        router.push('/dashboard/hod')
      } else if (role === 'teacher') {
        const schoolType = String(result?.user?.schoolType || 'SCHOOL').toUpperCase()
        router.push(schoolType === 'INDIVIDUAL' ? '/dashboard/solo' : '/dashboard/teacher')
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
    <main className="min-h-screen flex items-center justify-center bg-paper text-ink font-sans p-4 antialiased">
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 text-ink/70 hover:text-ink transition-colors flex items-center gap-2 group"
        aria-label="Back to Home"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Home</span>
      </button>

      <section className="auth-card w-full max-w-md p-8 rounded-2xl bg-white border-2 border-ink shadow-brutal text-ink">
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
              <div className="bg-paper border-2 border-ink/20 rounded-lg p-3 w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-6 w-6 text-ink/70" />
              </div>
              <h1 className="text-2xl font-bold text-ink mb-2">Welcome Back</h1>
            </>
          )}
          <p className="mt-3 text-center text-muted text-sm">
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
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-ink/30 bg-paper text-accent focus:ring-1 focus:ring-accent focus:ring-offset-0"
              />
              <label htmlFor="remember-me" className="ml-2 block text-muted">
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

          <Button type="submit" variant="primary" className="w-full py-3.5" disabled={isLoading}>
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
        <main className="min-h-screen flex items-center justify-center bg-paper text-ink">
          <Loader2 className="h-8 w-8 animate-spin text-ink/50" />
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
