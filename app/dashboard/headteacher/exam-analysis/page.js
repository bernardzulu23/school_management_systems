'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { BarChart3, Users, Award, ArrowLeft, Loader2, AlertTriangle, Building2 } from 'lucide-react'
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

export default function HeadteacherExamAnalysisPage() {
  const [selectedTerm, setSelectedTerm] = useState(currentTermLabel)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedResultType, setSelectedResultType] = useState('all')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ht-exam-analysis', selectedTerm, selectedYear, selectedResultType],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('term', selectedTerm)
      params.set('year', String(selectedYear))
      if (selectedResultType !== 'all') params.set('resultType', selectedResultType)
      const res = await fetch(`/api/dashboard/headteacher/exam-analysis?${params.toString()}`, {
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
  const byDepartment = data?.byDepartment || []
  const byResultType = data?.byResultType || []
  const gradeDistribution = data?.gradeDistribution || []

  return (
    <DashboardLayout title="Exam analysis">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/headteacher">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
                School-wide exam analysis
              </h1>
              <p className="text-sm text-[var(--color-muted)]">
                Termly results across subjects, classes, and departments. Teachers and HODs have
                their own scoped analysis pages.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            className="rounded border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-surface-2)]"
            href="/dashboard/teacher/exam-analysis"
          >
            Teacher analysis
          </Link>
          <Link
            className="rounded border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-surface-2)]"
            href="/dashboard/hod/exam-analysis"
          >
            Department (HOD) analysis
          </Link>
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
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
                    <Users className="h-4 w-4" /> Pupils with results
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{stats.totalStudents}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
                    <BarChart3 className="h-4 w-4" /> Entries
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{stats.resultCount}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
                    <Award className="h-4 w-4" /> Average
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{stats.averageScore}%</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[var(--color-muted)]">
                    Pass rate
                  </CardTitle>
                </CardHeader>
                <CardContent className={`text-2xl font-bold ${percentTextClass(stats.passRate)}`}>
                  {stats.passRate}%
                </CardContent>
              </Card>
            </div>

            {byDepartment.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" /> By department
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byDepartment}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="departmentName" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="average" name="Average %" fill="var(--color-accent)" />
                      <Bar dataKey="passRate" name="Pass %" fill="var(--color-kpi-pass)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : null}

            {subjects.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By subject</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
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
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              {byClass.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By class</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                      {byClass.map((row) => (
                        <li key={row.className} className="flex justify-between gap-3">
                          <span>{row.className}</span>
                          <span>
                            avg {row.average}% · pass {row.passRate}% · n={row.resultCount}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}

              {byResultType.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By result type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                      {byResultType.map((row) => (
                        <li key={row.resultType} className="flex justify-between gap-3">
                          <span>{row.label}</span>
                          <span>
                            avg {row.average}% · pass {row.passRate}% · n={row.resultCount}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            {gradeDistribution.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Grade distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gradeDistribution}
                        dataKey="count"
                        nameKey="grade"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ grade, percentage }) => `${grade} ${percentage}%`}
                      >
                        {gradeDistribution.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : null}

            {!stats.resultCount ? (
              <p className="text-sm text-[var(--color-muted)]">
                No results found for this term/year. Enter secondary grades first, then refresh.
              </p>
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
