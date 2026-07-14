'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, BarChart3, ClipboardList, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { percentTextClass } from '@/lib/utils/percentColor'

function statusLabel(ok) {
  return ok ? 'Submitted' : 'Pending'
}

export default function MonitoringPage() {
  const year = new Date().getFullYear()
  const month = new Date().getMonth()
  const term = month <= 3 ? 'Term 1' : month <= 7 ? 'Term 2' : 'Term 3'

  const { data: progressPayload, isLoading: progressLoading } = useQuery({
    queryKey: ['hod-teacher-progress-monitoring', term, year],
    queryFn: async () => {
      const qs = new URLSearchParams({ term, year: String(year) })
      const res = await api.get(`/dashboard/hod/teacher-progress?${qs}`)
      return res.data
    },
    staleTime: 60 * 1000,
  })

  const { data: performancePayload, isLoading: perfLoading } = useQuery({
    queryKey: ['hod-teacher-performance-monitoring', term, year],
    queryFn: async () => {
      const qs = new URLSearchParams({ term, year: String(year) })
      const res = await api.get(`/dashboard/hod/teacher-performance?${qs}`)
      return res.data
    },
    staleTime: 60 * 1000,
  })

  const progressRows = useMemo(() => {
    const body = progressPayload?.data ?? progressPayload ?? {}
    if (Array.isArray(body)) return body
    if (Array.isArray(body?.teachers)) return body.teachers
    if (Array.isArray(body?.data?.teachers)) return body.data.teachers
    return []
  }, [progressPayload])

  const performanceRows = useMemo(() => {
    const body = performancePayload?.data ?? performancePayload ?? {}
    if (Array.isArray(body)) return body
    if (Array.isArray(body?.teacherPerformance)) return body.teacherPerformance
    if (Array.isArray(body?.teachers)) return body.teachers
    if (Array.isArray(body?.rows)) return body.rows
    if (Array.isArray(body?.data?.teacherPerformance)) return body.data.teacherPerformance
    return []
  }, [performancePayload])

  const summary = progressPayload?.data?.summary ?? progressPayload?.summary ?? null

  return (
    <DashboardLayout title="Monitoring File">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/dashboard/hod"
            className="inline-flex items-center gap-2 text-royalPurple-text2 hover:text-royalPurple-text1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to HOD Dashboard
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/hod/teacher-performance">
              <Button className="bg-royalPurple-pill text-royalPurple-text1">
                Teacher Performance
              </Button>
            </Link>
            <Link href="/dashboard/hod/cpd">
              <Button variant="outline">CPD File</Button>
            </Link>
            <Link href="/dashboard/hod/exam-analysis">
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Exam Analysis
              </Button>
            </Link>
          </div>
        </div>

        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Scheme submitted', `${summary.schemePercent ?? 0}%`],
              ['Records submitted', `${summary.recordsPercent ?? 0}%`],
              ['CPD progress', `${summary.cpdPercent ?? 0}%`],
              ['Teachers', String(summary.totalTeachers ?? 0)],
            ].map(([label, value]) => (
              <Card key={label} variant="glass">
                <CardContent className="p-4">
                  <p className="text-xs text-royalPurple-text3">{label}</p>
                  <p className="text-xl font-semibold text-royalPurple-text1">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-royalPurple-text1">
              <UserCheck className="h-5 w-5" />
              Teacher Monitoring Status · {term} {year}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-royalPurple-text2 text-sm">
              Live Schemes / Records / CPD progress and performance scores for teachers in your
              department.
            </p>
            {(progressLoading || perfLoading) && (
              <p className="text-sm text-royalPurple-text3">Loading monitoring data…</p>
            )}

            <div className="overflow-x-auto rounded-xl border border-royalPurple-border/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-royalPurple-border/40 text-left text-royalPurple-text2">
                    <th className="p-3">Teacher</th>
                    <th className="p-3">Scheme</th>
                    <th className="p-3">Record of work</th>
                    <th className="p-3">CPD</th>
                    <th className="p-3">Avg score</th>
                  </tr>
                </thead>
                <tbody>
                  {progressRows.length === 0 && !progressLoading ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-royalPurple-text3">
                        No teacher progress rows yet. Teachers appear after department assignment.
                      </td>
                    </tr>
                  ) : (
                    progressRows.map((row) => {
                      const teacherId = String(row.teacherId || row.userId || row.id || '')
                      const perf = performanceRows.find(
                        (p) =>
                          String(p.teacherId || p.userId || p.id || '') === teacherId ||
                          String(p.name || '') === String(row.name || '')
                      )
                      const cpdHours = Number(row.cpdHours) || 0
                      const cpdTarget = Number(row.cpdTargetHours) || 0
                      const cpdPct =
                        cpdTarget > 0
                          ? Math.round((Math.min(cpdHours, cpdTarget) / cpdTarget) * 100)
                          : 0
                      const avg =
                        Number(
                          perf?.averageScore ??
                            perf?.completionRate ??
                            perf?.score ??
                            row.averageScore ??
                            0
                        ) || 0
                      return (
                        <tr
                          key={teacherId || row.name}
                          className="border-b border-royalPurple-border/20"
                        >
                          <td className="p-3 font-medium text-royalPurple-text1">
                            {row.name || row.teacherName || 'Teacher'}
                          </td>
                          <td className="p-3 text-royalPurple-text2">
                            {statusLabel(row.schemeSubmitted === true)}
                          </td>
                          <td className="p-3 text-royalPurple-text2">
                            {statusLabel(row.recordsSubmitted === true)}
                          </td>
                          <td className={`p-3 ${percentTextClass(cpdPct)}`}>
                            {cpdHours}/{cpdTarget}h ({cpdPct}%)
                          </td>
                          <td className={`p-3 font-semibold ${percentTextClass(avg)}`}>{avg}%</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/hod/lesson-plans">
                <Button variant="outline">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Pending lesson plans
                </Button>
              </Link>
              <Link href="/dashboard/hod/quizzes">
                <Button variant="outline">Pending quizzes</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
