'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import LoadingSpinner from '@/components/LoadingSpinner'

export function AnalyticsFeaturePage({
  title,
  featureId,
  apiPath,
  backHref,
  renderContent,
  headerAction,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await sessionFetch(apiPath)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to load data')
      setData(json.data ?? json)
    } catch (e) {
      setError(e?.message || 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [apiPath])

  useEffect(() => {
    load()
  }, [load])

  return (
    <DashboardLayout title={title}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={backHref}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {headerAction}
        </div>

        <FeatureGate featureId={featureId}>
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <Card>
              <CardContent className="py-8 text-center text-red-600">{error}</CardContent>
            </Card>
          ) : (
            renderContent(data)
          )}
        </FeatureGate>
      </div>
    </DashboardLayout>
  )
}
