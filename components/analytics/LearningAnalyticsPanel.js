'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, BookOpen, GraduationCap, TrendingUp } from 'lucide-react'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { percentTextClass } from '@/lib/utils/percentColor'

/**
 * Phase 3 learning analytics — headteacher, HOD, teacher, or student view.
 * @param {{ role?: string, department?: string }} props
 */
export function LearningAnalyticsPanel({ role = 'headteacher', department = '' }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['learning-analytics', role, department],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (department) qs.set('department', department)
      const res = await sessionFetch(`/api/dashboard/analytics/learning?${qs}`, {
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to load analytics')
      return json.data
    },
  })

  if (isLoading) {
    return <p className="text-sm text-royalPurple-text2">Loading learning analytics…</p>
  }
  if (error) {
    return <p className="text-sm text-royalPurple-dangerTx">Could not load learning analytics.</p>
  }

  const viewRole = data?.role || role

  if (viewRole === 'student') {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-royalPurple-text1">
            <GraduationCap className="h-5 w-5" />
            My CBC progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.attendance?.rate != null ? (
            <p className="text-sm text-royalPurple-text2">
              Attendance this year:{' '}
              <span className={`font-bold ${percentTextClass(data.attendance.rate)}`}>
                {data.attendance.rate}%
              </span>
            </p>
          ) : null}
          <div>
            <p className="text-xs font-semibold text-royalPurple-text3 uppercase mb-2">
              Subject SBA scores
            </p>
            <ul className="space-y-1 text-sm">
              {(data.subjectProgress || []).map((s, i) => (
                <li key={i} className="flex justify-between">
                  <span>{s.subject}</span>
                  <span className="font-medium">{s.sbaScore ?? '—'}%</span>
                </li>
              ))}
            </ul>
          </div>
          {(data.competencies || []).length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-royalPurple-text3 uppercase mb-2">
                Competencies touched
              </p>
              <div className="flex flex-wrap gap-2">
                {data.competencies.map((c) => (
                  <span
                    key={c.code}
                    className="text-xs px-2 py-1 rounded-full bg-royalPurple-accent/15 border border-royalPurple-border/40"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  if (viewRole === 'hod') {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-royalPurple-text1">
            <BookOpen className="h-5 w-5" />
            Department analytics — {data.department}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-royalPurple-text2">
            ECZ SBA tasks created: {data.eczSbaTasks ?? 0}
          </p>
          <p className="text-xs text-royalPurple-text3">{data.eczAlignmentNote}</p>
          <div>
            <p className="text-xs font-semibold uppercase text-royalPurple-text3 mb-2">
              Lesson plan submissions
            </p>
            <ul className="space-y-2 text-sm max-h-48 overflow-y-auto">
              {(data.lessonPlanSubmission || []).map((t) => (
                <li
                  key={t.teacherName}
                  className="flex justify-between border-b border-royalPurple-border/30 pb-1"
                >
                  <span>{t.teacherName}</span>
                  <span>
                    {t.approved}/{t.total} approved
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-royalPurple-text1">
          <BarChart3 className="h-5 w-5" />
          Learning analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-royalPurple-border/40 p-3">
            <p className="text-xs text-royalPurple-text3">Lesson plans approved</p>
            <p className="text-xl font-bold text-royalPurple-text1">
              {data.lessonPlans?.approvalRate ?? 0}%
            </p>
          </div>
          <div className="rounded-xl border border-royalPurple-border/40 p-3">
            <p className="text-xs text-royalPurple-text3">SBA scores recorded</p>
            <p className="text-xl font-bold text-royalPurple-text1">{data.sba?.totalScores ?? 0}</p>
          </div>
          <div className="rounded-xl border border-royalPurple-border/40 p-3">
            <p className="text-xs text-royalPurple-text3">Subjects tracked</p>
            <p className="text-xl font-bold text-royalPurple-text1">
              {data.sba?.subjectDistributions?.length ?? 0}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-royalPurple-text3 mb-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            SBA by subject
          </p>
          <ul className="space-y-2 text-sm max-h-56 overflow-y-auto">
            {(data.sba?.subjectDistributions || []).map((s) => (
              <li
                key={s.subjectId}
                className="flex justify-between items-center border-b border-royalPurple-border/30 pb-1"
              >
                <span>{s.subjectName}</span>
                <span className="font-medium">
                  avg {s.average}% · n={s.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
