'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  BarChart3,
  Users,
  Award,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { percentTextClass } from '@/lib/utils/percentColor'

function currentTermLabel() {
  const month = new Date().getMonth()
  if (month < 4) return 'Term 1'
  if (month < 8) return 'Term 2'
  return 'Term 3'
}

const COLORS = [
  'var(--color-accent)',
  'var(--warn-color)',
  'var(--color-kpi-pass)',
  'var(--danger-color)',
  'var(--color-ink)',
]

export default function TeacherExamAnalysisPage() {
  const [selectedTerm, setSelectedTerm] = useState(currentTermLabel)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedResultType, setSelectedResultType] = useState('all')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['teacher-exam-analysis', selectedTerm, selectedYear, selectedResultType],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('term', selectedTerm)
      params.set('year', String(selectedYear))
      if (selectedResultType !== 'all') params.set('resultType', selectedResultType)
      const res = await fetch(`/api/dashboard/teacher/exam-analysis?${params.toString()}`, {
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to load analysis')
      return json?.data || null
    },
  })

  const resultTypeOptions = useMemo(() => {
    const fromApi = Array.isArray(data?.availableResultTypes) ? data.availableResultTypes : []
    return [{ value: 'all', label: 'All result types' }, ...fromApi]
  }, [data?.availableResultTypes])

  const stats = data?.stats || {
    totalStudents: 0,
    averageScore: 0,
    passRate: 0,
    resultCount: 0,
  }
  const subjects = data?.subjects || []
  const byClass = data?.byClass || []
  const gradeDistribution = data?.gradeDistribution || []
  const assessmentBreakdown = data?.assessmentBreakdown || []

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/teacher">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-ink)]">My exam analysis</h1>
              <p className="text-sm text-[var(--color-muted)]">
                Separate views for each tracked result type and assessment kind you enter.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            className="rounded border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
          <select
            className="rounded border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[0, 1, 2].map((offset) => {
              const y = new Date().getFullYear() - offset
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            })}
          </select>
          <select
            className="rounded border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            value={selectedResultType}
            onChange={(e) => setSelectedResultType(e.target.value)}
          >
            {resultTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-[var(--color-muted)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading analysis…
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-6 text-[var(--danger-color)]">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p>{error?.message || 'Failed to load'}</p>
                <Button className="mt-2" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4" /> Students
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{stats.totalStudents}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <BarChart3 className="h-4 w-4" /> Average
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{stats.averageScore}%</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Award className="h-4 w-4" /> Pass rate
                  </CardTitle>
                </CardHeader>
                <CardContent
                  className={`text-2xl font-semibold ${percentTextClass(stats.passRate)}`}
                >
                  {stats.passRate}%
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <ClipboardList className="h-4 w-4" /> Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{stats.resultCount}</CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>By subject</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  {subjects.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted)]">No results for this filter.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjects}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="average" name="Average %" fill="var(--color-accent)" />
                        <Bar dataKey="passRate" name="Pass %" fill="var(--color-kpi-pass)" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grade distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  {gradeDistribution.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted)]">No grades yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={gradeDistribution}
                          dataKey="count"
                          nameKey="grade"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ grade, percentage }) => `${grade} (${percentage}%)`}
                        >
                          {gradeDistribution.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>By class</CardTitle>
              </CardHeader>
              <CardContent>
                {byClass.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)]">No class breakdown.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-[var(--color-muted)]">
                          <th className="py-2 pr-4">Class</th>
                          <th className="py-2 pr-4">Students</th>
                          <th className="py-2 pr-4">Average</th>
                          <th className="py-2 pr-4">Pass rate</th>
                          <th className="py-2">Results</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byClass.map((row) => (
                          <tr key={row.className} className="border-b border-[var(--color-border)]">
                            <td className="py-2 pr-4 font-medium">{row.className}</td>
                            <td className="py-2 pr-4">{row.students}</td>
                            <td className="py-2 pr-4">{row.average}%</td>
                            <td className={`py-2 pr-4 ${percentTextClass(row.passRate)}`}>
                              {row.passRate}%
                            </td>
                            <td className="py-2">{row.resultCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assessment papers by type</CardTitle>
                <p className="text-sm font-normal text-[var(--color-muted)]">
                  Types come from assessments you created (quiz, exam, assignment, …) — not a fixed
                  list.
                </p>
              </CardHeader>
              <CardContent>
                {assessmentBreakdown.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)]">No assessments created yet.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {assessmentBreakdown.map((row) => (
                      <div
                        key={row.type}
                        className="rounded border border-[var(--color-border)] p-3"
                      >
                        <p className="font-semibold capitalize">{row.label || row.type}</p>
                        <p className="text-sm text-[var(--color-muted)]">
                          {row.count} paper{row.count === 1 ? '' : 's'} · {row.assignments}{' '}
                          assignment{row.assignments === 1 ? '' : 's'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
