'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ProviderLogos from '@/components/payments/ProviderLogos'

export default function OnboardingPage({ searchParams }) {
  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [plan, setPlan] = useState('standard')
  const [provider, setProvider] = useState('airtel')
  const [accountNumber, setAccountNumber] = useState('')
  const [paying, setPaying] = useState(false)

  const [schoolName, setSchoolName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [level, setLevel] = useState('combined')
  const [adminName, setAdminName] = useState('')
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(null)

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
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    refreshStatus()
  }, [])

  const start = async () => {
    if (!canStart) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to start onboarding')
      toast.success('Check your email for a verification link')
    } catch (e) {
      toast.error(e?.message || 'Failed to start onboarding')
    } finally {
      setSubmitting(false)
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
        body: JSON.stringify({ plan, provider, accountNumber }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Payment request failed')
      toast.success('Payment initiated')
      await refreshStatus()
    } catch (e) {
      toast.error(e?.message || 'Payment request failed')
    } finally {
      setPaying(false)
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
  const paid = String(status?.registration?.paymentStatus || '').toLowerCase() === 'paid'

  return (
    <div className="min-h-screen bg-royalPurple-page flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        <Card className="bg-royalPurple-card border-royalPurple-border/40">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Register Your School</CardTitle>
            <div className="text-royalPurple-text2 text-sm">
              Verify email → Choose plan & pay → Create school portal
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-royalPurple-text2 text-sm">Supported Mobile Money Providers</div>
            <ProviderLogos size={38} />
          </CardContent>
        </Card>

        {loadingStatus ? (
          <Card className="bg-royalPurple-card border-royalPurple-border/40">
            <CardContent className="p-6 text-royalPurple-text2">Loading...</CardContent>
          </Card>
        ) : null}

        {!status?.authenticated || !verified ? (
          <Card className="bg-royalPurple-card border-royalPurple-border/40">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1">Stage 1: Email Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                  />
                </div>
              </div>
              <Button onClick={start} disabled={!canStart || submitting}>
                {submitting ? 'Sending...' : 'Send Verification Link'}
              </Button>
              <div className="text-xs text-royalPurple-text3">
                After verifying your email, you will be redirected to plan selection.
              </div>
            </CardContent>
          </Card>
        ) : null}

        {status?.authenticated && verified && !paid ? (
          <Card className="bg-royalPurple-card border-royalPurple-border/40">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1">
                Stage 2: Plan Selection & Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setPlan('basic')}
                  className={`p-4 rounded-xl border ${plan === 'basic' ? 'border-amber-400' : 'border-royalPurple-border'} bg-royalPurple-deep text-left`}
                >
                  <div className="text-royalPurple-text1 font-bold">Basic</div>
                  <div className="text-royalPurple-text2 text-sm">K150 / month</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPlan('standard')}
                  className={`p-4 rounded-xl border ${plan === 'standard' ? 'border-amber-400' : 'border-royalPurple-border'} bg-royalPurple-deep text-left`}
                >
                  <div className="text-royalPurple-text1 font-bold">Standard</div>
                  <div className="text-royalPurple-text2 text-sm">K300 / month</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPlan('premium')}
                  className={`p-4 rounded-xl border ${plan === 'premium' ? 'border-amber-400' : 'border-royalPurple-border'} bg-royalPurple-deep text-left`}
                >
                  <div className="text-royalPurple-text1 font-bold">Premium</div>
                  <div className="text-royalPurple-text2 text-sm">K600 / month</div>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <select
                    className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  >
                    <option value="airtel">Airtel Zambia</option>
                    <option value="mtn">MTN Zambia</option>
                    <option value="zamtel">Zamtel</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Mobile Money Number</Label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="097... or +26097..."
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={pay} disabled={!canPay || paying}>
                  {paying ? 'Processing...' : 'Pay Now'}
                </Button>
                <Button variant="outline" onClick={refreshStatus}>
                  Refresh Status
                </Button>
              </div>

              {String(status?.registration?.paymentStatus || '').toLowerCase() === 'pending' ? (
                <div className="text-sm text-royalPurple-text2">
                  Payment is pending. Complete the prompt on your phone, then click Refresh Status.
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {status?.authenticated && verified && paid ? (
          <Card className="bg-royalPurple-card border-royalPurple-border/40">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1">Stage 3: School Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {completed?.loginUrl ? (
                <div className="rounded-xl border border-royalPurple-border bg-royalPurple-deep p-4">
                  <div className="text-royalPurple-text1 font-semibold">Portal Ready</div>
                  <div className="text-royalPurple-text2 text-sm mt-1">Login URL:</div>
                  <a className="text-amber-300 text-sm break-all" href={completed.loginUrl}>
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
          <Link href="/login" className="text-amber-300">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
