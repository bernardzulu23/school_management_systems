'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react'

export function ECZDeadlineTracker({ academicYear }) {
  const [deadline, setDeadline] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const year = academicYear || new Date().getFullYear()
    fetch(`/api/ecz/submissions?academicYear=${year}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setDeadline(data))
      .catch(() => setDeadline(null))
      .finally(() => setLoading(false))
  }, [academicYear])

  if (loading || !deadline) return null

  if (deadline.isPassed) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-3 flex gap-2 text-red-900">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p className="text-sm">
          Deadline passed: SBA scores were due by 31 January {deadline.academicYear + 1}. Contact
          ECZ for late submissions.
        </p>
      </div>
    )
  }

  if (deadline.isUrgent) {
    return (
      <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 flex gap-2 text-orange-900">
        <Clock className="h-4 w-4 shrink-0 mt-0.5" />
        <p className="text-sm">
          Urgent: {deadline.daysRemaining} days until ECZ SBA submission deadline (31 January{' '}
          {deadline.academicYear + 1}).
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-green-300 bg-green-50 p-3 flex gap-2 text-green-900">
      <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <p className="text-sm">
        {deadline.daysRemaining} days until ECZ SBA deadline (31 January {deadline.academicYear + 1}
        ).
      </p>
    </div>
  )
}
