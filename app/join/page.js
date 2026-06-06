'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'
import { PLAN_LABELS, PLAN_PRICING } from '@/lib/billing/plan-pricing'

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const asStudent = searchParams.get('as') === 'student'

  useEffect(() => {
    if (asStudent) router.replace('/join/student')
  }, [asStudent, router])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [plan, setPlan] = useState('individual_free')
  const [step, setStep] = useState('start')
  const [submitting, setSubmitting] = useState(false)

  const canStart = useMemo(
    () => email.trim() && password.length >= 6 && name.trim().length >= 2,
    [email, password, name]
  )

  const start = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          plan,
          schoolType: 'INDIVIDUAL',
          accountType: 'teacher',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start signup')
      if (json.requiresVerification) {
        setStep('verify')
        toast.success('Check your email to verify your account')
        return
      }
      if (json.requiresPayment) {
        setStep('pay')
        return
      }
      setStep('setup')
    } catch (e) {
      toast.error(e.message || 'Signup failed')
    } finally {
      setSubmitting(false)
    }
  }

  const complete = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ adminName: name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create workspace')
      toast.success('Workspace ready — sign in to continue')
      router.push(json.loginUrl || '/login')
    } catch (e) {
      toast.error(e.message || 'Setup failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--rp-page)] py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-royalPurple-text1">Join as a solo teacher</h1>
          <p className="text-royalPurple-text2">
            Your professional teaching workspace. No school subscription required.
          </p>
          <p className="text-sm text-royalPurple-text3">
            Are you a student?{' '}
            <Link href="/join/student" className="underline text-royalPurple-accentTx">
              Sign up free
            </Link>
            {' · '}
            <Link href="/onboarding" className="underline">
              Register a school
            </Link>
          </p>
        </div>

        {step === 'start' ? (
          <Card className="white-card">
            <CardHeader>
              <CardTitle>Choose your plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['individual_free', 'individual_premium'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlan(p)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      plan === p
                        ? 'border-royalPurple-accent bg-royalPurple-accent/10'
                        : 'border-royalPurple-border'
                    }`}
                  >
                    <p className="font-semibold text-royalPurple-text1">{PLAN_LABELS[p]}</p>
                    <p className="text-sm text-royalPurple-text3 mt-1">
                      {p === 'individual_free'
                        ? 'Up to 5 students · ECZ tools'
                        : `K${PLAN_PRICING.individual_premium}/mo · AI tools`}
                    </p>
                  </button>
                ))}
              </div>
              <div>
                <Label>Your name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              <Button onClick={start} disabled={!canStart || submitting} fullWidth>
                {submitting ? 'Creating account…' : 'Continue'}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {step === 'verify' ? (
          <Card className="white-card">
            <CardContent className="py-8 text-center space-y-4">
              <p className="text-royalPurple-text2">
                We sent a verification link to <strong>{email}</strong>. Open it, then return here
                and finish setup.
              </p>
              <Button onClick={() => setStep('setup')}>I verified my email</Button>
            </CardContent>
          </Card>
        ) : null}

        {step === 'setup' ? (
          <Card className="white-card">
            <CardContent className="py-8 space-y-4">
              <p className="text-royalPurple-text2">
                Create your workspace as <strong>{name}</strong>.
              </p>
              <Button onClick={complete} disabled={submitting} fullWidth>
                {submitting ? 'Creating workspace…' : 'Create my workspace'}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-royalPurple-text3">Loading…</div>}>
      <JoinPageContent />
    </Suspense>
  )
}
