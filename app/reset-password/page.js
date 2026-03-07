'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import FormField from '@/components/forms/FormField'
import { useSchool } from '@/lib/context/SchoolContext'
import toast from 'react-hot-toast'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { school } = useSchool()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Password reset successful! Please login.')
        router.push('/login')
      } else {
        toast.error(data.error || 'Failed to reset password')
      }
    } catch (error) {
      toast.error('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl text-white text-center">
          <p>Invalid reset link.</p>
          <Link href="/login" className="text-blue-400 mt-4 inline-block">
            Return to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8 z-10">
        <header className="flex flex-col items-center mb-8">
          {school ? (
            <>
              {school.logo_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={school.logo_url} alt={school.name} className="h-16 w-auto mx-auto mb-4" />
              )}
              <h2 className="text-xl font-bold text-center text-white">{school.name}</h2>
            </>
          ) : (
            <div className="bg-blue-600 rounded-xl p-3 w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white mt-4">Set New Password</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField
            label="New Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            icon={Lock}
            className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
          />

          <FormField
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            icon={Lock}
            className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
          />

          <Button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...
              </span>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
