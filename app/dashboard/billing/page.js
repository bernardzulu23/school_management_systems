'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { PlanComparisonCard } from '@/components/FeatureGate'
import ProviderLogos from '@/components/payments/ProviderLogos'
import SubscriptionUpgradePanel from '@/components/billing/SubscriptionUpgradePanel'
import { getPlanMonthlyPrice, PLAN_PRICING } from '@/lib/billing/plan-pricing'
import toast from 'react-hot-toast'

function formatDate(value) {
  if (!value) return null
  try {
    return new Date(value).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return null
  }
}

function providerLabel(key) {
  if (key === 'mtn') return 'MTN'
  if (key === 'zamtel') return 'Zamtel'
  return 'Airtel'
}

function BillingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [school, setSchool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState('standard')

  const [awaitingPayment, setAwaitingPayment] = useState(false)
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [paymentMeta, setPaymentMeta] = useState(null)
  const [paymentPollSeconds, setPaymentPollSeconds] = useState(10)
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(false)

  const refreshSchool = useCallback(async () => {
    const res = await fetch('/api/school/current', {
      cache: 'no-store',
      credentials: 'include',
    })
    const json = await res.json().catch(() => ({}))
    if (json?.school) setSchool(json.school)
    return json?.school || null
  }, [])

  const refreshPaymentStatus = useCallback(
    async ({ syncPayment = false } = {}) => {
      const qs = new URLSearchParams()
      if (syncPayment) qs.set('syncPayment', '1')
      if (paymentReference) qs.set('referenceId', paymentReference)

      const res = await fetch(`/api/billing/subscription-payment/status?${qs.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || 'Could not check payment status')
      }

      const status = String(json?.payment?.status || '').toLowerCase()
      if (status) setPaymentStatus(status)
      if (json?.payment?.referenceId && !paymentReference) {
        setPaymentReference(json.payment.referenceId)
      }
      if (json?.school) setSchool(json.school)
      return json
    },
    [paymentReference]
  )

  const checkPaymentNow = useCallback(async () => {
    setCheckingPayment(true)
    try {
      await refreshPaymentStatus({ syncPayment: true })
    } catch (e) {
      toast.error(e?.message || 'Could not check payment status')
    } finally {
      setCheckingPayment(false)
    }
  }, [refreshPaymentStatus])

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      try {
        if (active) await refreshSchool()
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [refreshSchool])

  useEffect(() => {
    const paymentReturn = searchParams.get('paymentReturn') === '1'
    const payment = searchParams.get('payment')
    const ref = String(searchParams.get('referenceId') || '').trim()

    if (!paymentReturn && payment !== 'success' && payment !== 'failed') return

    if (ref) setPaymentReference(ref)
    setAwaitingPayment(true)
    setPaymentStatus(payment === 'failed' ? 'failed' : 'pending')
  }, [searchParams])

  useEffect(() => {
    if (paymentStatus !== 'paid') return undefined
    setShowPaymentSuccess(true)
    setAwaitingPayment(false)
    toast.success('Payment confirmed. Your plan has been upgraded.')
    const t = window.setTimeout(() => {
      router.replace('/dashboard/billing')
      setShowPaymentSuccess(false)
    }, 2500)
    return () => window.clearTimeout(t)
  }, [paymentStatus, router])

  useEffect(() => {
    if (!awaitingPayment || paymentStatus === 'paid' || paymentStatus === 'failed') {
      return undefined
    }

    refreshPaymentStatus({ syncPayment: true }).catch(() => {})

    setPaymentPollSeconds(10)
    const interval = window.setInterval(() => {
      setPaymentPollSeconds((s) => {
        if (s <= 1) {
          refreshPaymentStatus({ syncPayment: true }).catch(() => {})
          return 10
        }
        return s - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [awaitingPayment, paymentStatus, paymentReference, refreshPaymentStatus])

  useEffect(() => {
    if (paymentStatus !== 'failed') return
    setAwaitingPayment(false)
    toast.error('Payment was not completed. You can try again.')
  }, [paymentStatus])

  const plan = useMemo(() => String(school?.plan || 'trial').toLowerCase(), [school?.plan])
  const level = useMemo(() => String(school?.level || 'combined').toLowerCase(), [school?.level])
  const isIndividual = useMemo(
    () => String(school?.schoolType || 'SCHOOL').toUpperCase() === 'INDIVIDUAL',
    [school?.schoolType]
  )
  const upgradePlanKeys = useMemo(() => {
    if (!isIndividual) return ['basic', 'standard', 'premium']
    return ['individual', 'individual_premium', 'individual_annual']
  }, [isIndividual])
  const expiry = useMemo(
    () => school?.planExpiresAt || school?.trialEndsAt || null,
    [school?.planExpiresAt, school?.trialEndsAt]
  )

  const scrollToPayment = () => {
    document.getElementById('upgrade-payment')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handlePaymentStarted = (meta) => {
    setPaymentMeta(meta)
    setPaymentReference(String(meta?.referenceId || ''))
    setPaymentStatus('pending')
    setAwaitingPayment(true)
    setPaymentPollSeconds(10)
    refreshPaymentStatus({ syncPayment: true }).catch(() => {})
  }

  const waitingForConfirmation =
    awaitingPayment && paymentStatus !== 'paid' && paymentStatus !== 'failed'

  return (
    <DashboardLayout title="Billing">
      <div className="space-y-6">
        {showPaymentSuccess ? (
          <div className="rounded-xl border border-green-500/50 bg-green-950/30 p-4 text-center">
            <p className="text-lg font-bold text-green-300">Payment confirmed!</p>
            <p className="text-sm text-green-200/80 mt-1">
              Your subscription is active — premium features are unlocked.
            </p>
          </div>
        ) : null}

        {waitingForConfirmation ? (
          <Card className="border-royalPurple-accent/50 bg-royalPurple-deep/40">
            <CardContent className="pt-6 space-y-3">
              <p className="text-base font-semibold text-royalPurple-text1">
                Waiting to confirm your payment…
              </p>
              <p className="text-sm text-royalPurple-text2">
                Approve the mobile money prompt on your phone
                {paymentMeta?.provider ? ` (${providerLabel(paymentMeta.provider)})` : ''}. We are
                checking with Lipila every {paymentPollSeconds}s until the payment is confirmed. You
                do not need to refresh the page.
              </p>
              {paymentMeta?.accountNumber ? (
                <p className="text-sm text-royalPurple-text2">
                  Number: <span className="font-medium">{paymentMeta.accountNumber}</span>
                </p>
              ) : null}
              {paymentReference ? (
                <p className="text-xs text-royalPurple-text3">Reference: {paymentReference}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" onClick={checkPaymentNow} disabled={checkingPayment}>
                  {checkingPayment ? 'Checking…' : 'Check payment status now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Plan & Access</CardTitle>
          </CardHeader>
          <CardContent className="text-royalPurple-text2 space-y-2">
            {loading ? (
              <p>Loading...</p>
            ) : !school ? (
              <p>School context not found.</p>
            ) : (
              <>
                <p>
                  Current plan:{' '}
                  <span className="font-semibold text-royalPurple-text1 capitalize">{plan}</span>
                </p>
                <p>
                  {isIndividual ? 'Workspace' : 'School level'}:{' '}
                  <span className="font-semibold text-royalPurple-text1 capitalize">
                    {isIndividual ? 'Individual' : level}
                  </span>
                </p>
                {expiry ? (
                  <p>
                    Expiry:{' '}
                    <span className="font-semibold text-royalPurple-text1">
                      {formatDate(expiry)}
                    </span>
                  </p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Supported Mobile Money</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-royalPurple-text2 text-sm">
              Pay your subscription using any of these providers:
            </div>
            <ProviderLogos size={40} />
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-royalPurple-text1 mb-3">Subscription plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upgradePlanKeys.map((planKey) => (
              <PlanComparisonCard
                key={planKey}
                plan={planKey}
                schoolLevel={level}
                showPrice
                monthlyPrice={getPlanMonthlyPrice(planKey)}
                selected={selectedPlan === planKey}
                onSelect={(p) => {
                  setSelectedPlan(p)
                  scrollToPayment()
                }}
              />
            ))}
          </div>
        </div>

        <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
          <CardContent className="pt-6">
            <SubscriptionUpgradePanel
              selectedPlan={selectedPlan}
              onPlanChange={setSelectedPlan}
              currentPlan={plan}
              planOptions={upgradePlanKeys}
              paymentAwaiting={waitingForConfirmation}
              onPaymentStarted={handlePaymentStarted}
            />
          </CardContent>
        </Card>

        {paymentStatus === 'failed' ? (
          <p className="text-sm text-red-400">
            The last payment attempt failed or was cancelled. You can try again above.
          </p>
        ) : null}
      </div>
    </DashboardLayout>
  )
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout title="Billing">
          <p className="p-6">Loading…</p>
        </DashboardLayout>
      }
    >
      <BillingPageContent />
    </Suspense>
  )
}
