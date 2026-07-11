'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TeacherPerformanceCard,
  downloadCSV,
  generatePerformanceCSV,
  type TeacherPerformanceRow,
} from '@/components/admin/TeacherPerformanceCard'

function getCurrentTerm(): number {
  const month = new Date().getMonth()
  if (month < 5) return 1
  if (month < 9) return 2
  return 3
}

export default function TeachingCoveragePerformancePage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<TeacherPerformanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [term, setTerm] = useState(String(getCurrentTerm()))
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [showLowCompletion, setShowLowCompletion] = useState(false)
  const [showLowMastery, setShowLowMastery] = useState(false)
  const [searchTeacher, setSearchTeacher] = useState('')
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null)

  const fetchTeacherPerformance = useCallback(
    async (refresh = false) => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({
          term,
          academicYear: year,
          ...(refresh ? { refresh: '1' } : {}),
        })
        const res = await fetch(`/api/admin/teacher-performance?${qs}`, {
          credentials: 'include',
        })
        const data = await res.json().catch(() => ({}))
        setTeachers(Array.isArray(data.performance) ? data.performance : [])
      } catch (error) {
        console.error('Error fetching performance data:', error)
        setTeachers([])
      } finally {
        setLoading(false)
      }
    },
    [term, year]
  )

  useEffect(() => {
    fetchTeacherPerformance(true)
  }, [fetchTeacherPerformance])

  const filteredTeachers = useMemo(() => {
    const q = searchTeacher.trim().toLowerCase()
    return teachers.filter((teacher) => {
      if (q) {
        const hay =
          `${teacher.teacherName || ''} ${teacher.teacherEmail || ''} ${teacher.teacherId}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (showLowCompletion && teacher.completionRate >= 80) return false
      if (showLowMastery && teacher.averageMasteryScore >= 70) return false
      return true
    })
  }, [teachers, searchTeacher, showLowCompletion, showLowMastery])

  const avgCompletion =
    teachers.length > 0
      ? teachers.reduce((sum, t) => sum + t.completionRate, 0) / teachers.length
      : 0
  const avgMastery =
    teachers.length > 0
      ? teachers.reduce((sum, t) => sum + t.averageMasteryScore, 0) / teachers.length
      : 0
  const atRisk = teachers.filter((t) => t.completionRate < 80 || t.averageMasteryScore < 70).length

  const handleDownloadReport = (teacher: TeacherPerformanceRow) => {
    const csv = generatePerformanceCSV(teacher)
    const safeName = String(teacher.teacherName || teacher.teacherId)
      .replace(/[^\w.-]+/g, '-')
      .slice(0, 40)
    downloadCSV(csv, `teacher-performance-${safeName}-T${term}-${year}.csv`)
  }

  const handleSendFeedback = (teacher: TeacherPerformanceRow) => {
    const params = new URLSearchParams({
      to: teacher.teacherId,
      name: teacher.teacherName || '',
    })
    router.push(`/dashboard/feedback?${params.toString()}`)
  }

  return (
    <DashboardLayout title="Teaching Coverage">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Teacher Performance Tracking</h1>
            <p className="mt-1 text-muted-foreground">
              Monitor scheme completion and student topic mastery
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchTeacherPerformance(true)}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={term} onValueChange={setTerm}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Term 1</SelectItem>
                    <SelectItem value="2">Term 2</SelectItem>
                    <SelectItem value="3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(
                      (y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-teacher">Search Teacher</Label>
                <Input
                  id="search-teacher"
                  placeholder="Name or email…"
                  value={searchTeacher}
                  onChange={(e) => setSearchTeacher(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border"
                  checked={showLowCompletion}
                  onChange={(e) => setShowLowCompletion(e.target.checked)}
                />
                Show only Completion &lt; 80%
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border"
                  checked={showLowMastery}
                  onChange={(e) => setShowLowMastery(e.target.checked)}
                />
                Show only Mastery &lt; 70%
              </label>
            </div>
          </CardContent>
        </Card>

        {teachers.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Teachers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teachers.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgCompletion.toFixed(0)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Mastery</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgMastery.toFixed(0)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">At Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{atRisk}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">Loading…</CardContent>
            </Card>
          ) : filteredTeachers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                {teachers.length === 0
                  ? 'No teaching coverage data yet. Teachers need schemes with marked weeks and/or quiz mastery records.'
                  : 'No teachers found matching filters'}
              </CardContent>
            </Card>
          ) : (
            filteredTeachers.map((teacher) => (
              <TeacherPerformanceCard
                key={teacher.id}
                teacher={teacher}
                isExpanded={expandedTeacherId === teacher.id}
                onToggleExpand={() =>
                  setExpandedTeacherId(expandedTeacherId === teacher.id ? null : teacher.id)
                }
                onDownloadReport={() => handleDownloadReport(teacher)}
                onSendFeedback={() => handleSendFeedback(teacher)}
              />
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
