'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth'

function toIsoFromLocal(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function HodSicCpdPage() {
  const { user } = useAuth()
  const departmentId =
    user?.hodProfile?.departmentRef?.id ||
    user?.hodProfile?.departmentId ||
    user?.teacherProfile?.departments?.[0]?.department?.id ||
    ''
  const departmentName =
    user?.hodProfile?.departmentRef?.name ||
    user?.hodProfile?.department ||
    user?.department ||
    'Your department'

  const [plans, setPlans] = useState([])
  const [graceDays, setGraceDays] = useState(3)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [term, setTerm] = useState(1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [meetingDate, setMeetingDate] = useState('')
  const [description, setDescription] = useState('')
  const [minutesDraft, setMinutesDraft] = useState({})

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/sic/cpd-plans', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load plans')
      setPlans(json.data || [])
      if (json.graceDays) setGraceDays(json.graceDays)
    } catch (error) {
      toast.error(error.message || 'Could not load CPD plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const submitPlan = async () => {
    if (!departmentId) {
      toast.error('No department linked to your HOD profile')
      return
    }
    const iso = toIsoFromLocal(meetingDate)
    if (!title.trim() || !iso) {
      toast.error('Title and meeting date are required')
      return
    }
    try {
      setSaving(true)
      const res = await fetch('/api/sic/cpd-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          departmentId,
          title: title.trim(),
          term: Number(term),
          year: Number(year),
          meetingDate: iso,
          description: description.trim() || null,
          submit: true,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not submit plan')
      toast.success('CPD plan submitted to SIC')
      setTitle('')
      setDescription('')
      setMeetingDate('')
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not submit plan')
    } finally {
      setSaving(false)
    }
  }

  const submitMinutes = async (id) => {
    const minutes = String(minutesDraft[id] || '').trim()
    if (minutes.length < 5) {
      toast.error('Enter meeting minutes')
      return
    }
    try {
      setSaving(true)
      const res = await fetch('/api/sic/cpd-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, minutes }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not submit minutes')
      toast.success('Minutes submitted')
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not submit minutes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="SIC CPD plans">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">Department CPD for SIC</h1>
          <p className="text-royalPurple-text2 mt-1">
            Submit {departmentName} CPD plans for SIC acceptance. After the meeting, submit minutes
            within {graceDays} days or the department is marked inactive.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submit CPD plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!departmentId ? (
              <p className="text-sm text-amber-600">
                Your account needs a linked department before you can submit plans.
              </p>
            ) : null}
            <label className="block text-sm">
              <span className="text-royalPurple-text2">Title</span>
              <input
                className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="text-royalPurple-text2">Term</span>
                <select
                  className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2"
                  value={term}
                  onChange={(e) => setTerm(Number(e.target.value))}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-royalPurple-text2">Year</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </label>
              <label className="block text-sm sm:col-span-1">
                <span className="text-royalPurple-text2">Meeting date</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-royalPurple-text2">Description</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2 min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <Button onClick={submitPlan} disabled={saving || !departmentId}>
              {saving ? 'Submitting…' : 'Submit to SIC'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your submitted plans</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : plans.length === 0 ? (
              <p className="text-sm text-royalPurple-text2">No CPD plans submitted yet.</p>
            ) : (
              <ul className="divide-y divide-royalPurple-border">
                {plans.map((plan) => (
                  <li key={plan.id} className="py-4 space-y-2">
                    <p className="font-medium text-royalPurple-text1">{plan.title}</p>
                    <p className="text-sm text-royalPurple-text2">
                      {plan.status} · Meeting {formatDate(plan.meetingDate)}
                      {plan.minutesDueAt ? ` · Minutes due ${formatDate(plan.minutesDueAt)}` : ''}
                    </p>
                    {plan.inactiveReason ? (
                      <p className="text-sm text-red-600">{plan.inactiveReason}</p>
                    ) : null}
                    {['ACCEPTED', 'INACTIVE'].includes(plan.status) && !plan.minutesSubmittedAt ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2 min-h-[80px]"
                          placeholder="Meeting minutes…"
                          value={minutesDraft[plan.id] || ''}
                          onChange={(e) =>
                            setMinutesDraft((prev) => ({ ...prev, [plan.id]: e.target.value }))
                          }
                        />
                        <Button size="sm" disabled={saving} onClick={() => submitMinutes(plan.id)}>
                          Submit minutes
                        </Button>
                      </div>
                    ) : null}
                    {plan.minutesSubmittedAt ? (
                      <p className="text-sm text-green-600">
                        Minutes submitted {formatDate(plan.minutesSubmittedAt)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
