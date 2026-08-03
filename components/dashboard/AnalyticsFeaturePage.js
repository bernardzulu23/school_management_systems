'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { ArrowLeft, RefreshCw, WifiOff } from 'lucide-react'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import LoadingSpinner from '@/components/LoadingSpinner'
import { cacheAdminJson, getCachedAdminJson } from '@/lib/offline/admin-ops'
import { isBrowserOnline, isNetworkFailure } from '@/lib/offline/network'

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
  const [fromCache, setFromCache] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setFromCache(false)
    const cacheKey = `admin-report:${apiPath}`
    try {
      if (isBrowserOnline()) {
        try {
          const res = await sessionFetch(apiPath)
          const json = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(json.error || json.message || 'Failed to load data')
          const payload = json.data ?? json
          await cacheAdminJson(cacheKey, payload)
          setData(payload)
          return
        } catch (e) {
          if (!isNetworkFailure(e)) throw e
        }
      }
      const cached = await getCachedAdminJson(cacheKey)
      if (cached != null) {
        setData(cached)
        setFromCache(true)
        return
      }
      throw new Error('No cached report available offline. Open this page once while online.')
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

        {fromCache ? (
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            Showing last cached snapshot — reconnect to refresh.
          </p>
        ) : null}

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
