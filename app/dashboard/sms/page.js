'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Send } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { normalizeZmPhoneNumber } from '@/lib/sms/normalizePhone'
import toast from 'react-hot-toast'

function parsePhoneList(text) {
  return String(text || '')
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeZmPhoneNumber)
    .filter(Boolean)
}

export default function SmsLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(null)
  const [lifetimeGranted, setLifetimeGranted] = useState(0)
  const [lifetimeUsed, setLifetimeUsed] = useState(0)
  const [trialSmsAllowance, setTrialSmsAllowance] = useState(null)
  const [threshold, setThreshold] = useState(50)
  const [alertEmail, setAlertEmail] = useState('')
  const [parentSmsAbsent, setParentSmsAbsent] = useState(true)
  const [parentSmsLate, setParentSmsLate] = useState(true)
  const [parentSmsPresent, setParentSmsPresent] = useState(false)
  const [parentSmsExcused, setParentSmsExcused] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [phoneText, setPhoneText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingParents, setLoadingParents] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(false)

  const fetchSmsLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sms/logs?limit=100', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || json?.message || 'Failed to load SMS logs')
      setLogs(Array.isArray(json?.data) ? json.data : [])
    } catch (error) {
      console.error('Error fetching SMS logs:', error)
      setLogs([])
      toast.error(error?.message || 'Could not load delivery log')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/sms/balance', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return
      const data = json?.data || {}
      setBalance(data.smsBalance ?? 0)
      setLifetimeGranted(data.smsLifetimeGranted ?? 0)
      setLifetimeUsed(data.smsLifetimeUsed ?? 0)
      setTrialSmsAllowance(data.trialSmsAllowance ?? null)
      setThreshold(data.lowBalanceThreshold ?? 50)
      setAlertEmail(data.lowBalanceAlertEmail || '')
      setParentSmsAbsent(data.parentSmsAbsent !== false)
      setParentSmsLate(data.parentSmsLate !== false)
      setParentSmsPresent(Boolean(data.parentSmsPresent))
      setParentSmsExcused(Boolean(data.parentSmsExcused))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    fetchSmsLogs()
    fetchBalance()
  }, [fetchSmsLogs, fetchBalance])

  const saveAlertSettings = async () => {
    try {
      const res = await fetch('/api/sms/balance', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lowBalanceThreshold: Number(threshold) || 50,
          lowBalanceAlertEmail: alertEmail.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to save settings')
      toast.success('Low-balance alert settings saved')
      fetchBalance()
    } catch (e) {
      toast.error(e?.message || 'Could not save settings')
    }
  }

  const saveParentAttendanceSmsSettings = async () => {
    try {
      const res = await fetch('/api/sms/balance', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentSmsAbsent,
          parentSmsLate,
          parentSmsPresent,
          parentSmsExcused,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to save settings')
      toast.success('Parent attendance SMS settings saved')
      fetchBalance()
    } catch (e) {
      toast.error(e?.message || 'Could not save settings')
    }
  }

  const loadAllParentNumbers = async () => {
    setLoadingParents(true)
    try {
      const res = await fetch('/api/sms/recipients?source=parents', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load parent contacts')
      const phones = json?.data?.phoneNumbers || []
      setPhoneText(phones.join('\n'))
      toast.success(`Loaded ${phones.length} parent/guardian numbers`)
    } catch (e) {
      toast.error(e?.message || 'Could not load recipients')
    } finally {
      setLoadingParents(false)
    }
  }

  const loadAllTeacherNumbers = async () => {
    setLoadingTeachers(true)
    try {
      const res = await fetch('/api/sms/recipients?source=teachers', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(json?.error || json?.message || 'Failed to load teacher contacts')
      const phones = json?.data?.phoneNumbers || []
      setPhoneText(phones.join('\n'))
      toast.success(`Loaded ${phones.length} teacher numbers`)
    } catch (e) {
      toast.error(e?.message || 'Could not load teacher contacts')
    } finally {
      setLoadingTeachers(false)
    }
  }

  const sendBroadcast = async () => {
    const phoneNumbers = parsePhoneList(phoneText)
    const message = broadcastMessage.trim()
    if (!phoneNumbers.length) {
      toast.error('Add at least one valid +260 number (097… → +26097…)')
      return
    }
    if (!message) {
      toast.error('Enter a message')
      return
    }
    if (balance !== null && balance < phoneNumbers.length) {
      toast.error(`Insufficient SMS credits. Required: ${phoneNumbers.length}, balance: ${balance}`)
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/sms/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumbers, message }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || json?.message || 'Broadcast failed')
      }
      toast.success(json?.data?.message || `Enqueued ${phoneNumbers.length} messages`)
      setBroadcastMessage('')
      fetchBalance()
      fetchSmsLogs()
    } catch (e) {
      toast.error(e?.message || 'Broadcast failed')
    } finally {
      setSending(false)
    }
  }

  const previewCount = parsePhoneList(phoneText).length
  const creditsExhausted = balance !== null && balance <= 0
  const trialUsed =
    trialSmsAllowance != null ? Math.min(lifetimeUsed, trialSmsAllowance) : lifetimeUsed

  return (
    <DashboardLayout title="SMS">
      <div className="bg-royalPurple-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-royalPurple-text1">SMS</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-royalPurple-text1 mb-1">Credits</h2>
              <p className="text-sm text-royalPurple-text3">
                Each recipient uses 1 credit. Remaining decreases as you send.
              </p>
            </div>
            <Button type="button" className="btn-secondary btn-sm" onClick={fetchBalance}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh balance
            </Button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-royalPurple-border bg-royalPurple-page p-4">
              <p className="text-xs uppercase tracking-wide text-royalPurple-text3">Remaining</p>
              <p className="text-3xl font-bold text-royalPurple-text1 mt-1">
                {balance === null ? '—' : balance}
              </p>
            </div>
            <div className="rounded-lg border border-royalPurple-border bg-royalPurple-page p-4">
              <p className="text-xs uppercase tracking-wide text-royalPurple-text3">Texts used</p>
              <p className="text-3xl font-bold text-royalPurple-text1 mt-1">{lifetimeUsed}</p>
            </div>
            <div className="rounded-lg border border-royalPurple-border bg-royalPurple-page p-4">
              <p className="text-xs uppercase tracking-wide text-royalPurple-text3">Granted</p>
              <p className="text-3xl font-bold text-royalPurple-text1 mt-1">{lifetimeGranted}</p>
            </div>
          </div>
          {trialSmsAllowance != null ? (
            <p className="text-sm text-royalPurple-text2 mt-3">
              Trial pack: {trialUsed} of {trialSmsAllowance} used
            </p>
          ) : null}
          {creditsExhausted ? (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                SMS credits exhausted. Subscribe to continue sending messages to parents and staff.
              </p>
              <Link
                href="/pricing"
                className="inline-flex mt-3 text-sm font-semibold text-royalPurple-primary underline"
              >
                Subscribe to continue
              </Link>
            </div>
          ) : null}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-royalPurple-text1 mb-2">Emergency broadcast</h2>
          <p className="text-sm text-royalPurple-text3 mb-4">
            Numbers are normalized to +260… before send. One bad number will not block the batch.
            Your school name is added automatically at the start of each message.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                Phone numbers ({previewCount} valid)
              </label>
              <textarea
                className="w-full zsms-input min-h-[160px] p-3 rounded-md border font-mono text-sm"
                placeholder={'0977123456\n+260977123456\none per line or comma-separated'}
                value={phoneText}
                onChange={(e) => setPhoneText(e.target.value)}
                disabled={creditsExhausted}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={loadAllParentNumbers}
                  disabled={loadingParents || loadingTeachers || creditsExhausted}
                >
                  {loadingParents ? 'Loading…' : 'Load all parent contacts'}
                </Button>
                <Button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={loadAllTeacherNumbers}
                  disabled={loadingParents || loadingTeachers || creditsExhausted}
                >
                  {loadingTeachers ? 'Loading…' : 'Load all teacher contacts'}
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-royalPurple-text2 mb-1">
                Message (max 1000 chars)
              </label>
              <textarea
                className="w-full zsms-input min-h-[160px] p-3 rounded-md border"
                maxLength={1000}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="School closed tomorrow due to…"
                disabled={creditsExhausted}
              />
              <p className="text-xs text-royalPurple-text3 mt-1">
                {broadcastMessage.length}/1000 · uses {previewCount} credit(s)
                {balance !== null ? ` · balance ${balance}` : ''}
              </p>
              <Button
                type="button"
                className="btn-primary mt-3"
                onClick={sendBroadcast}
                disabled={sending || previewCount === 0 || creditsExhausted}
              >
                <Send className="w-4 h-4 mr-2" />
                {sending
                  ? 'Enqueueing…'
                  : creditsExhausted
                    ? 'No credits remaining'
                    : `Send to ${previewCount} recipients`}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-royalPurple-text1 mb-2">
            Parent attendance SMS
          </h2>
          <p className="text-sm text-royalPurple-text3 mb-4">
            When teachers mark attendance, parents with guardian/father/mother numbers on the
            student record receive automatic SMS (standard or premium plan). Messages are sent in
            the background and do not delay marking.
          </p>
          <div className="space-y-3 max-w-xl">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={parentSmsAbsent}
                onChange={(e) => setParentSmsAbsent(e.target.checked)}
              />
              <span>
                <span className="font-medium text-royalPurple-text1">SMS when absent</span>
                <span className="block text-xs text-royalPurple-text3">
                  Immediately notify parent when a child is marked absent
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={parentSmsLate}
                onChange={(e) => setParentSmsLate(e.target.checked)}
              />
              <span>
                <span className="font-medium text-royalPurple-text1">SMS when late</span>
                <span className="block text-xs text-royalPurple-text3">
                  Notify parent when a child arrives late
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={parentSmsPresent}
                onChange={(e) => setParentSmsPresent(e.target.checked)}
              />
              <span>
                <span className="font-medium text-royalPurple-text1">SMS when present</span>
                <span className="block text-xs text-royalPurple-text3">
                  Confirm arrival to parent (increases SMS volume)
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={parentSmsExcused}
                onChange={(e) => setParentSmsExcused(e.target.checked)}
              />
              <span>
                <span className="font-medium text-royalPurple-text1">SMS when excused</span>
                <span className="block text-xs text-royalPurple-text3">
                  Notify when absence is recorded as excused
                </span>
              </span>
            </label>
          </div>
          <p className="text-xs text-royalPurple-text3 mt-4">
            Each SMS uses one credit from your school balance. Parent numbers come from student
            registration (guardian, father, or mother contact).
          </p>
          <Button
            type="button"
            className="btn-secondary mt-4"
            onClick={saveParentAttendanceSmsSettings}
          >
            Save attendance SMS settings
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-royalPurple-text1 mb-2">Low-balance alerts</h2>
          <p className="text-sm text-royalPurple-text3 mb-4">
            Email sent when credits fall at or below the threshold (max once per 24 hours).
          </p>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-royalPurple-text3">Threshold</label>
              <input
                type="number"
                min={0}
                className="zsms-input w-28 p-2 rounded border"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-royalPurple-text3">Alert email (optional)</label>
              <input
                type="email"
                className="zsms-input w-full p-2 rounded border"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="headteacher@school.zm"
              />
            </div>
            <Button type="button" className="btn-secondary" onClick={saveAlertSettings}>
              Save alerts
            </Button>
          </div>
        </Card>

        <Card>
          <div className="p-6 flex justify-between items-center border-b border-royalPurple-border">
            <h2 className="text-lg font-semibold text-royalPurple-text1">Delivery log</h2>
            <Button onClick={fetchSmsLogs} className="btn-secondary btn-sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          <div className="p-6 overflow-x-auto">
            {loading ? (
              <p>Loading…</p>
            ) : (
              <table className="min-w-full divide-y divide-royalPurple-border">
                <thead className="bg-royalPurple-page">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-royalPurple-text3 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-royalPurple-text3 uppercase">
                      To
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-royalPurple-text3 uppercase">
                      Channel
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-royalPurple-text3 uppercase">
                      Message
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-royalPurple-text3 uppercase">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-royalPurple-border">
                  {logs.map((log, idx) => (
                    <tr key={String(log.id || `${log.createdAt}-${idx}`)}>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            log.status === 'FAILED'
                              ? 'bg-red-500/20 text-red-700'
                              : log.direction === 'in'
                                ? 'bg-royalPurple-accent text-royalPurple-accentTx'
                                : 'bg-royalPurple-success/20 text-royalPurple-successTx'
                          }`}
                        >
                          {log.status || log.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {Array.isArray(log.to) ? log.to.join(', ') : log.to || log.recipient || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-xs">
                        {log.channel || log.provider || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-md truncate">
                        {log.text || log.message || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {!logs.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-royalPurple-text3"
                      >
                        No SMS logs yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
