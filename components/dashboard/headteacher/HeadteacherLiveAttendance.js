'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { percentTextClass } from '@/lib/utils/percentColor'

function percentText(rate) {
  if (rate == null || !Number.isFinite(Number(rate))) return '—'
  return `${Math.round(Number(rate) * 100)}%`
}

export function HeadteacherLiveAttendance() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['headteacher-attendance-live'],
    queryFn: async () => {
      const res = await api.get('/dashboard/headteacher/attendance/live')
      return res?.data
    },
    refetchInterval: 60_000,
  })

  const payload = data?.data || data
  const sessions = Array.isArray(payload?.sessions) ? payload.sessions : []

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
          <Clock className="h-5 w-5 text-royalPurple-accent" aria-hidden="true" />
          Today&apos;s lesson attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-royalPurple-text2 text-sm">Loading live sessions…</p>
        ) : error ? (
          <p className="text-royalPurple-dangerTx text-sm">Could not load live attendance.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-royalPurple-text2 text-sm">
              School-wide present/late rate today:{' '}
              <span
                className={`font-semibold ${percentTextClass(
                  payload?.schoolWideRate != null ? payload.schoolWideRate * 100 : null
                )}`}
              >
                {percentText(payload?.schoolWideRate)}
              </span>
            </p>
            {sessions.length === 0 ? (
              <p className="text-royalPurple-text2 text-sm">
                No lesson sessions recorded today yet.
              </p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {sessions.map((s) => (
                  <li
                    key={s.sessionId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/60 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-royalPurple-text1">
                        {s.className || 'Class'} · {s.subjectName || 'Subject'}
                      </p>
                      <p className="text-royalPurple-text2">
                        {s.teacherName || 'Teacher'}
                        {s.periodLabel ? ` · ${s.periodLabel}` : ''} · {s.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-royalPurple-text2 shrink-0">
                      <Users className="h-4 w-4" aria-hidden="true" />
                      <span>
                        P {s.present} · L {s.late} · A {s.absent}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
