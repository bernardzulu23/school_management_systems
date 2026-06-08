'use client'

/**
 * Headteacher real-time attendance overview — auto-refreshes every 2 minutes.
 */
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, Clock, RefreshCw, Users } from 'lucide-react'
import { percentTextClass } from '@/lib/utils/percentColor'

function rateColor(rate) {
  if (rate == null || !Number.isFinite(Number(rate))) return 'text-royalPurple-text2'
  const n = Number(rate)
  if (n >= 90) return 'text-royalPurple-successTx'
  if (n >= 75) return 'text-amber-600'
  return 'text-royalPurple-dangerTx'
}

export function LiveAttendanceSummary() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['attendance-live'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/attendance-live', {
        credentials: 'include',
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load live attendance')
      return json
    },
    refetchInterval: 120_000,
  })

  const rate = data?.attendanceRate

  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
          <Clock className="h-5 w-5 text-royalPurple-accent" aria-hidden />
          Live attendance — today
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="zsms-hover-raise"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <p className="text-sm text-royalPurple-text2">Loading live attendance…</p>
        ) : error ? (
          <p className="text-sm text-royalPurple-dangerTx">Could not load live attendance.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/50 p-3">
                <p className="text-xs text-royalPurple-text3">Attendance rate</p>
                <p className={`text-2xl font-bold ${rateColor(rate)}`}>
                  {rate != null ? `${rate}%` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/50 p-3">
                <p className="text-xs text-royalPurple-text3">Classes marked</p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {data.classesWithAttendance ?? 0}/{data.totalClasses ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/50 p-3">
                <p className="text-xs text-royalPurple-text3">Present / late</p>
                <p className="text-2xl font-bold text-royalPurple-successTx">
                  {(data.presentToday ?? 0) + (data.lateToday ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/50 p-3">
                <p className="text-xs text-royalPurple-text3">Absent today</p>
                <p className="text-2xl font-bold text-royalPurple-dangerTx">
                  {data.absentToday ?? 0}
                </p>
              </div>
            </div>

            {data.currentPeriod?.isActive ? (
              <div className="rounded-xl border border-royalPurple-accent/40 bg-royalPurple-accent/10 px-4 py-3 text-sm text-royalPurple-text1">
                <strong>
                  {data.currentPeriod.label} · {data.currentPeriod.timeRange}
                </strong>
                <span className="text-royalPurple-text3 ml-2">
                  ({data.currentPeriod.weekday}, {data.currentPeriod.localTime} Lusaka)
                </span>
              </div>
            ) : data.currentPeriod?.nextPeriod ? (
              <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/40 px-4 py-3 text-sm text-royalPurple-text2">
                Between periods — next: Period {data.currentPeriod.nextPeriod}
                {data.currentPeriod.nextTimeRange ? ` · ${data.currentPeriod.nextTimeRange}` : ''}
              </div>
            ) : null}

            {(data.classesNotStarted ?? 0) > 0 ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                <strong>{data.classesNotStarted}</strong> class
                {data.classesNotStarted === 1 ? '' : 'es'} have not started attendance today.
              </div>
            ) : null}

            {Array.isArray(data.chronicallyAbsent) && data.chronicallyAbsent.length > 0 ? (
              <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/40 p-4">
                <p className="text-sm font-semibold text-royalPurple-text1 flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Chronic absentees (3+ absences)
                </p>
                <ul className="text-sm text-royalPurple-text2 space-y-1 max-h-32 overflow-y-auto">
                  {data.chronicallyAbsent.map((c) => (
                    <li key={`${c.studentId}-${c.subjectName}`}>
                      {c.studentName}
                      {c.subjectName ? ` · ${c.subjectName}` : ''} ({c.absenceCount} absences)
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(data.sessions) && data.sessions.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-royalPurple-text3 uppercase mb-2">
                  Lesson sessions today
                </p>
                <ul className="space-y-2 max-h-56 overflow-y-auto">
                  {data.sessions.map((s) => (
                    <li
                      key={s.sessionId}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2 text-sm ${
                        s.isCurrentPeriod
                          ? 'border-royalPurple-accent/60 bg-royalPurple-accent/15 ring-1 ring-royalPurple-accent/30'
                          : 'border-royalPurple-border/40 bg-royalPurple-card/60'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-royalPurple-text1">
                          {s.className} · {s.subjectName}
                        </p>
                        <p className="text-royalPurple-text3 text-xs">
                          {s.teacherName}
                          {s.periodLabel ? ` · ${s.periodLabel}` : ''}
                          {s.isCurrentPeriod ? ' · now' : ''}
                        </p>
                      </div>
                      <span className="text-royalPurple-text2 shrink-0 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />P{s.present} L{s.late} A{s.absent}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-royalPurple-text2">
                No lesson sessions recorded yet today.
              </p>
            )}

            {Array.isArray(data.classes) && data.classes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.classes.map((c) => (
                  <span
                    key={c.classId}
                    className={`text-xs px-2 py-1 rounded-full border ${
                      c.hasAttendance
                        ? 'border-royalPurple-success/40 bg-royalPurple-success/10 text-royalPurple-successTx'
                        : 'border-royalPurple-border/40 bg-royalPurple-muted/40 text-royalPurple-text3'
                    }`}
                  >
                    {c.className}
                    {c.hasAttendance ? ' ✓' : ' · pending'}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
