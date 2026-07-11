'use client'

import { AlertCircle, AlertTriangle, BarChart3, Target, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type CoverageTopic = {
  id: string
  topicName: string
  averageMasteryScore: number
  studentCount?: number
  assessmentsCount?: number
  needsReteaching?: boolean
}

export type CoverageScheme = {
  schemeId: string
  subject: string
  gradeOrForm: string
  term: string
  year: number
  coveragePercent: number
  completedWeeks: number
  totalWeeks: number
  midTermWeek: number | null
  endOfTermWeek: number | null
  averageMastery: number | null
  topicsNeedingReteach: CoverageTopic[]
  topics?: CoverageTopic[]
  testSchedule?: Array<{ id: string; testType: string; scheduledWeek: number }>
}

export type CoverageAnalyticsData = {
  completionRate: number
  completedWeeks: number
  totalWeeks: number
  averageMastery: number
  topicsNeedingReteach: number
  topics: CoverageTopic[]
  testSchedule: Array<{ id: string; testType: string; scheduledWeek: number }>
  schemes?: CoverageScheme[]
}

type Props = {
  /** Rich analytics object (preferred) */
  analytics?: CoverageAnalyticsData | null
  /** Legacy props still supported */
  overallCoverage?: number
  schemes?: CoverageScheme[]
  topicsNeedingReteach?: CoverageTopic[]
  loading?: boolean
}

function getRecommendation(score: number) {
  if (score >= 80) return { text: 'Excellent', color: 'text-emerald-700', bg: 'bg-emerald-50' }
  if (score >= 60) return { text: 'Satisfactory', color: 'text-amber-700', bg: 'bg-amber-50' }
  return { text: 'Needs Reteaching', color: 'text-red-700', bg: 'bg-red-50' }
}

export function CoverageAnalytics({
  analytics,
  overallCoverage,
  schemes = [],
  topicsNeedingReteach = [],
  loading,
}: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading coverage analytics…
        </CardContent>
      </Card>
    )
  }

  const completionRate = analytics?.completionRate ?? overallCoverage ?? 0
  const completedWeeks = analytics?.completedWeeks ?? 0
  const totalWeeks = analytics?.totalWeeks ?? 0
  const averageMastery = analytics?.averageMastery ?? 0
  const reteachCount = analytics?.topicsNeedingReteach ?? topicsNeedingReteach.length ?? 0
  const topics = analytics?.topics?.length ? analytics.topics : topicsNeedingReteach
  const topicsSorted = [...topics].sort((a, b) => a.averageMasteryScore - b.averageMasteryScore)
  const testSchedule = analytics?.testSchedule ?? []
  const schemeCards = analytics?.schemes?.length ? analytics.schemes : schemes

  const hasData =
    schemeCards.length > 0 || topicsSorted.length > 0 || completionRate > 0 || totalWeeks > 0

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Analytics Available</CardTitle>
          <CardDescription>
            Generate a scheme and mark weeks complete to see analytics
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Scheme Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completionRate.toFixed(0)}%</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {completedWeeks} of {totalWeeks || '—'} weeks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Avg Mastery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Number(averageMastery || 0).toFixed(0)}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Student avg performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Reteach Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{reteachCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Topics below 60%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Topic-by-Topic Breakdown
          </CardTitle>
          <CardDescription>Mastery levels and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topicsSorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assessment data yet</p>
            ) : (
              topicsSorted.map((topic) => {
                const rec = getRecommendation(topic.averageMasteryScore)
                return (
                  <div key={topic.id} className={`rounded-lg p-3 ${rec.bg}`}>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{topic.topicName}</p>
                        <p className="text-xs text-muted-foreground">
                          {topic.studentCount ?? 0} students · {topic.assessmentsCount ?? 0}{' '}
                          assessments
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${rec.color}`}>
                          {topic.averageMasteryScore.toFixed(0)}%
                        </div>
                        <p className={`text-xs font-medium ${rec.color}`}>{rec.text}</p>
                      </div>
                    </div>
                    {topic.needsReteaching && (
                      <div className="mt-2 flex items-start gap-2 border-t border-red-200 pt-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                        <p className="text-xs text-red-700">
                          Consider re-teaching this topic next week or extending practice
                        </p>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {testSchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Test Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testSchedule.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between rounded bg-muted/60 p-2"
                >
                  <span className="text-sm font-medium">
                    {String(test.testType).replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-muted-foreground">Week {test.scheduledWeek}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {schemeCards.length > 1 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4" />
            All schemes
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {schemeCards.map((s) => (
              <Card key={s.schemeId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {s.subject} · {s.gradeOrForm}
                  </CardTitle>
                  <CardDescription>
                    {s.term} {s.year}
                    {s.midTermWeek != null ? ` · Mid-term W${s.midTermWeek}` : ''}
                    {s.endOfTermWeek != null ? ` · EOT W${s.endOfTermWeek}` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Coverage</span>
                    <span className="font-semibold">
                      {s.coveragePercent}% ({s.completedWeeks}/{s.totalWeeks})
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${s.coveragePercent}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {topicsNeedingReteach.length > 0 && !analytics && (
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              Topics needing reteaching (&lt;60%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {topicsNeedingReteach.map((t) => (
                <li key={t.id}>
                  • {t.topicName}: {t.averageMasteryScore.toFixed(0)}%
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
