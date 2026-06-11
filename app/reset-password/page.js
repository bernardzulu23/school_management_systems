'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import FormField from '@/components/forms/FormField'
import { useSchool } from '@/lib/context/SchoolContext'
import toast from 'react-hot-toast'
import { SchoolLogo } from '@/components/SchoolLogo'
import { getPasswordFormError } from '@/components/ui/PasswordRequirements'
import PasswordRequirements from '@/components/ui/PasswordRequirements'

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

    const passwordError = getPasswordFormError(password)
    if (passwordError) {
      toast.error(passwordError)
      return
    }

    setIsLoading(true)

    try {
      if (token && !email) {
        router.replace(`/reset-password/${encodeURIComponent(token)}`)
        return
      }
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, newPassword: password, confirmPassword }),
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

  if (!token) {
    return (
      <div className="min-h-screen bg-royalPurple-page flex items-center justify-center p-4">
        <div className="bg-royalPurple-card p-8 rounded-2xl border border-royalPurple-border text-center">
          <p>Invalid reset link.</p>
          <Link
            href="/login"
            className="text-royalPurple-text2 hover:text-royalPurple-text1 mt-4 inline-block"
          >
            Return to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-royalPurple-page flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-royalPurple-card border border-royalPurple-border rounded-2xl p-8">
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
              <h2 className="text-xl font-bold text-center text-royalPurple-text1">
                {school.name}
              </h2>
            </>
          ) : (
            <div className="bg-royalPurple-card2 border border-royalPurple-border rounded-lg p-3 w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-6 w-6 text-royalPurple-text2" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-royalPurple-text1 mt-4">Set New Password</h1>
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
          />

          <PasswordRequirements password={password} />

          <Button type="submit" className="w-full py-3" disabled={isLoading}>
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
        <div className="min-h-screen bg-royalPurple-page flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-royalPurple-text2 animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
