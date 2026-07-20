'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ProviderLogos, { ProviderLogoImage } from '@/components/payments/ProviderLogos'
import { Eye, EyeOff } from 'lucide-react'
import { ProvinceDistrictFields } from '@/components/onboarding/ProvinceDistrictFields'
import { TRIAL_MONTHS } from '@/lib/billing/subscription'
import { PLAN_DESCRIPTIONS, PLAN_PRICING, getPlanMonthlyPrice } from '@/lib/billing/plan-pricing'
import { evaluatePassword } from '@/lib/security/passwordValidate'
import PasswordRequirements from '@/components/ui/PasswordRequirements'
import { redirectToSafeUrl, sanitizeRedirectUrl } from '@/lib/security/safeRedirect'

function parsePlanParam(searchParams) {
  const raw = String(searchParams?.get?.('plan') || '')
    .trim()
    .toLowerCase()
  if (raw === 'trial' || raw === 'basic' || raw === 'standard' || raw === 'premium') return raw
  return 'standard'
}

function OnboardingPageContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  const [plan, setPlan] = useState(() => parsePlanParam(searchParams))
  const [provider, setProvider] = useState('airtel')
  const [accountNumber, setAccountNumber] = useState('')
  const [months, setMonths] = useState(1)
  const [paying, setPaying] = useState(false)
  const [paymentAwaitingPin, setPaymentAwaitingPin] = useState(false)
  const [paymentPollSeconds, setPaymentPollSeconds] = useState(10)
  const [paymentStartedAt, setPaymentStartedAt] = useState(null)
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)

  const [schoolName, setSchoolName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [level, setLevel] = useState('combined')
  const [ownershipType, setOwnershipType] = useState('PRIVATE')
  const [adminName, setAdminName] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(null)
  const [choosingTrial, setChoosingTrial] = useState(false)

  useEffect(() => {
    const next = parsePlanParam(searchParams)
    setPlan(next)
  }, [searchParams])

  const canStart = useMemo(
    () => email.trim() && evaluatePassword(password).isValid,
    [email, password]
  )
  const canPay = useMemo(() => accountNumber.trim(), [accountNumber])
  const canSetup = useMemo(
    () =>
      schoolName.trim() &&
      subdomain.trim().length >= 3 &&
      adminName.trim().length >= 2 &&
      province.trim() &&
      district.trim(),
    [schoolName, subdomain, adminName, province, district]
  )
  const safeCompletedLoginUrl = useMemo(
    () =>
      completed?.loginUrl ? sanitizeRedirectUrl(completed.loginUrl, { fallback: '/login' }) : null,
    [completed?.loginUrl]
  )

  const refreshStatus = async ({ syncPayment = false } = {}) => {
    setLoadingStatus(true)
    try {
      const qs = syncPayment ? '?syncPayment=1' : ''
      const res = await fetch(`/api/onboarding/status${qs}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      setStatus(json)
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
    const paymentReturn = searchParams.get('paymentReturn') === '1'
    refreshStatus({ syncPayment: paymentReturn })
  }, [searchParams])

  useEffect(() => {
    const saved = String(status?.registration?.adminPhone || '').trim()
    if (saved && !adminPhone.trim()) setAdminPhone(saved)
  }, [status?.registration?.adminPhone, adminPhone])

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
        body: JSON.stringify({
          email,
          password,
          plan: planToSend,
          adminPhone: adminPhone.trim() || undefined,
        }),
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
        redirectToSafeUrl(json?.loginUrl, { fallback: '/dashboard' })
        return
      }

      if (json.requiresVerification) {
        toast.success(
          json.trialIntent
            ? 'Check your email to verify — then you can start your free trial (no payment).'
            : 'Check your email for a verification link'
        )
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
      setPaymentAwaitingPin(true)
      toast.success(
        json?.message || 'Check your phone and enter your mobile money PIN to approve the payment.'
      )
      await refreshStatus({ syncPayment: true })
    } catch (e) {
      toast.error(e?.message || 'Payment request failed')
      setPaymentAwaitingPin(false)
    } finally {
      setPaying(false)
    }
  }

  const startFreeTrial = async () => {
    setChoosingTrial(true)
    try {
      const res = await fetch('/api/onboarding/select-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan: 'trial' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || 'Could not start free trial')
      }
      setPlan('trial')
      toast.success('Free trial activated — continue to school setup')
      await refreshStatus()
    } catch (e) {
      toast.error(e?.message || 'Could not start free trial')
    } finally {
      setChoosingTrial(false)
    }
  }

  const saveAdminPhone = async (options = {}) => {
    const { silent = false } = options
    const phone = adminPhone.trim()
    if (!phone) {
      if (!silent) toast.error('Enter a Zambian mobile number (+26097… or +26096…)')
      return false
    }
    try {
      const res = await fetch('/api/onboarding/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ adminPhone: phone }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to save phone')
      if (!silent) toast.success(json?.message || 'Phone saved for welcome SMS')
      await refreshStatus()
      return true
    } catch (e) {
      if (!silent) toast.error(e?.message || 'Failed to save phone')
      return false
    }
  }

  const completeSetup = async () => {
    if (!canSetup) return
    if (!paid) {
      toast.error(
        'Confirm payment via mobile money PIN, or choose the free trial, before creating your portal.'
      )
      return
    }
    setSaving(true)
    try {
      if (adminPhone.trim()) {
        await saveAdminPhone({ silent: true })
      }
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          schoolName,
          subdomain,
          level,
          ownershipType,
          adminName,
          adminPhone: adminPhone.trim() || undefined,
          province,
          district,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to complete setup')
      setCompleted(json)
      toast.success('School portal created — check your email for the portal link to share')
    } catch (e) {
      toast.error(e?.message || 'Failed to complete setup')
    } finally {
      setSaving(false)
    }
  }

  const verified = Boolean(status?.registration?.isVerified)
  const selectedPlanIsTrial =
    String(plan || '')
      .trim()
      .toLowerCase() === 'trial'
  const registrationPlanIsTrial =
    String(status?.registration?.plan || '')
      .trim()
      .toLowerCase() === 'trial'
  const paymentStatus = String(status?.registration?.paymentStatus || '').toLowerCase()
  const paid =
    Boolean(status?.canCompleteSetup) ||
    (verified && registrationPlanIsTrial) ||
    paymentStatus === 'paid'
  const paymentPending = paymentStatus === 'pending' && !registrationPlanIsTrial
  const monthlyPrice = getPlanMonthlyPrice(plan) ?? PLAN_PRICING.standard

  useEffect(() => {
    if (paymentStatus === 'paid' && paymentAwaitingPin) {
      setShowPaymentSuccess(true)
      setPaymentAwaitingPin(false)
    }
  }, [paymentStatus, paymentAwaitingPin])

  useEffect(() => {
    if (!verified || registrationPlanIsTrial) return
    if (paymentStatus !== 'pending') {
      if (paymentStatus === 'paid') setPaymentAwaitingPin(false)
      return
    }
    setPaymentPollSeconds(10)
    const interval = setInterval(() => {
      setPaymentPollSeconds((s) => {
        if (s <= 1) {
          refreshStatus({ syncPayment: true })
          return 10
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [verified, registrationPlanIsTrial, paymentStatus, status?.registration?.paymentReference])

  const paymentElapsedMin =
    paymentStartedAt && paymentPending ? Math.floor((Date.now() - paymentStartedAt) / 60_000) : 0
  const providerLabel = provider === 'mtn' ? 'MTN' : provider === 'zamtel' ? 'Zamtel' : 'Airtel'
  const whatsappHelp = `https://wa.me/260977000000?text=${encodeURIComponent(
    'Hi ZSMS — I need help with school onboarding payment. Reference: ' +
      (status?.registration?.paymentReference || 'pending')
  )}`
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
                      placeholder="Min 8 characters with mixed case, numbers & symbols"
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
                <PasswordRequirements password={password} />
                <div className="space-y-2 md:col-span-2">
                  <Label>Mobile number for welcome SMS (optional)</Label>
                  <Input
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="+260971234567"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                  <p className="text-xs text-royalPurple-text3">
                    After you create your portal, ZSMS sends a welcome text from{' '}
                    <strong>ZSMS</strong> to this number — even while email verification is in
                    progress.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => start()}
                disabled={!canStart || submitting}
                className="zsms-hover-raise"
              >
                {submitting ? 'Sending...' : 'Send Verification Link'}
              </Button>
              <p className="text-sm text-royalPurple-text2">
                <button
                  type="button"
                  onClick={() => setPlan((p) => (p === 'trial' ? 'standard' : 'trial'))}
                  className="text-royalPurple-accent hover:text-royalPurple-border2 underline"
                >
                  {selectedPlanIsTrial
                    ? 'Switch to paid plans after verification'
                    : 'I want a free trial after I verify my email (skip payment)'}
                </button>
              </p>
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
                {selectedPlanIsTrial ? 'school setup' : 'plan selection'}.
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
              <div className="rounded-xl border border-royalPurple-border/50 bg-royalPurple-deep/30 p-4 space-y-3">
                <div className="text-sm font-medium text-royalPurple-text1">Welcome SMS number</div>
                <p className="text-xs text-royalPurple-text3">
                  Add your mobile to receive a welcome text from ZSMS when the portal is created.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="+260971234567"
                    inputMode="tel"
                    autoComplete="tel"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={() => saveAdminPhone()}>
                    Save phone
                  </Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-royalPurple-border/60 bg-royalPurple-deep/40 p-4">
                <div>
                  <div className="text-royalPurple-text1 font-medium">Free trial</div>
                  <p className="text-sm text-royalPurple-text2 mt-1">
                    {TRIAL_MONTHS} months, no mobile money payment. Your email is already verified.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={startFreeTrial}
                  disabled={choosingTrial || registrationPlanIsTrial}
                  className="zsms-hover-raise shrink-0"
                >
                  {choosingTrial
                    ? 'Activating...'
                    : registrationPlanIsTrial
                      ? 'Free trial selected'
                      : 'Continue with Free Trial (skip payment)'}
                </Button>
              </div>

              <div className="plan-grid">
                <button
                  type="button"
                  onClick={() => setPlan('basic')}
                  className={`plan-tile zsms-hover-raise text-left ${plan === 'basic' ? 'plan-tile-active' : ''}`}
                >
                  <div className="plan-name">Basic</div>
                  <div>
                    <span className="plan-price">K{PLAN_PRICING.basic}</span>{' '}
                    <span className="plan-price-sub">/ month</span>
                  </div>
                  <div className="plan-desc">{PLAN_DESCRIPTIONS.basic}</div>
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
                    <span className="plan-price">K{PLAN_PRICING.standard}</span>{' '}
                    <span className="plan-price-sub">/ month</span>
                  </div>
                  <div className="plan-desc">{PLAN_DESCRIPTIONS.standard}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPlan('premium')}
                  className={`plan-tile zsms-hover-raise text-left ${plan === 'premium' ? 'plan-tile-active' : ''}`}
                >
                  <div className="plan-name">Premium</div>
                  <div>
                    <span className="plan-price">K{PLAN_PRICING.premium}</span>{' '}
                    <span className="plan-price-sub">/ month</span>
                  </div>
                  <div className="plan-desc">{PLAN_DESCRIPTIONS.premium}</div>
                </button>
              </div>

              <div className="payment-panel space-y-4">
                <div className="provider-row">
                  <button
                    type="button"
                    onClick={() => setProvider('mtn')}
                    className={`provider-pill zsms-hover-raise ${provider === 'mtn' ? 'provider-pill-active' : ''}`}
                  >
                    <ProviderLogoImage providerKey="mtn" size={28} />
                    <span className="step-label">MTN Zambia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider('airtel')}
                    className={`provider-pill zsms-hover-raise ${provider === 'airtel' ? 'provider-pill-active' : ''}`}
                  >
                    <ProviderLogoImage providerKey="airtel" size={28} />
                    <span className="step-label">Airtel Zambia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider('zamtel')}
                    className={`provider-pill zsms-hover-raise ${provider === 'zamtel' ? 'provider-pill-active' : ''}`}
                  >
                    <ProviderLogoImage providerKey="zamtel" size={28} />
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
                  <Button
                    onClick={pay}
                    disabled={!canPay || paying || paymentPending}
                    className="zsms-hover-raise"
                  >
                    {paying
                      ? 'Sending prompt...'
                      : paymentPending
                        ? 'Awaiting PIN on phone'
                        : 'Pay Now'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => refreshStatus({ syncPayment: true })}
                    className="zsms-hover-raise"
                  >
                    Check payment status
                  </Button>
                </div>

                {showPaymentSuccess ? (
                  <div className="rounded-xl border border-green-500/50 bg-green-950/30 p-4 text-center animate-pulse">
                    <p className="text-lg font-bold text-green-300">Payment confirmed!</p>
                    <p className="text-sm text-green-200/80 mt-1">
                      Redirecting you to school setup…
                    </p>
                  </div>
                ) : null}

                {paymentPending || paymentAwaitingPin ? (
                  <div className="rounded-xl border border-royalPurple-border/60 bg-royalPurple-deep/40 p-4 space-y-2">
                    <p className="text-sm text-royalPurple-text1 font-medium">
                      Approve payment on your phone ({providerLabel})
                    </p>
                    <p className="text-sm text-royalPurple-text2">
                      A mobile money prompt was sent to {accountNumber || 'your number'}. Enter your
                      PIN on the phone to confirm. Checking payment status… (next check in{' '}
                      {paymentPollSeconds}s)
                    </p>
                    {paymentElapsedMin >= 3 ? (
                      <p className="text-sm text-amber-300">
                        Payment is taking longer than expected. Tap &quot;Check payment status&quot;
                        or try a different network.
                      </p>
                    ) : null}
                    {status?.registration?.paymentReference ? (
                      <p className="text-xs text-royalPurple-text3">
                        Reference: {status.registration.paymentReference}
                      </p>
                    ) : null}
                    <a
                      href={whatsappHelp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-royalPurple-accent underline"
                    >
                      Need help? Chat on WhatsApp
                    </a>
                  </div>
                ) : null}

                {paymentStatus === 'failed' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-400">
                      {providerLabel} payment failed or was cancelled. Try Pay Now again or choose
                      another network (MTN / Airtel / Zamtel).
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProvider(provider === 'mtn' ? 'airtel' : 'mtn')
                      }}
                    >
                      Try a different network
                    </Button>
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
              {safeCompletedLoginUrl ? (
                <div className="rounded-xl border border-royalPurple-border bg-royalPurple-deep p-4">
                  <div className="text-royalPurple-text1 font-semibold">Portal Ready</div>
                  <div className="text-royalPurple-text2 text-sm mt-1">Login URL:</div>
                  <a
                    className="text-royalPurple-accent text-sm break-all"
                    href={safeCompletedLoginUrl}
                  >
                    {safeCompletedLoginUrl}
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
                    <option value="primary">Primary School (ECE – Grade 7)</option>
                    <option value="secondary">
                      Secondary School Only (Forms 1–6 / Grades 10–12)
                    </option>
                    <option value="combined">Combined Primary & Secondary</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>School ownership type</Label>
                  <select
                    className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                    value={ownershipType}
                    onChange={(e) => setOwnershipType(e.target.value)}
                  >
                    <option value="GOVERNMENT">Government school</option>
                    <option value="PRIVATE">Private school</option>
                    <option value="COMMUNITY">Community school</option>
                    <option value="GRANT_AIDED">Grant-aided school</option>
                  </select>
                  <p className="text-xs text-royalPurple-text3 mt-1">
                    Government and community schools use free-education features. Private and
                    grant-aided schools can use fee management.
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Admin Full Name</Label>
                  <Input
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Headteacher Full Name"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Admin phone for welcome SMS</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="+260971234567"
                      inputMode="tel"
                      autoComplete="tel"
                      className="flex-1"
                    />
                    {status?.authenticated ? (
                      <Button type="button" variant="outline" onClick={() => saveAdminPhone()}>
                        Save phone
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-royalPurple-text3">
                    Welcome SMS from <strong>ZSMS</strong> is sent to this number when you create
                    the portal. You can set it here or in step 1 before verifying email.
                  </p>
                </div>
                <ProvinceDistrictFields
                  province={province}
                  district={district}
                  onProvinceChange={setProvince}
                  onDistrictChange={setDistrict}
                  labelClassName="text-royalPurple-text2 text-sm font-medium"
                />
              </div>

              <div className="text-xs text-royalPurple-text3">
                After you create the portal, we email your verified address with the school login
                link to share with teachers and learners. If you add a phone number, we also send a
                welcome SMS from ZSMS.
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={completeSetup}
                  disabled={!canSetup || saving || Boolean(completed?.loginUrl)}
                >
                  {saving ? 'Saving...' : 'Create Portal'}
                </Button>
                {safeCompletedLoginUrl ? (
                  <Button asChild variant="outline">
                    <Link href={safeCompletedLoginUrl}>Go to Login</Link>
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

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="onboard-page min-h-screen flex items-center justify-center p-6">
          <p className="text-royalPurple-text2">Loading onboarding…</p>
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  )
}
