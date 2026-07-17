'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ParentChildSwitcher, useParentChild } from '@/components/parent/ParentChildContext'
import { useParentPortalData } from '@/components/parent/useParentPortalData'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function ParentAttendancePage() {
  const { studentId } = useParentChild()
  const { data, loading, error } = useParentPortalData(studentId)

  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-4">
        <ParentChildSwitcher />
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="mb-3">
                  Attendance rate:{' '}
                  <strong>
                    {data?.attendance?.rate != null ? `${data.attendance.rate}%` : '—'}
                  </strong>
                </p>
                <ul className="flex flex-wrap gap-3">
                  {(data?.attendance?.counts || []).map((c) => (
                    <li key={c.status} className="rounded border border-ink/15 px-3 py-1">
                      {c.status}: <strong>{c.count}</strong>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent marks</CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.attendance?.recent?.length ? (
                  <p className="text-sm text-ink/60">No attendance marks yet.</p>
                ) : (
                  <ul className="divide-y divide-ink/10 text-sm">
                    {data.attendance.recent.map((m) => (
                      <li key={m.id} className="py-2 flex justify-between gap-2">
                        <span>
                          {m.markedAt ? new Date(m.markedAt).toLocaleDateString() : '—'}
                          {m.subject ? ` · ${m.subject}` : ''}
                        </span>
                        <span className="font-medium">{m.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
