'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'

type PerformanceRow = {
  id: string
  teacherId: string
  teacherName?: string
  completionRate: number
  averageMasteryScore: number
  topicsNeedingReteach: number
  totalSchemesAssigned: number
  topicsNeedingReteachDetails: Array<{
    id: string
    topicName: string
    averageMasteryScore: number
  }>
}

export default function TeachingCoveragePerformancePage() {
  const [performance, setPerformance] = useState<PerformanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const term = new Date().getMonth() < 5 ? 1 : new Date().getMonth() < 9 ? 2 : 3
  const year = new Date().getFullYear()

  const load = async (refresh = false) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        term: String(term),
        academicYear: String(year),
        ...(refresh ? { refresh: '1' } : {}),
      })
      const res = await fetch(`/api/admin/teacher-performance?${qs}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      setPerformance(Array.isArray(data.performance) ? data.performance : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(true)
  }, [])

  return (
    <DashboardLayout title="Teaching Coverage">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Teacher Performance Tracking</h1>
            <p className="text-muted-foreground">
              Scheme coverage and topic mastery · Term {term} {year}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => load(true)} disabled={loading}>
            Refresh
          </Button>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        <div className="space-y-4">
          {!loading && performance.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No teaching coverage data yet. Teachers need schemes with marked weeks and/or quiz
              mastery records.
            </p>
          )}
          {performance.map((teacher) => (
            <Card key={teacher.id}>
              <CardHeader>
                <CardTitle>{teacher.teacherName || teacher.teacherId}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold">{teacher.completionRate.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Mastery</p>
                    <p className="text-2xl font-bold">{teacher.averageMasteryScore.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Topics Needing Reteach</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {teacher.topicsNeedingReteach}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Schemes Assigned</p>
                    <p className="text-2xl font-bold">{teacher.totalSchemesAssigned}</p>
                  </div>
                </div>

                {teacher.topicsNeedingReteachDetails.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 text-sm font-medium">Topics Needing Reteaching:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {teacher.topicsNeedingReteachDetails.map((t) => (
                        <li key={t.id}>
                          • {t.topicName}: {t.averageMasteryScore.toFixed(0)}%
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
