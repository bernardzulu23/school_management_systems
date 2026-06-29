'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function HeadteacherGuidanceReportsPage() {
  const [report, setReport] = useState(null)
  const [escalations, setEscalations] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      setLoading(true)
      const [reportRes, escRes] = await Promise.all([
        fetch('/api/guidance/reports/termly', { credentials: 'include' }),
        fetch('/api/guidance/escalations', { credentials: 'include' }),
      ])
      const reportJson = await reportRes.json().catch(() => ({}))
      const escJson = await escRes.json().catch(() => ({}))
      if (!reportRes.ok) throw new Error(reportJson.error || 'Failed to load report')
      if (!escRes.ok) throw new Error(escJson.error || 'Failed to load escalations')
      setReport(reportJson.data)
      setEscalations(escJson.data || [])
    } catch (error) {
      toast.error(error.message || 'Could not load guidance reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const acknowledge = async (id) => {
    try {
      const res = await fetch('/api/guidance/escalations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Acknowledge failed')
      toast.success('Escalation acknowledged')
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not acknowledge')
    }
  }

  return (
    <DashboardLayout title="Guidance reports">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">Guidance termly summary</h1>
          <p className="text-royalPurple-text2 text-sm mt-1">
            Aggregate counts only — safeguarding cases are excluded from category totals. Counts
            below 3 are shown as &lt;3 to protect pupil identity.
          </p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{report?.term || 'Current term'} overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-royalPurple-text2">
                  Open cases (display): {report?.open_cases_display}
                </p>
                <p className="text-royalPurple-text2">
                  Pending safeguarding escalations: {report?.pending_escalations ?? 0}
                </p>
                <ul className="mt-4 space-y-2">
                  {(report?.by_category || []).map((row) => (
                    <li
                      key={row.category}
                      className="flex justify-between border-b border-royalPurple-border/50 py-2"
                    >
                      <span className="text-royalPurple-text1">
                        {row.category.replace(/_/g, ' ')}
                      </span>
                      <span className="font-medium">{row.display}</span>
                    </li>
                  ))}
                </ul>
                {report?.note && (
                  <p className="text-xs text-royalPurple-text3 mt-4">{report.note}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Safeguarding escalations</CardTitle>
              </CardHeader>
              <CardContent>
                {escalations.length === 0 ? (
                  <p className="text-sm text-royalPurple-text2">No escalations.</p>
                ) : (
                  <ul className="divide-y divide-royalPurple-border text-sm">
                    {escalations.map((e) => (
                      <li key={e.id} className="py-3 flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-medium text-royalPurple-text1">
                            {e.case?.pupil?.name} · {e.case?.pupil?.class}
                          </p>
                          <p className="text-royalPurple-text2">{e.reason}</p>
                          <p className="text-xs text-royalPurple-text3 mt-1">
                            {new Date(e.escalatedAt).toLocaleString()}
                            {e.acknowledgedAt ? ' · Acknowledged' : ''}
                          </p>
                        </div>
                        <div className="flex gap-2 self-center">
                          <Link
                            href={`/dashboard/headteacher/guidance-reports/cases/${e.caseId}`}
                            className="text-royalPurple-accentTx hover:underline text-sm"
                          >
                            View case
                          </Link>
                          {!e.acknowledgedAt && (
                            <Button size="sm" variant="outline" onClick={() => acknowledge(e.id)}>
                              Acknowledge
                            </Button>
                          )}
                        </div>
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
