'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function GuidanceCaseDetailPage() {
  const params = useParams()
  const caseId = params?.id

  const [caseRow, setCaseRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [logText, setLogText] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [referral, setReferral] = useState({
    referredTo: '',
    consentObtained: false,
    consentByGuardianId: '',
  })
  const [escalateReason, setEscalateReason] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/guidance/cases/${caseId}`, { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load case')
      setCaseRow(json.data)
    } catch (error) {
      toast.error(error.message || 'Could not load case')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    if (caseId) load()
  }, [caseId, load])

  const addLog = async () => {
    if (!logText.trim()) return
    try {
      const res = await fetch(`/api/guidance/cases/${caseId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actionTaken: logText,
          followUpDate: followUp ? new Date(followUp).toISOString() : null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Log failed')
      setLogText('')
      setFollowUp('')
      setCaseRow(json.data?.case || json.data)
      toast.success('Log entry added')
    } catch (error) {
      toast.error(error.message || 'Could not add log')
    }
  }

  const addReferral = async () => {
    try {
      const res = await fetch(`/api/guidance/cases/${caseId}/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(referral),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Referral failed')
      setReferral({ referredTo: '', consentObtained: false, consentByGuardianId: '' })
      setCaseRow(json.data?.case || json.data)
      toast.success('Referral recorded')
    } catch (error) {
      toast.error(error.message || 'Referral failed')
    }
  }

  const escalate = async () => {
    if (!escalateReason.trim()) {
      toast.error('Enter a reason for escalation')
      return
    }
    try {
      const res = await fetch(`/api/guidance/cases/${caseId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: escalateReason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Escalation failed')
      setEscalateReason('')
      setCaseRow(json.data)
      toast.success('Escalated to headteacher')
    } catch (error) {
      toast.error(error.message || 'Escalation failed')
    }
  }

  const closeCase = async () => {
    try {
      const res = await fetch(`/api/guidance/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'CLOSED' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Update failed')
      setCaseRow(json.data)
      toast.success('Case closed')
    } catch (error) {
      toast.error(error.message || 'Could not close case')
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Case detail">
        <LoadingSpinner />
      </DashboardLayout>
    )
  }

  if (!caseRow) {
    return (
      <DashboardLayout title="Case detail">
        <p className="text-royalPurple-text2">Case not found or access denied.</p>
        <Link
          href="/dashboard/guidance/cases"
          className="text-royalPurple-accentTx hover:underline text-sm"
        >
          Back to case log
        </Link>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Case detail">
      <div className="space-y-6 max-w-3xl">
        <div>
          <Link
            href="/dashboard/guidance/cases"
            className="text-sm text-royalPurple-accentTx hover:underline"
          >
            ← Case log
          </Link>
          <h1 className="text-2xl font-bold text-royalPurple-text1 mt-2">
            {caseRow.pupil?.name} — {caseRow.pupil?.class}
          </h1>
          <p className="text-sm text-royalPurple-text2 mt-1">
            {caseRow.category.replace(/_/g, ' ')} · {caseRow.confidentiality} · {caseRow.status}
          </p>
          {caseRow.summary && (
            <p className="text-sm text-royalPurple-text1 mt-2 bg-royalPurple-card rounded-lg p-3">
              {caseRow.summary}
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Log entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(caseRow.logs || []).length === 0 ? (
              <p className="text-sm text-royalPurple-text2">No log entries yet.</p>
            ) : (
              <ul className="space-y-3">
                {caseRow.logs.map((log) => (
                  <li
                    key={log.id}
                    className="border border-royalPurple-border rounded-lg p-3 text-sm"
                  >
                    <p className="text-royalPurple-text1">{log.actionTaken}</p>
                    <p className="text-royalPurple-text2 mt-1">
                      {new Date(log.date).toLocaleString()} · {log.loggedBy?.name}
                      {log.followUpDate
                        ? ` · Follow-up ${new Date(log.followUpDate).toLocaleDateString()}`
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-2 pt-2 border-t border-royalPurple-border">
              <textarea
                className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm min-h-[72px]"
                placeholder="Action taken…"
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
              />
              <label className="text-xs text-royalPurple-text2 block">
                Follow-up date (optional)
                <input
                  type="date"
                  className="mt-1 block rounded border border-royalPurple-border bg-royalPurple-card px-2 py-1"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                />
              </label>
              <Button size="sm" onClick={addLog}>
                Add log entry
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Referrals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(caseRow.referrals || []).map((r) => (
              <div key={r.id} className="text-sm border border-royalPurple-border rounded-lg p-3">
                <p className="font-medium text-royalPurple-text1">{r.referredTo}</p>
                <p className="text-royalPurple-text2">
                  {r.status} · Consent: {r.consentObtained ? 'Yes' : 'No'}
                </p>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm sm:col-span-2"
                placeholder="Referred to (organisation or person)"
                value={referral.referredTo}
                onChange={(e) => setReferral((r) => ({ ...r, referredTo: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm text-royalPurple-text2">
                <input
                  type="checkbox"
                  checked={referral.consentObtained}
                  onChange={(e) =>
                    setReferral((r) => ({ ...r, consentObtained: e.target.checked }))
                  }
                />
                Guardian consent obtained
              </label>
              <input
                className="rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm"
                placeholder="Guardian name / ID"
                value={referral.consentByGuardianId}
                onChange={(e) =>
                  setReferral((r) => ({ ...r, consentByGuardianId: e.target.value }))
                }
              />
            </div>
            <Button size="sm" variant="outline" onClick={addReferral}>
              Record referral
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Safeguarding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {caseRow.escalation && (
              <p className="text-sm text-royalPurple-text2">
                Escalated {new Date(caseRow.escalation.escalatedAt).toLocaleString()}
                {caseRow.escalation.acknowledgedAt
                  ? ' · Acknowledged by headteacher'
                  : ' · Pending acknowledgement'}
              </p>
            )}
            <textarea
              className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm min-h-[60px]"
              placeholder="Reason for escalation…"
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={escalate}>
                Escalate to headteacher
              </Button>
              {caseRow.status !== 'CLOSED' && (
                <Button size="sm" onClick={closeCase}>
                  Close case
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
