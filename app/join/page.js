'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'
import { PLAN_LABELS, PLAN_PRICING } from '@/lib/billing/plan-pricing'
import { TRIAL_MONTHS } from '@/lib/billing/subscription'
import { useIndividualOnboarding } from '@/lib/hooks/useIndividualOnboarding'
import { IndividualVerifyStep } from '@/components/onboarding/IndividualOnboardingSteps'

const TEACHER_PLANS = [
  {
    id: 'individual',
    label: PLAN_LABELS.individual,
    description: `${TRIAL_MONTHS}-month free trial · then K${PLAN_PRICING.individual}/mo · Up to 5 students · ECZ tools`,
  },
  {
    id: 'individual_premium',
    label: PLAN_LABELS.individual_premium,
    description: `${TRIAL_MONTHS}-month free trial · then K${PLAN_PRICING.individual_premium}/mo · Unlimited students · AI tools`,
  },
]

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const asStudent = searchParams.get('as') === 'student'
  const initialStep = searchParams.get('step') || 'start'

  useEffect(() => {
    if (asStudent) router.replace('/join/student')
  }, [asStudent, router])

  const [showPassword, setShowPassword] = useState(false)
  const flow = useIndividualOnboarding({
    accountType: 'teacher',
    defaultPlan: 'individual',
    initialStep,
  })

  const finishSetup = async () => {
    const json = await flow.complete()
    if (json?.loginUrl) router.push(json.loginUrl)
  }

  return (
    <div className="min-h-screen bg-[var(--rp-page)] py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-royalPurple-text1">Join as a solo teacher</h1>
          <p className="text-royalPurple-text2">
            Verify email → Start your {TRIAL_MONTHS}-month free trial → Subscribe when it ends.
          </p>
          <p className="text-sm text-royalPurple-text3">
            Are you a student?{' '}
            <Link href="/join/student" className="underline text-royalPurple-accentTx">
              Student signup
            </Link>
            {' · '}
            <Link href="/onboarding" className="underline">
              Register a school
            </Link>
          </p>
        </div>

        {flow.step === 'start' ? (
          <Card className="white-card">
            <CardHeader>
              <CardTitle>Choose your plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TEACHER_PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => flow.setPlan(p.id)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      flow.plan === p.id
                        ? 'border-royalPurple-accent bg-royalPurple-accent/10'
                        : 'border-royalPurple-border'
                    }`}
                  >
                    <p className="font-semibold text-royalPurple-text1">{p.label}</p>
                    <p className="text-sm text-royalPurple-text3 mt-1">{p.description}</p>
                  </button>
                ))}
              </div>
              <div>
                <Label>Your name</Label>
                <Input value={flow.name} onChange={(e) => flow.setName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={flow.email}
                  onChange={(e) => flow.setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={flow.password}
                    onChange={(e) => flow.setPassword(e.target.value)}
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
              <Button onClick={flow.start} disabled={!flow.canStart || flow.submitting} fullWidth>
                {flow.submitting ? 'Sending verification…' : 'Continue'}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {flow.step === 'verify' ? (
          <Card className="white-card">
            <CardHeader>
              <CardTitle>Verify your email</CardTitle>
            </CardHeader>
            <CardContent>
              <IndividualVerifyStep
                email={flow.email}
                resendVerification={flow.resendVerification}
                resending={flow.resending}
                resendCooldown={flow.resendCooldown}
                afterVerified={flow.afterVerified}
              />
            </CardContent>
          </Card>
        ) : null}

        {flow.step === 'setup' ? (
          <Card className="white-card">
            <CardContent className="py-8 space-y-4">
              <p className="text-royalPurple-text2">
                Create your workspace as <strong>{flow.name}</strong>. You get{' '}
                <strong>{TRIAL_MONTHS} months free</strong>, then your chosen plan applies.
              </p>
              <Button onClick={finishSetup} disabled={flow.submitting || !flow.canSetup} fullWidth>
                {flow.submitting ? 'Creating workspace…' : 'Start my free trial'}
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
