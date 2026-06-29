'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function HeadteacherSafeguardingCasePage() {
  const params = useParams()
  const caseId = params?.id
  const [caseRow, setCaseRow] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/guidance/cases/${caseId}`, { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Failed to load case')
        setCaseRow(json.data)
      } catch (error) {
        toast.error(error.message || 'Access denied or case not found')
      } finally {
        setLoading(false)
      }
    }
    if (caseId) load()
  }, [caseId])

  return (
    <DashboardLayout title="Safeguarding case">
      <div className="space-y-4 max-w-2xl">
        <Link
          href="/dashboard/headteacher/guidance-reports"
          className="text-sm text-royalPurple-accentTx hover:underline"
        >
          ← Guidance reports
        </Link>
        {loading ? (
          <LoadingSpinner />
        ) : !caseRow ? (
          <p className="text-royalPurple-text2 text-sm">Case not available.</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {caseRow.pupil?.name} · {caseRow.pupil?.class}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p className="text-royalPurple-text2">
                {caseRow.confidentiality} · {caseRow.status} · Opened{' '}
                {new Date(caseRow.openedAt).toLocaleDateString()}
              </p>
              {caseRow.summary && <p className="text-royalPurple-text1">{caseRow.summary}</p>}
              {caseRow.escalation && (
                <p className="text-royalPurple-dangerTx bg-royalPurple-danger/10 rounded p-2">
                  Escalation: {caseRow.escalation.reason}
                </p>
              )}
              <div>
                <p className="font-medium text-royalPurple-text1 mb-2">Recent log entries</p>
                <ul className="space-y-2">
                  {(caseRow.logs || []).slice(0, 5).map((log) => (
                    <li key={log.id} className="border border-royalPurple-border rounded p-2">
                      {log.actionTaken}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
