'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { AlertCircle, BookOpen, Layers, Sparkles, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurriculumStudio } from '@/components/curriculum/CurriculumStudio'
import {
  WeekProgressSidebar,
  type WeekProgressItem,
} from '@/components/teaching/WeekProgressSidebar'
import {
  CoverageAnalytics,
  type CoverageAnalyticsData,
} from '@/components/teaching/CoverageAnalytics'
import { cn } from '@/lib/utils'

type Tab = 'scheme' | 'progress' | 'analytics'

type SchemeOption = {
  id: string
  subject: string
  gradeOrForm: string
  term: string
  year: number
}

type Props = {
  teacherId: string
}

export function TeachingHub({ teacherId }: Props) {
  const [tab, setTab] = useState<Tab>('scheme')
  const [schemes, setSchemes] = useState<SchemeOption[]>([])
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('')
  const [weeks, setWeeks] = useState<WeekProgressItem[]>([])
  const [coveragePercent, setCoveragePercent] = useState(0)
  const [busyWeek, setBusyWeek] = useState<number | null>(null)
  const [analytics, setAnalytics] = useState<CoverageAnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [progressFilter, setProgressFilter] = useState<'all' | 'completed' | 'in-progress'>('all')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tabParam = String(params.get('tab') || '').toLowerCase()
    if (tabParam === 'progress' || tabParam === 'analytics' || tabParam === 'scheme') {
      setTab(tabParam as Tab)
    }
    const schemeId = String(params.get('schemeId') || '').trim()
    if (schemeId) setSelectedSchemeId(schemeId)
    const filter = String(params.get('filter') || '').toLowerCase()
    if (filter === 'completed' || filter === 'in-progress') setProgressFilter(filter)
  }, [])

  const selectedScheme = useMemo(
    () => schemes.find((s) => s.id === selectedSchemeId) || null,
    [schemes, selectedSchemeId]
  )

  const plannerHref = useMemo(() => {
    if (!selectedSchemeId) return '/dashboard/teacher/lesson-planner'
    const next = weeks.find((w) => !w.completed && !(w.isTestWeek || w.isMidTerm || w.isEndOfTerm))
    const qs = new URLSearchParams({ schemeId: selectedSchemeId })
    if (next?.week) qs.set('week', String(next.week))
    return `/dashboard/teacher/lesson-planner?${qs.toString()}`
  }, [selectedSchemeId, weeks])

  const loadSchemes = useCallback(async () => {
    try {
      const res = await fetch('/api/curriculum/scheme', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return
      const list = Array.isArray(json.data) ? json.data : []
      setSchemes(
        list.map((s: SchemeOption) => ({
          id: s.id,
          subject: s.subject,
          gradeOrForm: s.gradeOrForm,
          term: s.term,
          year: s.year,
        }))
      )
      setSelectedSchemeId((prev) => prev || list[0]?.id || '')
    } catch {
      // ignore
    }
  }, [])

  const fetchAnalytics = useCallback(
    async (schemeId?: string) => {
      const id = schemeId || selectedSchemeId
      setAnalyticsLoading(true)
      try {
        const qs = id ? `?schemeId=${encodeURIComponent(id)}` : ''
        const res = await fetch(`/api/teaching/coverage-analytics${qs}`, {
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) return

        setAnalytics({
          completionRate: Number(json.completionRate ?? json.overallCoverage ?? 0),
          completedWeeks: Number(json.completedWeeks ?? 0),
          totalWeeks: Number(json.totalWeeks ?? 0),
          averageMastery: Number(json.averageMastery ?? 0),
          topicsNeedingReteach: Number(json.topicsNeedingReteach ?? 0),
          topics: Array.isArray(json.topics) ? json.topics : [],
          testSchedule: Array.isArray(json.testSchedule) ? json.testSchedule : [],
          schemes: Array.isArray(json.schemes) ? json.schemes : [],
        })

        const focus = Array.isArray(json.schemes) ? json.schemes[0] : null
        if (focus) {
          setCoveragePercent(Number(focus.coveragePercent ?? 0))
          const planned = Array.isArray(focus.plannedTopics) ? focus.plannedTopics : []
          setWeeks(
            planned.map((w: any, i: number) => ({
              week: Number(w.week ?? i + 1),
              topic: String(w.topic || `Week ${w.week ?? i + 1}`),
              completed: Boolean(w.completed),
              completedAt: w.completedAt ?? null,
              isMidTerm: Boolean(w.isMidTerm),
              isEndOfTerm: Boolean(w.isEndOfTerm),
              isTestWeek: Boolean(w.isTestWeek || w.isMidTerm || w.isEndOfTerm),
            }))
          )
        }
      } finally {
        setAnalyticsLoading(false)
      }
    },
    [selectedSchemeId]
  )

  useEffect(() => {
    loadSchemes()
  }, [loadSchemes])

  useEffect(() => {
    if (selectedSchemeId) fetchAnalytics(selectedSchemeId)
  }, [selectedSchemeId, fetchAnalytics])

  const handleToggleWeek = async (weekNumber: number, completed: boolean) => {
    if (!selectedSchemeId) {
      toast.error('Select a scheme first')
      return
    }
    const row = weeks.find((w) => w.week === weekNumber)
    if (row?.isTestWeek || row?.isMidTerm || row?.isEndOfTerm) {
      toast.error('Test weeks are assessment-only — they do not count as teaching coverage')
      return
    }
    setBusyWeek(weekNumber)
    try {
      const res = await fetch('/api/teaching/mark-week-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ schemeId: selectedSchemeId, weekNumber, completed }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error('Failed to update week')
      setCoveragePercent(json.coveragePercent ?? 0)
      setWeeks((prev) =>
        prev.map((w) =>
          w.week === weekNumber
            ? { ...w, completed, completedAt: completed ? new Date().toISOString() : null }
            : w
        )
      )
      toast.success(
        completed ? `Week ${weekNumber} marked complete` : `Week ${weekNumber} unmarked`
      )
      await fetchAnalytics(selectedSchemeId)
    } catch (e) {
      console.warn('[teaching-hub] week toggle failed', e)
      toast.error('Could not update week progress. Please try again.')
    } finally {
      setBusyWeek(null)
    }
  }

  const filteredWeeks = useMemo(() => {
    if (progressFilter === 'completed') return weeks.filter((w) => w.completed)
    if (progressFilter === 'in-progress') return weeks.filter((w) => !w.completed)
    return weeks
  }, [weeks, progressFilter])

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'scheme', label: 'Scheme & Lessons' },
    { id: 'progress', label: 'Progress' },
    { id: 'analytics', label: 'Analytics' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Zap className="h-7 w-7 text-amber-500" />
            Teaching Studio
          </h1>
          <p className="mt-2 text-muted-foreground">
            Unified platform for scheme planning, lesson creation, and progress tracking
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Teacher · {teacherId.slice(0, 8)}…</p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg border p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'scheme' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4" />
                  Active scheme
                </CardTitle>
                <CardDescription>
                  Select an existing scheme or generate a new one below
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1 space-y-1">
                  <Label>Scheme</Label>
                  <Select value={selectedSchemeId || undefined} onValueChange={setSelectedSchemeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scheme" />
                    </SelectTrigger>
                    <SelectContent>
                      {schemes.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.subject} · {s.gradeOrForm} · {s.term} {s.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" onClick={() => loadSchemes()}>
                  Refresh
                </Button>
              </CardContent>
            </Card>

            <CurriculumStudio
              embedded
              onSchemeSaved={(schemeId) => {
                loadSchemes().then(() => {
                  if (schemeId) setSelectedSchemeId(schemeId)
                })
              }}
              onSchemeGenerated={(meta) => {
                if (meta.schemeId) setSelectedSchemeId(meta.schemeId)
                loadSchemes()
              }}
            />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4" />
                  Lesson tools
                </CardTitle>
                <CardDescription>Create lessons and quizzes for this scheme</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Link
                  href={plannerHref}
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  AI Lesson Planner
                </Link>
                <Link
                  href="/dashboard/teacher/curriculum"
                  className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold"
                >
                  Curriculum Studio (lessons)
                </Link>
                <Link
                  href="/dashboard/teacher/quiz-maker"
                  className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold"
                >
                  AI Quiz Maker
                </Link>
                <Link
                  href="/dashboard/teacher/chat"
                  className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold"
                >
                  AI Assistant
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {analytics ? (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Coverage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.completionRate.toFixed(0)}%</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {analytics.completedWeeks}/{analytics.totalWeeks} weeks completed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Avg Mastery</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Number(analytics.averageMastery || 0).toFixed(0)}%
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Student understanding</p>
                  </CardContent>
                </Card>

                {analytics.topicsNeedingReteach > 0 && (
                  <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm text-orange-900">
                        <AlertCircle className="h-4 w-4" />
                        Reteach Needed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-900">
                        {analytics.topicsNeedingReteach}
                      </div>
                      <p className="mt-1 text-xs text-orange-700">Topics below 60%</p>
                    </CardContent>
                  </Card>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setTab('progress')}
                >
                  Track week progress
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setTab('analytics')}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Open full analytics
                </Button>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick stats</CardTitle>
                  <CardDescription>
                    Generate or select a scheme to see coverage and mastery
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {selectedSchemeId && (
              <WeekProgressSidebar
                weeks={filteredWeeks}
                coveragePercent={coveragePercent}
                busyWeek={busyWeek}
                onToggleWeek={handleToggleWeek}
                layout="sidebar"
              />
            )}
          </div>
        </div>
      )}

      {tab === 'progress' &&
        (selectedScheme ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 print:hidden">
              {(
                [
                  ['all', 'All weeks'],
                  ['completed', 'Completed'],
                  ['in-progress', 'In progress'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setProgressFilter(id)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium',
                    progressFilter === id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted text-muted-foreground hover:bg-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <WeekProgressSidebar
              weeks={filteredWeeks}
              coveragePercent={coveragePercent}
              busyWeek={busyWeek}
              onToggleWeek={handleToggleWeek}
              layout="grid"
              title={`${selectedScheme.subject} · ${selectedScheme.gradeOrForm} · ${selectedScheme.term}`}
              description="Teaching weeks only — mid/EOT test weeks are excluded from coverage. Mark taught manually or via approved lesson plans."
            />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Select a Scheme First</CardTitle>
              <CardDescription>
                Generate or select a scheme on the Scheme &amp; Lessons tab to track progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" onClick={() => setTab('scheme')}>
                Go to Scheme &amp; Lessons
              </Button>
            </CardContent>
          </Card>
        ))}

      {tab === 'analytics' && (
        <CoverageAnalytics analytics={analytics} loading={analyticsLoading} />
      )}
    </div>
  )
}
