'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import FormField from '@/components/forms/FormField'
import { useSchool } from '@/lib/context/SchoolContext'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [detectedSubdomain, setDetectedSubdomain] = useState('')
  const { school } = useSchool()

  // Detect subdomain
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const parts = hostname.split('.')
      if (parts.length >= 3) {
        const sub = parts[0] === 'www' && parts.length >= 4 ? parts[1] : parts[0]
        setDetectedSubdomain(sub)
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          subdomain: detectedSubdomain,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setIsSubmitted(true)
        toast.success('Reset link sent!')
      } else {
        toast.error(data.error || 'Something went wrong')
      }
    } catch (error) {
      toast.error('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-royalPurple-page flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-royalPurple-card border border-royalPurple-border rounded-2xl p-8">
        <header className="flex flex-col items-center mb-8">
          {school ? (
            <>
              {school.logo_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={school.logo_url} alt={school.name} className="h-16 w-auto mx-auto mb-4" />
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
          <h1 className="text-2xl font-bold text-royalPurple-text1 mt-4">Reset Password</h1>
          <p className="text-royalPurple-text2 text-sm mt-2 text-center">
            Enter your email to receive a reset link
          </p>
        </header>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              label="Email Address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              icon={Mail}
            />

            <Button type="submit" className="w-full py-3" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="bg-royalPurple-success text-royalPurple-successTx p-4 rounded-xl border border-royalPurple-border">
              <p>Check your email for the reset link.</p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-royalPurple-text2 hover:text-royalPurple-text1 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
