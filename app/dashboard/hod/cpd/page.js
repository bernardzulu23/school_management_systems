'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  GraduationCap,
  Clock,
  Users,
  ArrowLeft,
  Download,
  Filter,
  CheckCircle,
  AlertCircle,
  Target,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function CPDPage() {
  const queryClient = useQueryClient()

  const [selectedTerm, setSelectedTerm] = useState(() => {
    const m = new Date().getMonth()
    if (m <= 3) return 'Term 1'
    if (m <= 7) return 'Term 2'
    return 'Term 3'
  })
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()))
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: teacherProgressData, isLoading } = useQuery({
    queryKey: ['hod-teacher-progress', selectedTerm, selectedYear],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (selectedTerm) qs.set('term', selectedTerm)
      if (selectedYear) qs.set('year', selectedYear)
      const suffix = qs.toString()
      const res = await api.get(`/dashboard/hod/teacher-progress${suffix ? `?${suffix}` : ''}`)
      return res.data
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const teachers = useMemo(() => {
    const all = teacherProgressData?.data?.teachers || []
    if (filterStatus === 'behind') {
      return all.filter((t) => Number(t.cpdHours || 0) < Number(t.cpdTargetHours || 0))
    }
    if (filterStatus === 'scheme-missing') {
      return all.filter((t) => t.schemeSubmitted !== true)
    }
    if (filterStatus === 'records-missing') {
      return all.filter((t) => t.recordsSubmitted !== true)
    }
    return all
  }, [teacherProgressData, filterStatus])

  const updateTeacherProgress = async (teacherId, patch) => {
    await fetch('/api/dashboard/hod/teacher-progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        teacherId,
        term: selectedTerm,
        year: selectedYear,
        ...patch,
      }),
    })
    await queryClient.invalidateQueries({
      queryKey: ['hod-teacher-progress', selectedTerm, selectedYear],
    })
  }

  const exportCsv = () => {
    const rows = [
      ['Teacher', 'Email', 'Scheme Submitted', 'Records Submitted', 'CPD Hours', 'Target Hours'],
      ...teachers.map((t) => [
        t.name || '',
        t.email || '',
        t.schemeSubmitted ? 'Yes' : 'No',
        t.recordsSubmitted ? 'Yes' : 'No',
        String(t.cpdHours ?? 0),
        String(t.cpdTargetHours ?? 10),
      ]),
    ]
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cpd-tracker-${selectedTerm.replace(' ', '-')}-${selectedYear}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const summary = teacherProgressData?.data?.summary
  const totalTeachers = summary?.totalTeachers || 0
  const cpdPercent = summary?.cpdPercent || 0
  const schemePercent = summary?.schemePercent || 0
  const recordsPercent = summary?.recordsPercent || 0

  return (
    <DashboardLayout title="CPD File">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/hod">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center">
                <GraduationCap className="h-6 w-6 mr-2" />
                CPD Tracker ({teacherProgressData?.data?.term || selectedTerm})
              </h1>
              <p className="text-royalPurple-text2">
                Teaching Council of Zambia (TCZ) CPD monitoring for the department
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-royalPurple-card px-3 py-2 rounded-xl border border-royalPurple-border">
              <div>
                <div className="text-xs text-royalPurple-text3 mb-1">Term</div>
                <select
                  className="bg-royalPurple-deep border border-royalPurple-border rounded-lg px-3 py-2 text-sm text-royalPurple-text1 outline-none"
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
              <div>
                <div className="text-xs text-royalPurple-text3 mb-1">Year</div>
                <input
                  className="bg-royalPurple-deep border border-royalPurple-border rounded-lg px-3 py-2 text-sm text-royalPurple-text1 outline-none w-24"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>
            <Button variant="outline" onClick={exportCsv} disabled={teachers.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-royalPurple-accentTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Teachers</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">{totalTeachers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-royalPurple-successTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Schemes</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">{schemePercent}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-royalPurple-pillTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Records</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">{recordsPercent}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-warn" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">CPD %</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">{cpdPercent}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-accent" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Hours</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {summary?.totalCpdHours || 0}/{summary?.totalCpdTarget || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Teacher CPD Progress</CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-royalPurple-text3" />
                <select
                  className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500 bg-royalPurple-card text-royalPurple-text1"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="behind">Behind Target</option>
                  <option value="scheme-missing">Scheme Missing</option>
                  <option value="records-missing">Records Missing</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-royalPurple-text2">Loading…</div>
            ) : teachers.length === 0 ? (
              <div className="text-sm text-royalPurple-text2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                No teachers found for the selected term/year.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-royalPurple-border text-left text-royalPurple-text3">
                      <th className="py-3 pr-4 font-semibold">Teacher</th>
                      <th className="py-3 pr-4 font-semibold">Scheme</th>
                      <th className="py-3 pr-4 font-semibold">Records</th>
                      <th className="py-3 pr-4 font-semibold">CPD Hours</th>
                      <th className="py-3 pr-4 font-semibold">Target</th>
                      <th className="py-3 pr-4 font-semibold">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((t) => {
                      const hours = Number(t.cpdHours || 0)
                      const target = Number(t.cpdTargetHours || 0)
                      const pct =
                        target <= 0 ? 0 : Math.min(Math.round((hours / target) * 100), 100)
                      const progressBarClass =
                        pct >= 90
                          ? 'bg-royalPurple-success'
                          : pct >= 70
                            ? 'bg-warn/100'
                            : 'bg-royalPurple-danger'

                      return (
                        <tr key={t.teacherId} className="border-b border-royalPurple-border/30">
                          <td className="py-3 pr-4">
                            <div className="text-royalPurple-text1 font-medium">{t.name}</div>
                            <div className="text-royalPurple-text3 text-xs">{t.email}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <input
                              type="checkbox"
                              checked={t.schemeSubmitted === true}
                              onChange={(e) =>
                                updateTeacherProgress(t.teacherId, {
                                  schemeSubmitted: e.target.checked,
                                })
                              }
                            />
                          </td>
                          <td className="py-3 pr-4">
                            <input
                              type="checkbox"
                              checked={t.recordsSubmitted === true}
                              onChange={(e) =>
                                updateTeacherProgress(t.teacherId, {
                                  recordsSubmitted: e.target.checked,
                                })
                              }
                            />
                          </td>
                          <td className="py-3 pr-4">
                            <input
                              type="number"
                              min="0"
                              defaultValue={t.cpdHours ?? 0}
                              className="bg-royalPurple-deep border border-royalPurple-border rounded-lg px-3 py-2 text-royalPurple-text1 w-28"
                              onBlur={(e) =>
                                updateTeacherProgress(t.teacherId, { cpdHours: e.target.value })
                              }
                            />
                          </td>
                          <td className="py-3 pr-4">
                            <input
                              type="number"
                              min="0"
                              defaultValue={t.cpdTargetHours ?? 10}
                              className="bg-royalPurple-deep border border-royalPurple-border rounded-lg px-3 py-2 text-royalPurple-text1 w-28"
                              onBlur={(e) =>
                                updateTeacherProgress(t.teacherId, {
                                  cpdTargetHours: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="py-3 pr-4">
                            <div className="w-44">
                              <div className="flex justify-between text-xs text-royalPurple-text3 mb-1">
                                <span>
                                  {hours}/{target}
                                </span>
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full bg-royalPurple-card2 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${progressBarClass}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
