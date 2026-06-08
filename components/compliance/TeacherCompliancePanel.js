'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

const DOMAIN_LABELS = {
  assessments: 'Assessments',
  attendance: 'Attendance',
  ecz_sba: 'ECZ SBA',
  results: 'Results',
  results_feedback: 'Result feedback',
}

const STATUS_CHIP = {
  ok: 'bg-royalPurple-success/20 text-royalPurple-successTx border-royalPurple-success/40',
  missing: 'bg-royalPurple-danger/20 text-royalPurple-dangerTx border-royalPurple-danger/40',
  no_feedback: 'bg-warn/20 text-warn border-warn/40',
}

const STATUS_TEXT = {
  ok: 'OK',
  missing: 'Missing',
  no_feedback: 'No feedback',
}

function AttendanceComplianceLists({ data }) {
  const completed = data?.attendanceToday?.completed || []
  const missing = data?.attendanceToday?.missing || []
  const dateLabel = data?.attendanceToday?.date || 'today'

  return (
    <div className="space-y-4">
      <p className="text-xs text-royalPurple-text3">
        Based on attendance recorded today ({dateLabel}). Timetable engagement is not required until
        conflict-free generation is available.
      </p>

      <div>
        <p className="text-sm font-medium text-royalPurple-successTx mb-2">
          Completed attendance ({completed.length})
        </p>
        {completed.length === 0 ? (
          <p className="text-sm text-royalPurple-text3">
            No teachers have recorded attendance yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {completed.map((row) => (
              <li
                key={row.teacherId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-lg border border-royalPurple-success/30 bg-royalPurple-success/10 px-3 py-2 text-sm"
              >
                <span className="font-medium text-royalPurple-text1">{row.name}</span>
                <span className="text-royalPurple-text2 text-xs">{row.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-royalPurple-dangerTx mb-2">
          Not yet recorded ({missing.length})
        </p>
        {missing.length === 0 ? (
          <p className="text-sm text-royalPurple-text2">
            All teachers with a teaching load have recorded attendance today.
          </p>
        ) : (
          <ul className="space-y-2">
            {missing.map((row) => (
              <li
                key={row.teacherId}
                className="flex items-center justify-between rounded-lg border border-royalPurple-danger/30 bg-royalPurple-danger/10 px-3 py-2 text-sm"
              >
                <span className="font-medium text-royalPurple-text1">{row.name}</span>
                <span className="text-xs text-royalPurple-text3">{row.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * @param {{ domain?: 'assessments'|'attendance'|'ecz_sba'|'results'|'results_feedback' }} props
 */
export function TeacherCompliancePanel({ domain }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['teacher-compliance'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/teacher-compliance', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load compliance')
      return json.data
    },
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <Card className="border-royalPurple-border/60">
        <CardContent className="py-4 text-sm text-royalPurple-text2">
          Loading teacher compliance...
        </CardContent>
      </Card>
    )
  }

  if (isError || !data) return null

  const flaggedForDomain = domain ? data.flagged.filter((f) => f.domain === domain) : data.flagged

  const missingCount =
    domain === 'attendance' ? (data.attendanceToday?.missing || []).length : flaggedForDomain.length
  const domainLabel = domain ? DOMAIN_LABELS[domain] || domain : 'compliance'

  return (
    <Card className="border-royalPurple-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-royalPurple-text1">
          {missingCount > 0 ? (
            <AlertTriangle className="h-5 w-5 text-warn" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-royalPurple-successTx" />
          )}
          Teacher {domainLabel} compliance
          {data.term ? (
            <span className="text-xs font-normal text-royalPurple-text3">
              ({data.term} {data.academicYear})
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {domain === 'attendance' ? (
          <AttendanceComplianceLists data={data} />
        ) : missingCount === 0 ? (
          <p className="text-sm text-royalPurple-text2">
            All teachers with a teaching load are compliant for {domainLabel.toLowerCase()}.
          </p>
        ) : (
          <>
            <p className="text-sm text-royalPurple-text2">
              {missingCount} teacher{missingCount === 1 ? '' : 's'} need attention for{' '}
              {domainLabel.toLowerCase()}.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-royalPurple-border/40 text-left text-royalPurple-text3">
                    <th className="py-2 pr-4 font-medium">Teacher</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(domain
                    ? data.teachers.filter((t) => t.domains[domain] && t.domains[domain] !== 'ok')
                    : data.teachers.filter((t) => Object.values(t.domains).some((s) => s !== 'ok'))
                  ).map((t) => {
                    const status = domain ? t.domains[domain] : 'missing'
                    const flag = flaggedForDomain.find(
                      (f) => f.teacherId === t.id && (!domain || f.domain === domain)
                    )
                    return (
                      <tr key={t.id} className="border-b border-royalPurple-border/20">
                        <td className="py-2 pr-4 text-royalPurple-text1">{t.name}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${STATUS_CHIP[status] || STATUS_CHIP.missing}`}
                          >
                            {STATUS_TEXT[status] || status}
                          </span>
                        </td>
                        <td className="py-2 text-royalPurple-text2">{flag?.reason || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
