'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { ArrowLeft, BarChart3, RefreshCw } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'

function gpiClass(status) {
  if (status === 'good') return 'text-green-600 bg-green-50 border-green-200'
  if (status === 'warn') return 'text-amber-700 bg-amber-50 border-amber-200'
  if (status === 'poor') return 'text-red-600 bg-red-50 border-red-200'
  return 'text-royalPurple-text2 bg-royalPurple-card2 border-royalPurple-border'
}

export default function GenderReportPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await sessionFetch(`/api/government/gender-report?year=${year}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load report')
      setData(json.data)
    } catch (e) {
      setError(e?.message || 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    load()
  }, [load])

  return (
    <DashboardLayout title="Gender & Dropout">
      <FeatureGate featureId="gender-report">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/headteacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <label className="text-sm flex items-center gap-2 ml-auto">
              Year
              <input
                type="number"
                className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card w-24"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <Card>
              <CardContent className="py-8 text-center text-red-600">{error}</CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className={`border ${gpiClass(data?.gpiStatus)}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Gender Parity Index (GPI)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{data?.gpi ?? '—'}</p>
                  <p className="text-sm mt-2">
                    Female / male ratio · Target ≥ 0.97 · {data?.totals?.female ?? 0} girls,{' '}
                    {data?.totals?.male ?? 0} boys enrolled
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Enrolment by year group</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Year group</th>
                        <th className="py-2">Male</th>
                        <th className="py-2">Female</th>
                        <th className="py-2">Unknown</th>
                        <th className="py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.enrolment || []).map((row) => (
                        <tr key={row.yearGroup} className="border-b border-royalPurple-border/30">
                          <td className="py-2">{row.yearGroup}</td>
                          <td className="py-2">{row.male}</td>
                          <td className="py-2">{row.female}</td>
                          <td className="py-2">{row.unknown}</td>
                          <td className="py-2 font-medium">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance comparison ({data?.year})</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {[
                    { label: 'Male', rate: data?.attendance?.maleRate },
                    { label: 'Female', rate: data?.attendance?.femaleRate },
                    { label: 'Unknown gender', rate: data?.attendance?.unknownRate },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-4 rounded-lg bg-royalPurple-card2 border border-royalPurple-border"
                    >
                      <p className="text-royalPurple-text2">{item.label}</p>
                      <p className="text-2xl font-bold">
                        {item.rate != null ? `${item.rate}%` : '—'}
                      </p>
                      <p className="text-xs text-royalPurple-text3">Present or late marks</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </FeatureGate>
    </DashboardLayout>
  )
}
