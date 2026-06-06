'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      day: '2-digit',
    })
  } catch {
    return null
  }
}

function BillingPageContent() {
  const searchParams = useSearchParams()
  const [school, setSchool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState('standard')

  useEffect(() => {
    const payment = searchParams.get('payment')
    if (payment === 'success') {
      toast.success('Payment received. Your plan will update shortly.')
    } else if (payment === 'failed') {
      toast.error('Payment was not completed. Try again or contact support.')
    }
  }, [searchParams])

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      try {
        const res = await fetch('/api/school/current', {
          cache: 'no-store',
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (active) {
          const s = json?.school || null
          setSchool(s)
          const p = String(s?.plan || 'standard').toLowerCase()
          if (PLAN_PRICING[p]) setSelectedPlan(p)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [])

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

  return (
    <DashboardLayout title="Billing">
      <div className="space-y-6">
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
              onPaymentStarted={() => {
                setTimeout(() => {
                  fetch('/api/school/current', { credentials: 'include', cache: 'no-store' })
                    .then((r) => r.json())
                    .then((j) => j?.school && setSchool(j.school))
                    .catch(() => {})
                }, 3000)
              }}
            />
          </CardContent>
        </Card>
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
