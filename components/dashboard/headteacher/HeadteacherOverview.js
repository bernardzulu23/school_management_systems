import React, { memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  AlertCircle,
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle,
  Award,
  FileBarChart,
  BookOpen,
  UserPlus,
  GraduationCap,
  FileText,
  Plus,
  Clock,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { HeadteacherStats } from './HeadteacherStats'
import { useHeadteacher } from '@/lib/context/HeadteacherContext'
import { StudentRosterCard } from '@/components/dashboard/StudentRosterCard'
import { TimetableSummary } from '@/components/dashboard/TimetableSummary'
import { LiveAttendanceSummary } from '@/components/headteacher/LiveAttendanceSummary'
import { LearningAnalyticsPanel } from '@/components/analytics/LearningAnalyticsPanel'
import { HeadteacherChronicAbsentees } from './HeadteacherChronicAbsentees'
import { percentTextClass } from '@/lib/utils/percentColor'
import Link from 'next/link'
import { sessionFetch } from '@/lib/auth/sessionFetch'

export const HeadteacherOverview = memo(function HeadteacherOverview() {
  const { dashboardData, schoolStats, setActiveTab, subjectPerformanceData } = useHeadteacher()

  const { data: complianceData } = useQuery({
    queryKey: ['teacher-compliance-overview'],
    queryFn: async () => {
      const res = await sessionFetch('/api/dashboard/teacher-compliance', {
        credentials: 'include',
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return null
      return json.data
    },
    staleTime: 120_000,
  })

  const hasResults = !!dashboardData
  const performanceTrends = Array.isArray(dashboardData?.performanceTrends)
    ? dashboardData.performanceTrends
    : Array.isArray(dashboardData?.performance_trends)
      ? dashboardData.performance_trends
      : []

  const percentText = (value) => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'string' && value.trim() === '—') return '—'
    const n = Number(value)
    if (!Number.isFinite(n)) return '—'
    return `${n}%`
  }

  return (
    <div className="space-y-8">
      {/* Critical Alert Banner */}
      {dashboardData?.students_requiring_attention?.length > 0 && (
        <div className="backdrop-blur-lg bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="backdrop-blur-md bg-royalPurple-danger/60 border border-royalPurple-border/50 rounded-2xl p-3 mr-4">
                <AlertCircle className="h-8 w-8 text-royalPurple-text1" />
              </div>
              <div>
                <h3 className="font-bold text-royalPurple-text1 text-xl">
                  {dashboardData.students_requiring_attention.length} Students Require Immediate
                  Attention
                </h3>
                <p className="text-royalPurple-dangerTx mt-1">
                  Students scoring below 40% need urgent academic intervention
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('student-attention')}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-royalPurple-text1 font-bold py-3 px-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Stats Cards */}
      <div className="bg-royalPurple-deep border border-royalPurple-border rounded-2xl p-4">
        <HeadteacherStats schoolStats={schoolStats} />
      </div>

      <TimetableSummary userRole="headteacher" className="max-w-none" />

      <LiveAttendanceSummary />

      {(complianceData?.summary?.missingAssessments || 0) > 0 && (
        <div className="backdrop-blur-lg bg-warn/10 border border-warn/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-royalPurple-text1">
            {complianceData.summary.missingAssessments} teacher
            {complianceData.summary.missingAssessments === 1 ? '' : 's'} have not recorded
            assessments this term.
          </p>
          <Link
            href="/dashboard/assessments"
            className="text-sm font-semibold text-royalPurple-accentTx hover:underline shrink-0"
          >
            View compliance
          </Link>
        </div>
      )}

      <LearningAnalyticsPanel role="headteacher" />

      <HeadteacherChronicAbsentees />

      {/* School Performance Overview */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1 flex items-center">
            <BarChart3 className="h-6 w-6 mr-3 text-royalPurple-accent" aria-hidden="true" />
            School Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-royalPurple-card border border-royalPurple-border rounded-xl p-4 text-center">
                <div className="bg-royalPurple-card2 rounded-lg p-3 w-fit mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-royalPurple-accent" />
                </div>
                <h3 className="text-royalPurple-text1 font-semibold">Student Achievement</h3>
                <p
                  className={`text-2xl font-bold mt-2 ${percentTextClass(schoolStats.studentAchievement)}`}
                >
                  {percentText(schoolStats.studentAchievement)}
                </p>
                <p className="text-royalPurple-text2 text-sm mt-1">
                  % of students with average ≥40%
                </p>
              </div>
              <div className="bg-royalPurple-card border border-royalPurple-border rounded-xl p-4 text-center">
                <div className="bg-royalPurple-card2 rounded-lg p-3 w-fit mx-auto mb-4">
                  <Users className="h-8 w-8 text-royalPurple-accent" />
                </div>
                <h3 className="text-royalPurple-text1 font-semibold">Teacher Effectiveness</h3>
                <p
                  className={`text-2xl font-bold mt-2 ${percentTextClass(schoolStats.teacherEffectiveness)}`}
                >
                  {percentText(schoolStats.teacherEffectiveness)}
                </p>
                <p className="text-royalPurple-text2 text-sm mt-1">Based on student performance</p>
              </div>
              <div className="bg-royalPurple-card border border-royalPurple-border rounded-xl p-4 text-center">
                <div className="bg-royalPurple-card2 rounded-lg p-3 w-fit mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-royalPurple-accent" />
                </div>
                <h3 className="text-royalPurple-text1 font-semibold">Attendance Rate</h3>
                <p
                  className={`text-2xl font-bold mt-2 ${percentTextClass(schoolStats.attendanceRate)}`}
                >
                  {percentText(schoolStats.attendanceRate)}
                </p>
                <p className="text-royalPurple-text2 text-sm mt-1">Selected period</p>
              </div>
              <div className="bg-royalPurple-card border border-royalPurple-border rounded-xl p-4 text-center">
                <div className="bg-royalPurple-card2 rounded-lg p-3 w-fit mx-auto mb-4">
                  <Award className="h-8 w-8 text-royalPurple-accent" />
                </div>
                <h3 className="text-royalPurple-text1 font-semibold">Pass Rate</h3>
                <p className={`text-2xl font-bold mt-2 ${percentTextClass(schoolStats.passRate)}`}>
                  {percentText(schoolStats.passRate)}
                </p>
                <p className="text-royalPurple-text2 text-sm mt-1">
                  % of result entries with score ≥40%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Analytics */}
      {hasResults && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center">
              <FileBarChart className="h-6 w-6 mr-3 text-royalPurple-accent" aria-hidden="true" />
              School Performance Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* School Performance Trends */}
                <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                  <h3 className="text-royalPurple-text1 font-bold text-lg mb-4 flex items-center">
                    <TrendingUp
                      className="h-5 w-5 mr-2 text-royalPurple-accent"
                      aria-hidden="true"
                    />
                    Performance Trends by Term
                  </h3>
                  {performanceTrends.length > 0 ? (
                    <div className="h-64 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                          <XAxis dataKey="term" stroke="rgba(203,213,225,0.8)" />
                          <YAxis domain={[0, 100]} stroke="rgba(203,213,225,0.8)" />
                          <Tooltip
                            contentStyle={{
                              background: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid rgba(148, 163, 184, 0.25)',
                              borderRadius: 12,
                              color: 'rgba(226, 232, 240, 0.95)',
                            }}
                          />
                          <Bar
                            dataKey="average"
                            fill="rgba(124, 58, 237, 0.9)"
                            radius={[8, 8, 0, 0]}
                          />
                          <Bar
                            dataKey="passRate"
                            fill="rgba(34, 197, 94, 0.85)"
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg p-6 text-center">
                      <div>
                        <BarChart3
                          className="h-12 w-12 text-royalPurple-accent mx-auto mb-4"
                          aria-hidden="true"
                        />
                        <p className="text-royalPurple-text1 font-semibold">
                          No performance trend data yet
                        </p>
                        <p className="text-royalPurple-text2 text-sm mt-1">
                          Add results to see term-by-term charts here.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subject Performance */}
                <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                  <h3 className="text-royalPurple-text1 font-bold text-lg mb-4 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-royalPurple-accent" aria-hidden="true" />
                    Subject Pass Rate (≥40%)
                  </h3>
                  <div className="space-y-4">
                    {subjectPerformanceData?.slice(0, 5).map((subject, index) => {
                      const performance = subject.score
                      return (
                        <div
                          key={index}
                          className="p-3 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-royalPurple-text1 font-semibold text-sm">
                              {subject.name}
                            </span>
                            <span className={`font-bold ${percentTextClass(performance)}`}>
                              {Number(performance) || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-royalPurple-muted/60 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                performance >= 85
                                  ? 'bg-royalPurple-success'
                                  : performance >= 75
                                    ? 'bg-royalPurple-accent'
                                    : 'bg-royalPurple-accent'
                              }`}
                              style={{ width: `${performance}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1 flex items-center">
            <Clock className="h-6 w-6 mr-3 text-royalPurple-text2" />
            Recent Results Entered
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
            {Array.isArray(dashboardData?.recent_activities) &&
            dashboardData.recent_activities.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recent_activities.slice(0, 6).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-lg"
                  >
                    <div>
                      <div className="text-royalPurple-text1 font-semibold text-sm">{a.title}</div>
                      <div className="text-royalPurple-text2 text-xs">
                        {a.description}
                        {a.actor ? ` • ${a.actor}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-royalPurple-text2 text-sm text-center py-4">
                No results have been entered yet this term.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <StudentRosterCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Registrations Chart */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Monthly Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData?.monthly_registrations || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                  <XAxis dataKey="month" stroke="rgba(203,213,225,0.8)" />
                  <YAxis stroke="rgba(203,213,225,0.8)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderColor: 'rgba(148, 163, 184, 0.2)',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="students" fill="#3b82f6" name="Students" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="teachers" fill="#10b981" name="Teachers" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center">
              <Plus className="h-6 w-6 mr-3 text-royalPurple-accent" aria-hidden="true" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => setActiveTab('user-management')}
                  className="bg-royalPurple-muted/60 hover:bg-royalPurple-muted/60 text-royalPurple-text1 border border-royalPurple-border/40 h-24 flex flex-col items-center justify-center gap-2 rounded-xl transition-all duration-300"
                >
                  <UserPlus className="h-6 w-6 text-royalPurple-accent" aria-hidden="true" />
                  <span>Register User</span>
                </Button>
                <Button
                  onClick={() => setActiveTab('academic-management')}
                  className="bg-royalPurple-muted/60 hover:bg-royalPurple-muted/60 text-royalPurple-text1 border border-royalPurple-border/40 h-24 flex flex-col items-center justify-center gap-2 rounded-xl transition-all duration-300"
                >
                  <GraduationCap className="h-6 w-6 text-royalPurple-accent" aria-hidden="true" />
                  <span>Create Class</span>
                </Button>
                <Button
                  onClick={() => setActiveTab('academic-management')}
                  className="bg-royalPurple-muted/60 hover:bg-royalPurple-muted/60 text-royalPurple-text1 border border-royalPurple-border/40 h-24 flex flex-col items-center justify-center gap-2 rounded-xl transition-all duration-300"
                >
                  <BookOpen className="h-6 w-6 text-royalPurple-accent" aria-hidden="true" />
                  <span>Add Subject</span>
                </Button>
                <Button
                  onClick={() => setActiveTab('performance-analytics')}
                  className="bg-royalPurple-muted/60 hover:bg-royalPurple-muted/60 text-royalPurple-text1 border border-royalPurple-border/40 h-24 flex flex-col items-center justify-center gap-2 rounded-xl transition-all duration-300"
                >
                  <FileText className="h-6 w-6 text-royalPurple-accent" aria-hidden="true" />
                  <span>Generate Report</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})
