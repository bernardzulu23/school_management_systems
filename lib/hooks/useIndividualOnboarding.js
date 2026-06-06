'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { normalizePlanSlug } from '@/lib/billing/plan-pricing'

export function useIndividualOnboarding({
  accountType = 'teacher',
  defaultPlan = 'individual',
  initialStep = 'start',
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [plan, setPlan] = useState(defaultPlan)
  const [step, setStep] = useState(initialStep)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const canStart = useMemo(
    () => email.trim() && password.length >= 6 && name.trim().length >= 2,
    [email, password, name]
  )

  const verified = Boolean(status?.registration?.isVerified)
  const canSetup = Boolean(status?.canCompleteSetup) && verified

  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch('/api/onboarding/status', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      setStatus(json)
      if (json.authenticated && json.registration?.email) {
        setEmail(json.registration.email)
      }
      if (json.registration?.plan) {
        setPlan(normalizePlanSlug(json.registration.plan))
      }
      if (json.registration?.adminName) {
        setName(json.registration.adminName)
      }
      return json
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    if (initialStep !== 'start') {
      setStep(initialStep)
      refreshStatus()
    }
  }, [initialStep, refreshStatus])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const syncStepFromStatus = useCallback((json) => {
    if (!json?.authenticated) return
    if (!json.registration?.isVerified) {
      setStep('verify')
      return
    }
    if (json.canCompleteSetup) setStep('setup')
  }, [])

  useEffect(() => {
    if (status?.authenticated) syncStepFromStatus(status)
  }, [status, syncStepFromStatus])

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
          accountType,
        }),
      })
      const json = await res.json()
      if (res.status === 429) {
        setResendCooldown(Number(json.retryAfter) || 60)
        throw new Error(json.error || 'Please wait before retrying')
      }
      if (!res.ok) throw new Error(json.error || 'Failed to start signup')

      if (json.alreadyCompleted && json.loginUrl) {
        toast.success('Account already set up — sign in')
        window.location.href = json.loginUrl
        return
      }

      if (json.requiresVerification) {
        setStep('verify')
        toast.success('Check your email to verify your account')
        return
      }

      await refreshStatus()
      setStep('setup')
    } catch (e) {
      toast.error(e.message || 'Signup failed')
    } finally {
      setSubmitting(false)
    }
  }

  const resendVerification = async () => {
    if (!email.trim() || resendCooldown > 0) return
    setResending(true)
    try {
      const res = await fetch('/api/onboarding/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 429) {
        setResendCooldown(Number(json.retryAfter) || 60)
        throw new Error(json.error || 'Please wait before resending')
      }
      if (!res.ok) throw new Error(json.error || 'Failed to resend verification email')
      toast.success('Verification email resent')
      setResendCooldown(60)
    } catch (e) {
      toast.error(e.message || 'Failed to resend verification email')
    } finally {
      setResending(false)
    }
  }

  const complete = async (extraBody = {}) => {
    if (!canSetup) {
      toast.error('Verify your email first.')
      return null
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ adminName: name, ...extraBody }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to complete setup')
      toast.success('Account ready — your 2-month trial has started')
      return json
    } catch (e) {
      toast.error(e.message || 'Setup failed')
      return null
    } finally {
      setSubmitting(false)
    }
  }

  const afterVerified = async () => {
    const json = await refreshStatus()
    syncStepFromStatus(json)
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    plan,
    setPlan,
    step,
    setStep,
    submitting,
    status,
    loadingStatus,
    resending,
    resendCooldown,
    canStart,
    verified,
    canSetup,
    start,
    resendVerification,
    complete,
    afterVerified,
    refreshStatus,
  }
}
