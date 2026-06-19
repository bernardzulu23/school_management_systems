'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { ArrowLeft, BarChart3, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function ProprietorPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sessionFetch('/api/proprietor/overview')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load overview')
      setData(json.data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const fees = data?.fees || {}

  return (
    <DashboardLayout title="Owner Dashboard">
      <FeatureGate featureId="proprietor-dashboard">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
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
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Enrolled', value: data?.enrolment?.total ?? 0 },
                  { label: 'Collection rate', value: `${fees.collectionRate ?? 0}%` },
                  { label: 'Outstanding', value: `K ${Number(fees.outstanding || 0).toFixed(2)}` },
                  {
                    label: 'Attendance rate',
                    value: data?.attendanceRate != null ? `${data.attendanceRate}%` : '—',
                  },
                ].map((c) => (
                  <Card key={c.label}>
                    <CardContent className="pt-6">
                      <p className="text-xs text-royalPurple-text2">{c.label}</p>
                      <p className="text-2xl font-bold">{c.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Monthly fee collections
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.monthlyCollections || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total" fill="var(--royalPurple-accent, #7c3aed)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top outstanding balances</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Student</th>
                        <th className="py-2">Class</th>
                        <th className="py-2">Schedule</th>
                        <th className="py-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.topOutstanding || []).map((row, i) => (
                        <tr key={i} className="border-b border-royalPurple-border/30">
                          <td className="py-2">{row.studentName}</td>
                          <td className="py-2">{row.class}</td>
                          <td className="py-2">{row.schedule}</td>
                          <td className="py-2">K {Number(row.balance).toFixed(2)}</td>
                        </tr>
                      ))}
                      {!data?.topOutstanding?.length ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-royalPurple-text3">
                            No outstanding balances.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </FeatureGate>
    </DashboardLayout>
  )
}
