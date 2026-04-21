'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ProviderLogos from '@/components/payments/ProviderLogos'
import { Eye, EyeOff } from 'lucide-react'

export default function OnboardingPage({ searchParams }) {
  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  const initialPlan = (() => {
    const raw = String(searchParams?.plan || '')
      .trim()
      .toLowerCase()
    if (raw === 'trial' || raw === 'basic' || raw === 'standard' || raw === 'premium') return raw
    return 'standard'
  })()

  const [plan, setPlan] = useState(initialPlan)
  const [provider, setProvider] = useState('airtel')
  const [accountNumber, setAccountNumber] = useState('')
  const [months, setMonths] = useState(1)
  const [paying, setPaying] = useState(false)
  const [claimReferenceId, setClaimReferenceId] = useState('')

  const [schoolName, setSchoolName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [level, setLevel] = useState('combined')
  const [adminName, setAdminName] = useState('')
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(null)

  useEffect(() => {
    const raw = String(searchParams?.plan || '')
      .trim()
      .toLowerCase()
    if (raw === 'trial' || raw === 'basic' || raw === 'standard' || raw === 'premium') {
      setPlan(raw)
    }
  }, [searchParams?.plan])

  const canStart = useMemo(() => email.trim() && password.length >= 6, [email, password])
  const canPay = useMemo(() => accountNumber.trim(), [accountNumber])
  const canSetup = useMemo(
    () => schoolName.trim() && subdomain.trim().length >= 3 && adminName.trim().length >= 2,
    [schoolName, subdomain, adminName]
  )

  const refreshStatus = async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch('/api/onboarding/status', {
        credentials: 'include',
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      setStatus(json)
      const currentReference = String(json?.registration?.paymentReference || '').trim()
      if (currentReference) setClaimReferenceId((s) => (s ? s : currentReference))
      const currentPlan = String(json?.registration?.plan || '')
        .trim()
        .toLowerCase()
      if (
        currentPlan === 'trial' ||
        currentPlan === 'basic' ||
        currentPlan === 'standard' ||
        currentPlan === 'premium'
      ) {
        setPlan(currentPlan)
      }
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    refreshStatus()
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const start = async (overridePlan) => {
    if (!canStart) return
    setSubmitting(true)
    try {
      const planToSend = String(overridePlan || plan || '')
        .trim()
        .toLowerCase()
      const res = await fetch('/api/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ email, password, plan: planToSend }),
      })
      const contentType = String(res.headers.get('content-type') || '')
      const rawText = await res.text().catch(() => '')
      let json = {}
      if (rawText) {
        try {
          json = JSON.parse(rawText)
        } catch {
          json = {}
        }
      }

      const looksLikeSecurityChallenge =
        contentType.includes('text/html') &&
        (rawText.includes('Performing security verification') || rawText.includes('Just a moment'))

      if (looksLikeSecurityChallenge) {
        throw new Error(
          'Security verification is blocking onboarding. Disable bot protection/challenge for /onboarding and /api/onboarding/* on your security service.'
        )
      }

      if (res.status === 429) {
        setResendCooldown(Number(json?.retryAfter) || 60)
        throw new Error(json?.error || 'Please wait before resending')
      }

      if (json.alreadyCompleted) {
        toast.success('Welcome back! Redirecting to dashboard...')
        window.location.href =
          typeof json?.loginUrl === 'string' && json.loginUrl.trim() ? json.loginUrl : '/dashboard'
        return
      }

      if (json.requiresVerification) {
        toast.success('Check your email for a verification link')
        setResendCooldown(60)
        return
      }

      if (json.requiresPayment) {
        toast.success('Email already verified! Proceeding to payment...')
        await refreshStatus()
        return
      }

      if (String(json?.nextStep || '').toLowerCase() === 'setup') {
        toast.success('Proceeding to school setup...')
        await refreshStatus()
        return
      }

      if (!res.ok) {
        const msg =
          typeof json?.error === 'string' && json.error.trim()
            ? json.error.trim()
            : rawText && rawText.trim()
              ? rawText.trim().slice(0, 180)
              : 'Failed to start onboarding'
        throw new Error(msg)
      }
      toast.success('Check your email for a verification link')
      setResendCooldown(60)
    } catch (e) {
      toast.error(e?.message || 'Failed to start onboarding')
    } finally {
      setSubmitting(false)
    }
  }

  const resendVerification = async () => {
    if (!email.trim()) return
    setResending(true)
    try {
      const res = await fetch('/api/onboarding/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 429) {
        setResendCooldown(Number(json?.retryAfter) || 60)
        throw new Error(json?.error || 'Please wait before resending')
      }
      if (!res.ok) throw new Error(json?.error || 'Failed to resend verification email')
      toast.success('Verification email resent!')
      setResendCooldown(60)
    } catch (e) {
      toast.error(e?.message || 'Failed to resend verification email')
    } finally {
      setResending(false)
    }
  }

  const pay = async () => {
    if (!canPay) return
    setPaying(true)
    try {
      const res = await fetch('/api/onboarding/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan, provider, accountNumber, months }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Payment request failed')
      const ref = String(json?.referenceId || '').trim()
      if (ref) setClaimReferenceId(ref)
      toast.success('Payment initiated')
      await refreshStatus()
    } catch (e) {
      toast.error(e?.message || 'Payment request failed')
    } finally {
      setPaying(false)
    }
  }

  const confirmPayment = async () => {
    const ref = String(claimReferenceId || '').trim()
    if (!ref) {
      toast.error('Enter the payment reference ID from the SMS')
      return
    }
    setLoadingStatus(true)
    try {
      const res = await fetch(
        `/api/onboarding/status?claimReferenceId=${encodeURIComponent(ref)}&claimStatus=paid`,
        { credentials: 'include', cache: 'no-store' }
      )
      const json = await res.json().catch(() => ({}))
      setStatus(json)
      if (String(json?.registration?.paymentStatus || '').toLowerCase() === 'paid') {
        toast.success('Payment confirmed')
      } else {
        toast.error('Payment is still pending. Click Refresh Status or try again.')
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to confirm payment')
    } finally {
      setLoadingStatus(false)
    }
  }

  const completeSetup = async () => {
    if (!canSetup) return
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ schoolName, subdomain, level, adminName }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to complete setup')
      setCompleted(json)
      toast.success('School portal created')
    } catch (e) {
      toast.error(e?.message || 'Failed to complete setup')
    } finally {
      setSaving(false)
    }
  }

  const verified = Boolean(status?.registration?.isVerified)
  const stepParam = String(searchParams?.step || '')
    .trim()
    .toLowerCase()
  const forceSetupStep = stepParam === 'setup'
  const isTrialPlan =
    String(status?.registration?.plan || plan || '')
      .trim()
      .toLowerCase() === 'trial'
  const paid =
    forceSetupStep ||
    isTrialPlan ||
    String(status?.registration?.paymentStatus || '').toLowerCase() === 'paid'
  const monthlyPrice = plan === 'basic' ? 5 : plan === 'premium' ? 600 : 300
  const totalAmount = monthlyPrice * (Number(months) || 1)

  return (
    <div className="onboard-page">
      <div className="onboard-shell space-y-4">
        <div className="onboard-card">
          <div className="onboard-card-header">
            <div className="onboard-title">Register your school</div>
            <div className="onboard-subtitle">Verify email → Plan & payment → Create portal</div>

            <div className="stepper">
              <div className="step">
                <div className={`step-dot ${verified ? 'step-dot-done' : 'step-dot-active'}`}>
                  {verified ? '✓' : '1'}
                </div>
                <div className="step-label">Verify email</div>
              </div>
              <div className="step">
                <div
                  className={`step-dot ${verified && !paid ? 'step-dot-active' : paid ? 'step-dot-done' : ''}`}
                >
                  2
                </div>
                <div className="step-label">Plan & payment</div>
              </div>
              <div className="step">
                <div className={`step-dot ${paid ? 'step-dot-active' : ''}`}>3</div>
                <div className="step-label">Create portal</div>
              </div>
            </div>
          </div>

          <div className="onboard-card-body space-y-3">
            <div className="onboard-subtitle onboard-section-label">
              Supported mobile money providers
            </div>
            <ProviderLogos size={38} />
          </div>
        </div>

        {loadingStatus ? <div className="onboard-card onboard-card-body">Loading...</div> : null}

        {!status?.authenticated || !verified ? (
          <div className="onboard-card">
            <div className="onboard-card-header">
              <div className="plan-name">Verify email</div>
              <div className="onboard-subtitle">We’ll email you a verification link.</div>
            </div>
            <div className="onboard-card-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@school.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-royalPurple-text3 hover:text-royalPurple-text1 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => start()}
                disabled={!canStart || submitting}
                className="zsms-hover-raise"
              >
                {submitting ? 'Sending...' : 'Send Verification Link'}
              </Button>
              <Button
                variant="outline"
                onClick={() => start('trial')}
                disabled={!canStart || submitting}
                className="zsms-hover-raise"
              >
                {submitting ? 'Sending...' : 'Start Free Trial (Skip payment)'}
              </Button>
              <div className="text-sm text-royalPurple-text2">
                Didn&apos;t receive it?{' '}
                <button
                  type="button"
                  disabled={resendCooldown > 0 || !email.trim() || resending}
                  onClick={resendVerification}
                  className={`underline ${
                    resendCooldown > 0 || !email.trim() || resending
                      ? 'text-royalPurple-text3 cursor-not-allowed'
                      : 'text-royalPurple-accent hover:text-royalPurple-border2'
                  }`}
                >
                  {resending
                    ? 'Resending...'
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend verification email'}
                </button>
              </div>
              <div className="text-xs text-royalPurple-text3">
                After verifying your email, you will be redirected to{' '}
                {String(plan || '')
                  .trim()
                  .toLowerCase() === 'trial'
                  ? 'school setup'
                  : 'plan selection'}
                .
              </div>
            </div>
          </div>
        ) : null}

        {status?.authenticated && verified && !paid ? (
          <div className="onboard-card">
            <div className="onboard-card-header">
              <div className="plan-name">Choose your plan</div>
              <div className="onboard-subtitle">Select a plan, then pay via mobile money.</div>
            </div>
            <div className="onboard-card-body space-y-5">
              <div className="plan-grid">
                <button
                  type="button"
                  onClick={() => setPlan('basic')}
                  className={`plan-tile zsms-hover-raise text-left ${plan === 'basic' ? 'plan-tile-active' : ''}`}
                >
                  <div className="plan-name">Basic</div>
                  <div>
                    <span className="plan-price">K5</span>{' '}
                    <span className="plan-price-sub">/ month</span>
                  </div>
                  <div className="plan-desc">Up to 300 students · Core modules</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPlan('standard')}
                  className={`plan-tile zsms-hover-raise text-left ${plan === 'standard' ? 'plan-tile-active' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="plan-name">Standard</div>
                    <span className="plan-badge">Most popular</span>
                  </div>
                  <div>
                    <span className="plan-price">K300</span>{' '}
                    <span className="plan-price-sub">/ month</span>
                  </div>
                  <div className="plan-desc">Up to 800 students · Analytics + SMS</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPlan('premium')}
                  className={`plan-tile zsms-hover-raise text-left ${plan === 'premium' ? 'plan-tile-active' : ''}`}
                >
                  <div className="plan-name">Premium</div>
                  <div>
                    <span className="plan-price">K600</span>{' '}
                    <span className="plan-price-sub">/ month</span>
                  </div>
                  <div className="plan-desc">Unlimited · All features + priority support</div>
                </button>
              </div>

              <div className="payment-panel space-y-4">
                <div className="provider-row">
                  <button
                    type="button"
                    onClick={() => setProvider('mtn')}
                    className={`provider-pill zsms-hover-raise ${provider === 'mtn' ? 'provider-pill-active' : ''}`}
                  >
                    <span className="provider-dot provider-dot-mtn">M</span>
                    <span className="step-label">MTN Zambia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider('airtel')}
                    className={`provider-pill zsms-hover-raise ${provider === 'airtel' ? 'provider-pill-active' : ''}`}
                  >
                    <span className="provider-dot provider-dot-airtel">A</span>
                    <span className="step-label">Airtel Zambia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider('zamtel')}
                    className={`provider-pill zsms-hover-raise ${provider === 'zamtel' ? 'provider-pill-active' : ''}`}
                  >
                    <span className="provider-dot provider-dot-zamtel">Z</span>
                    <span className="step-label">Zamtel</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mobile Money Number</Label>
                    <Input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="097... or +26097..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <div className="onboard-summary">
                      <span className="onboard-summary-title">
                        {plan === 'basic' ? 'Basic' : plan === 'premium' ? 'Premium' : 'Standard'}
                      </span>
                      <span className="onboard-summary-meta">
                        {plan === 'basic'
                          ? `K${totalAmount} (${months} month${months === 1 ? '' : 's'})`
                          : plan === 'premium'
                            ? `K${totalAmount} (${months} month${months === 1 ? '' : 's'})`
                            : `K${totalAmount} (${months} month${months === 1 ? '' : 's'})`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Number of months</Label>
                    <select
                      className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                      value={String(months)}
                      onChange={(e) =>
                        setMonths(Math.max(1, Math.min(12, Number(e.target.value) || 1)))
                      }
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={String(m)}>
                          {m} month{m === 1 ? '' : 's'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Total</Label>
                    <div className="onboard-summary">
                      <span className="onboard-summary-title">Total</span>
                      <span className="onboard-summary-meta">K{totalAmount}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={pay} disabled={!canPay || paying} className="zsms-hover-raise">
                    {paying ? 'Processing...' : 'Pay Now'}
                  </Button>
                  <Button variant="outline" onClick={refreshStatus} className="zsms-hover-raise">
                    Refresh Status
                  </Button>
                </div>

                {String(status?.registration?.paymentStatus || '').toLowerCase() === 'pending' ? (
                  <div className="space-y-3">
                    <div className="onboard-subtitle">
                      Payment is pending. If you received the success SMS but it still shows
                      pending, paste the Reference ID and confirm.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Payment Reference ID</Label>
                        <Input
                          value={claimReferenceId}
                          onChange={(e) => setClaimReferenceId(e.target.value)}
                          placeholder="e.g. LPLXC-20260421-..."
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={confirmPayment}
                          disabled={loadingStatus || !String(claimReferenceId || '').trim()}
                          className="zsms-hover-raise"
                        >
                          Confirm Payment
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {status?.authenticated && verified && paid && !completed?.loginUrl ? (
          <Card className="bg-royalPurple-card border-royalPurple-border/40 border-l-4 border-l-royalPurple-accent">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1">Stage 3: School Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {completed?.loginUrl ? (
                <div className="rounded-xl border border-royalPurple-border bg-royalPurple-deep p-4">
                  <div className="text-royalPurple-text1 font-semibold">Portal Ready</div>
                  <div className="text-royalPurple-text2 text-sm mt-1">Login URL:</div>
                  <a
                    className="text-royalPurple-accent text-sm break-all"
                    href={completed.loginUrl}
                  >
                    {completed.loginUrl}
                  </a>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>School Name</Label>
                  <Input
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Nyimba East Day Secondary School"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Portal URL</Label>
                  <Input
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    placeholder="nyimba-east"
                  />
                  <div className="text-xs text-royalPurple-text3">
                    {subdomain ? `${subdomain}.bluepeacktechnologies.com` : ''}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>School Level</Label>
                  <select
                    className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="primary">Primary School Only (Grades 1-7)</option>
                    <option value="secondary">Secondary School Only (Grades 8-12)</option>
                    <option value="combined">Combined Primary & Secondary</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Admin Full Name</Label>
                  <Input
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Headteacher Full Name"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={completeSetup}
                  disabled={!canSetup || saving || Boolean(completed?.loginUrl)}
                >
                  {saving ? 'Saving...' : 'Create Portal'}
                </Button>
                {completed?.loginUrl ? (
                  <Button asChild variant="outline">
                    <Link href={completed.loginUrl}>Go to Login</Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="text-center text-xs text-royalPurple-text3">
          Already have a school portal?{' '}
          <Link href="/login" className="text-royalPurple-accent hover:text-royalPurple-border2">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
