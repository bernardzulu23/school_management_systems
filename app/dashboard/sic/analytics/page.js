'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function SicAnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/sic/analytics', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load analytics')
      setData(json.data || null)
    } catch (error) {
      toast.error(error.message || 'Could not load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <DashboardLayout title="SIC analytics">
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1">CPD compliance analytics</h1>
            <p className="text-royalPurple-text2 mt-1">
              Departments that miss minutes {data?.graceDays ?? 3} days after an accepted meeting
              are marked inactive automatically.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>

        {loading && !data ? (
          <LoadingSpinner />
        ) : !data ? (
          <p className="text-sm text-royalPurple-text2">No analytics available.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Awaiting acceptance', value: data.awaitingAcceptance },
                { label: 'Accepted', value: data.accepted },
                { label: 'Inactive plans', value: data.inactivePlans },
                { label: 'Inactive departments', value: data.inactiveDepartments?.length || 0 },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-royalPurple-text2 font-medium">
                      {stat.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-royalPurple-text1">{stat.value ?? 0}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inactive departments</CardTitle>
              </CardHeader>
              <CardContent>
                {!data.inactiveDepartments?.length ? (
                  <p className="text-sm text-royalPurple-text2">
                    No departments are inactive for CPD non-compliance.
                  </p>
                ) : (
                  <ul className="divide-y divide-royalPurple-border">
                    {data.inactiveDepartments.map((dept) => (
                      <li key={dept.departmentId} className="py-3">
                        <p className="font-medium text-royalPurple-text1">{dept.name}</p>
                        <p className="text-sm text-royalPurple-text2">{dept.reason}</p>
                        <p className="text-xs text-royalPurple-text3 mt-1">
                          Since {formatDate(dept.inactiveAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">School CPD overview</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-royalPurple-text2 space-y-1">
                <p>HIM meetings recorded: {data.himMeetings ?? 0}</p>
                <p>School activity plans: {data.schoolActivityPlans ?? 0}</p>
                <p>Rejected plans: {data.rejected ?? 0}</p>
                {data.markedInactiveThisPass ? (
                  <p className="text-amber-600">
                    Marked inactive on this refresh: {data.markedInactiveThisPass}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
