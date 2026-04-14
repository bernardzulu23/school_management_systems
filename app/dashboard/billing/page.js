'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlanComparisonCard } from '@/components/FeatureGate'
import ProviderLogos from '@/components/payments/ProviderLogos'

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

export default function BillingPage() {
  const [school, setSchool] = useState(null)
  const [loading, setLoading] = useState(true)

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
        if (active) setSchool(json?.school || null)
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
  const expiry = useMemo(
    () => school?.planExpiresAt || school?.trialEndsAt || null,
    [school?.planExpiresAt, school?.trialEndsAt]
  )

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
                  School level:{' '}
                  <span className="font-semibold text-royalPurple-text1 capitalize">{level}</span>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlanComparisonCard plan="basic" schoolLevel={level} />
          <PlanComparisonCard plan="standard" schoolLevel={level} />
          <PlanComparisonCard plan="premium" schoolLevel={level} />
        </div>
      </div>
    </DashboardLayout>
  )
}
