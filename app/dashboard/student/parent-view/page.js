'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { ArrowLeft, RefreshCw, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function StudentFeeStatementPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sessionFetch('/api/parent/portal')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load')
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

  const printStatement = () => {
    window.print()
  }

  const attendanceCounts = Array.isArray(data?.attendance)
    ? data.attendance
    : data?.attendance?.counts || []

  return (
    <DashboardLayout title="Fee statement">
      <FeatureGate featureId="parent-portal">
        <div className="space-y-4 print:space-y-2">
          <p className="text-sm text-ink/70 print:hidden">
            This is your student fee and progress summary. Parents with a school invite use the{' '}
            <strong>Parent portal</strong> login (separate account), not this page.
          </p>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link href="/dashboard/student">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" className="ml-auto" onClick={printStatement}>
              Download / print statement
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : data ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {data.student?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-royalPurple-text2">
                  Class: {data.student?.class}
                  {data.student?.yearGroup ? ` · ${data.student.yearGroup}` : ''}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-royalPurple-text2">Total due</p>
                    <p className="text-2xl font-bold">
                      K {Number(data.fees?.totalDue || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-royalPurple-text2">Paid</p>
                    <p className="text-2xl font-bold">
                      K {Number(data.fees?.totalPaid || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-royalPurple-text2">Balance</p>
                    <p className="text-2xl font-bold">
                      K {Number(data.fees?.balance || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Fee invoices</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Schedule</th>
                        <th className="py-2">Net</th>
                        <th className="py-2">Paid</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.fees?.invoices || []).map((inv) => (
                        <tr key={inv.id} className="border-b border-royalPurple-border/30">
                          <td className="py-2">{inv.schedule?.name}</td>
                          <td className="py-2">K {Number(inv.netAmount).toFixed(2)}</td>
                          <td className="py-2">K {Number(inv.amountPaid).toFixed(2)}</td>
                          <td className="py-2 capitalize">{inv.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance summary</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 text-sm">
                  {attendanceCounts.map((a) => (
                    <div key={a.status}>
                      <span className="capitalize">{String(a.status).toLowerCase()}</span>:{' '}
                      {a.count}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Latest results</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Subject</th>
                        <th className="py-2">Score</th>
                        <th className="py-2">Grade</th>
                        <th className="py-2">Term</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.results || []).map((r, i) => (
                        <tr key={i} className="border-b border-royalPurple-border/30">
                          <td className="py-2">{r.subject}</td>
                          <td className="py-2">{r.score}</td>
                          <td className="py-2">{r.grade}</td>
                          <td className="py-2">
                            {r.term} {r.year}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </FeatureGate>
    </DashboardLayout>
  )
}
