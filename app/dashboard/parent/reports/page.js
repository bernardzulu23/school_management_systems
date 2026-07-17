'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ParentChildSwitcher, useParentChild } from '@/components/parent/ParentChildContext'
import { useParentPortalData } from '@/components/parent/useParentPortalData'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function ParentReportsPage() {
  const { studentId } = useParentChild()
  const { data, loading, error } = useParentPortalData(studentId)

  return (
    <DashboardLayout title="Progress reports">
      <div className="space-y-4">
        <ParentChildSwitcher />
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Published term reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!data?.reports?.length ? (
                <p className="text-sm text-ink/60">No published reports yet.</p>
              ) : (
                data.reports.map((r) => (
                  <article key={r.id} className="rounded border border-ink/10 p-3 text-sm">
                    <header className="font-medium mb-1">
                      Term {r.term} · {r.year}
                      {r.attendancePct != null
                        ? ` · Attendance ${Math.round(r.attendancePct)}%`
                        : ''}
                    </header>
                    <p className="text-ink/80 whitespace-pre-wrap">
                      {r.summary || 'No narrative available.'}
                    </p>
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
