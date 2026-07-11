'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Download, Search, TrendingUp, Users, FileText } from 'lucide-react'

function normalizeYear(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return ''
  return String(Math.floor(n))
}

export default function HodTeacherPerformancePage() {
  const [term, setTerm] = useState('All Terms')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [search, setSearch] = useState('')

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['hod-teacher-performance', term, year],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (term && term !== 'All Terms') params.set('term', term)
      const y = normalizeYear(year)
      if (y) params.set('year', y)
      const res = await fetch(`/api/dashboard/hod/teacher-performance?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to load')
      return json
    },
    staleTime: 60 * 1000,
  })

  const data = response?.data || null
  const stats = data?.stats || { totalTeachers: 0, totalResultsEntered: 0, averagePerformance: 0 }

  const filtered = useMemo(() => {
    const rows = Array.isArray(data?.teacherPerformance) ? data.teacherPerformance : []
    const q = String(search || '')
      .trim()
      .toLowerCase()
    if (!q) return rows
    return rows.filter((t) => {
      const name = String(t?.name || '').toLowerCase()
      const email = String(t?.email || '').toLowerCase()
      const dept = String(t?.department || '').toLowerCase()
      const subjects = Array.isArray(t?.subjects) ? t.subjects.join(' ').toLowerCase() : ''
      const classes = Array.isArray(t?.classes) ? t.classes.join(' ').toLowerCase() : ''
      return (
        name.includes(q) ||
        email.includes(q) ||
        dept.includes(q) ||
        subjects.includes(q) ||
        classes.includes(q)
      )
    })
  }, [data?.teacherPerformance, search])

  const onExport = () => {
    const params = new URLSearchParams()
    if (term && term !== 'All Terms') params.set('term', term)
    const y = normalizeYear(year)
    if (y) params.set('year', y)
    window.open(`/api/dashboard/hod/teacher-performance/export?${params.toString()}`, '_blank')
  }

  return (
    <DashboardLayout userRole="hod" title="Teacher Performance">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/hod">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-royalPurple-text1">
                Department Teacher Performance
              </h1>
              <p className="text-royalPurple-text2 text-sm">
                Average score is calculated from results entered by each teacher (not shared across
                teachers).
              </p>
            </div>
          </div>

          <Button onClick={onExport} className="gap-2" variant="outline">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="glass">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-royalPurple-text2 text-sm">Teachers</p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {stats.totalTeachers || 0}
                </p>
              </div>
              <div className="p-3 rounded-full bg-royalPurple-accent">
                <Users className="h-5 w-5 text-royalPurple-accentTx" />
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-royalPurple-text2 text-sm">Average Performance</p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {stats.averagePerformance || 0}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-royalPurple-success">
                <TrendingUp className="h-5 w-5 text-royalPurple-successTx" />
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-royalPurple-text2 text-sm">Results Entered</p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {stats.totalResultsEntered || 0}
                </p>
              </div>
              <div className="p-3 rounded-full bg-royalPurple-pill">
                <FileText className="h-5 w-5 text-royalPurple-pillTx" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-royalPurple-text2 text-sm">Term</p>
                <Select value={term} onValueChange={setTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Terms">All Terms</SelectItem>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-royalPurple-text2 text-sm">Year</p>
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2026"
                />
              </div>
              <div className="space-y-2">
                <p className="text-royalPurple-text2 text-sm">Search</p>
                <div className="relative">
                  <Search className="h-4 w-4 text-royalPurple-text3 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Teacher, subject, class..."
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">
              Department Teachers {data?.department?.name ? `• ${data.department.name}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-royalPurple-text2">Loading...</p>
            ) : isError ? (
              <p className="text-royalPurple-dangerTx">Failed to load teacher performance.</p>
            ) : filtered.length === 0 ? (
              <p className="text-royalPurple-text2">No teachers found for the selected filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-royalPurple-text2 border-b border-royalPurple-border">
                      <th className="py-2 pr-4">Teacher</th>
                      <th className="py-2 pr-4">Avg</th>
                      <th className="py-2 pr-4">Results</th>
                      <th className="py-2 pr-4">Classes</th>
                      <th className="py-2 pr-4">Subjects</th>
                      <th className="py-2 pr-4">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => (
                      <tr key={t.userId} className="border-b border-royalPurple-border/40">
                        <td className="py-3 pr-4">
                          <div className="text-royalPurple-text1 font-medium">{t.name}</div>
                          <div className="text-royalPurple-text2">{t.email}</div>
                        </td>
                        <td className="py-3 pr-4 text-royalPurple-text1 font-semibold">
                          {t.averageScore ?? 0}%
                        </td>
                        <td className="py-3 pr-4 text-royalPurple-text1">
                          {t.resultsEntered ?? 0}
                        </td>
                        <td className="py-3 pr-4 text-royalPurple-text2">
                          {Array.isArray(t.classes) && t.classes.length > 0
                            ? t.classes.join(', ')
                            : '—'}
                        </td>
                        <td className="py-3 pr-4 text-royalPurple-text2">
                          {Array.isArray(t.subjects) && t.subjects.length > 0
                            ? t.subjects.join(', ')
                            : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline" className="gap-2">
                              <Link href="/admin/teacher-performance">Observations</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline" className="gap-2">
                              <Link href="/dashboard/admin/teacher-performance">Coverage</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
