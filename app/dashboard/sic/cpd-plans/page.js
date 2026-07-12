'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { Check, X } from 'lucide-react'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

export default function SicCpdPlansPage() {
  const [plans, setPlans] = useState([])
  const [graceDays, setGraceDays] = useState(3)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('SUBMITTED')
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      const qs = filter ? `?status=${encodeURIComponent(filter)}` : ''
      const res = await fetch(`/api/sic/cpd-plans${qs}`, { credentials: 'include' })
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
  }, [filter])

  const review = async (id, action) => {
    try {
      setBusyId(id)
      const res = await fetch('/api/sic/cpd-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Review failed')
      toast.success(action === 'accept' ? 'Plan accepted' : 'Plan rejected')
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not update plan')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DashboardLayout title="Department CPD plans">
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">Department CPD plans</h1>
          <p className="text-royalPurple-text2 mt-1">
            Accept plans from departments. After acceptance, minutes are due within {graceDays} days
            of the meeting date — overdue departments are marked inactive.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {['SUBMITTED', 'ACCEPTED', 'REJECTED', 'INACTIVE', ''].map((status) => (
            <Button
              key={status || 'all'}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status || 'All'}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inbox</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : plans.length === 0 ? (
              <p className="text-sm text-royalPurple-text2">No plans in this filter.</p>
            ) : (
              <ul className="divide-y divide-royalPurple-border">
                {plans.map((plan) => (
                  <li key={plan.id} className="py-4 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-royalPurple-text1">{plan.title}</p>
                        <p className="text-sm text-royalPurple-text2">
                          {plan.department?.name || 'Department'} · Term {plan.term} {plan.year} ·{' '}
                          {plan.status}
                        </p>
                        <p className="text-sm text-royalPurple-text2">
                          Meeting: {formatDate(plan.meetingDate)}
                          {plan.minutesDueAt
                            ? ` · Minutes due: ${formatDate(plan.minutesDueAt)}`
                            : ''}
                        </p>
                        {plan.description ? (
                          <p className="text-sm text-royalPurple-text2 mt-1">{plan.description}</p>
                        ) : null}
                        {plan.minutesSubmittedAt ? (
                          <p className="text-sm text-green-600 mt-1">
                            Minutes submitted {formatDate(plan.minutesSubmittedAt)}
                          </p>
                        ) : null}
                        {plan.inactiveReason ? (
                          <p className="text-sm text-red-600 mt-1">{plan.inactiveReason}</p>
                        ) : null}
                      </div>
                      {plan.status === 'SUBMITTED' ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={busyId === plan.id}
                            onClick={() => review(plan.id, 'accept')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === plan.id}
                            onClick={() => review(plan.id, 'reject')}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : null}
                    </div>
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
