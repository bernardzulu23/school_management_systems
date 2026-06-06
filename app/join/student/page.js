'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

function JoinStudentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeParam = searchParams.get('code') || ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enrollmentCode, setEnrollmentCode] = useState(codeParam)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => name.trim().length >= 2 && email.trim() && password.length >= 6,
    [name, email, password]
  )

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          enrollmentCode: enrollmentCode.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Signup failed')
      toast.success(
        json.enrolledUnderTeacher
          ? `Enrolled under ${json.teacherName || 'your teacher'}`
          : 'Account created'
      )
      router.push('/login')
    } catch (e) {
      toast.error(e.message || 'Signup failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--rp-page)] py-12 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-royalPurple-text1">Student sign up</h1>
          <p className="text-royalPurple-text2">
            Prepare for ECZ exams on your own terms — always free.
          </p>
          <p className="text-sm text-royalPurple-text3">
            <Link href="/join" className="underline">
              Solo teacher signup
            </Link>
          </p>
        </div>

        <Card className="white-card">
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Enrollment code (optional)</Label>
                <Input
                  value={enrollmentCode}
                  onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
                  placeholder="From your tutor"
                />
                <p className="text-xs text-royalPurple-text3 mt-1">
                  Leave blank to study independently without a tutor.
                </p>
              </div>
              <div>
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 text-royalPurple-text3"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={!canSubmit || submitting} fullWidth>
                {submitting ? 'Creating account…' : 'Create free account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function JoinStudentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-royalPurple-text3">Loading…</div>}>
      <JoinStudentContent />
    </Suspense>
  )
}
