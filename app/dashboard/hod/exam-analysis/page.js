'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  ArrowLeft,
  Download,
  Loader2,
  AlertTriangle,
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
  LineChart,
  Line,
} from 'recharts'
import { percentTextClass } from '@/lib/utils/percentColor'

export default function ExamAnalysisPage() {
  const [selectedTerm, setSelectedTerm] = useState('Term 2')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedSubject, setSelectedSubject] = useState('all')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['hod-exam-analysis', selectedTerm, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('term', selectedTerm)
      params.set('year', String(selectedYear))
      const res = await fetch(`/api/dashboard/hod/exam-analysis?${params.toString()}`, {
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to load analysis')
      return json?.data || null
    },
  })

  const COLORS = ['#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#3B82F6']

  const departmentStats = data?.departmentStats || {
    totalStudents: 0,
    averageScore: 0,
    passRate: 0,
    improvement: 0,
  }

  const subjects = Array.isArray(data?.subjects) ? data.subjects : []
  const gradeDistribution = Array.isArray(data?.gradeDistribution) ? data.gradeDistribution : []
  const termComparison = Array.isArray(data?.termComparison) ? data.termComparison : []
  const actions = Array.isArray(data?.recommendedActions) ? data.recommendedActions : []
  const juniorGenderByGrade = Array.isArray(data?.junior_gender_by_grade)
    ? data.junior_gender_by_grade
    : []
  const seniorGenderByGrade = Array.isArray(data?.senior_gender_by_grade)
    ? data.senior_gender_by_grade
    : []

  const subjectOptions = useMemo(() => {
    const set = new Set(subjects.map((s) => String(s.subject || '').trim()).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [subjects])

  const filteredSubjects = useMemo(() => {
    return subjects.filter((item) => selectedSubject === 'all' || item.subject === selectedSubject)
  }, [subjects, selectedSubject])

  return (
    <DashboardLayout title="Exam Analysis">
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
              <h1 className="text-3xl font-bold text-royalPurple-text1 flex items-center">
                <BarChart3 className="h-8 w-8 mr-3 text-royalPurple-accentTx" />
                Exam Analysis
              </h1>
              <p className="text-royalPurple-text2 mt-1">
                Department assessment performance analysis and insights
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              className="px-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-royalPurple-card text-royalPurple-text1"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
            <select
              className="px-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-royalPurple-card text-royalPurple-text1"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[0, 1, 2, 3].map((i) => {
                const y = new Date().getFullYear() - i
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              })}
            </select>
            <Button variant="outline" onClick={() => refetch()}>
              <Download className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-royalPurple-accentTx" />
          </div>
        ) : isError ? (
          <Card className="p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-royalPurple-dangerTx mx-auto mb-3" />
            <p className="text-royalPurple-text2">Failed to load analysis</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-royalPurple-accent to-royalPurple-accent/80">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-royalPurple-accentTx/80 text-sm font-medium">
                        Total Students
                      </p>
                      <p className="text-3xl font-bold text-royalPurple-accentTx">
                        {departmentStats.totalStudents || 0}
                      </p>
                    </div>
                    <Users className="h-12 w-12 text-royalPurple-accentTx/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-royalPurple-success to-royalPurple-success/80">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-royalPurple-successTx/80 text-sm font-medium">
                        Average Score
                      </p>
                      <p
                        className={`text-3xl font-bold ${percentTextClass(departmentStats.averageScore)}`}
                      >
                        {Number(departmentStats.averageScore) || 0}%
                      </p>
                    </div>
                    <TrendingUp className="h-12 w-12 text-royalPurple-successTx/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-royalPurple-pill to-royalPurple-pill/80">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-royalPurple-pillTx/80 text-sm font-medium">Pass Rate</p>
                      <p
                        className={`text-3xl font-bold ${percentTextClass(departmentStats.passRate)}`}
                      >
                        {Number(departmentStats.passRate) || 0}%
                      </p>
                    </div>
                    <Award className="h-12 w-12 text-royalPurple-pillTx/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-400">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm font-medium">Improvement</p>
                      <p className="text-3xl font-bold text-white">
                        {departmentStats.improvement >= 0 ? '+' : ''}
                        {departmentStats.improvement || 0}%
                      </p>
                    </div>
                    <TrendingUp className="h-12 w-12 text-white/60" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Boys vs Girls (Forms 1–2)</CardTitle>
                </CardHeader>
                <CardContent>
                  {juniorGenderByGrade.length === 0 ? (
                    <p className="text-royalPurple-text2 text-center py-10">No data found.</p>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={juniorGenderByGrade}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="grade" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#F9FAFB',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="male" stackId="g" fill="#3B82F6" name="Male" />
                          <Bar dataKey="female" stackId="g" fill="#EC4899" name="Female" />
                          <Bar dataKey="unknown" stackId="g" fill="#9CA3AF" name="Unknown" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Boys vs Girls (Grades 10–12)</CardTitle>
                </CardHeader>
                <CardContent>
                  {seniorGenderByGrade.length === 0 ? (
                    <p className="text-royalPurple-text2 text-center py-10">No data found.</p>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={seniorGenderByGrade}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="grade" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#F9FAFB',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="male" stackId="g" fill="#3B82F6" name="Male" />
                          <Bar dataKey="female" stackId="g" fill="#EC4899" name="Female" />
                          <Bar dataKey="unknown" stackId="g" fill="#9CA3AF" name="Unknown" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Subject Performance Analysis</CardTitle>
                    <select
                      className="px-3 py-2 border border-royalPurple-border rounded-md bg-royalPurple-card text-royalPurple-text1"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                    >
                      <option value="all">All Subjects</option>
                      {subjectOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredSubjects.length === 0 ? (
                    <p className="text-royalPurple-text2 text-center py-10">No results found.</p>
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredSubjects}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="subject" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#F9FAFB',
                            }}
                          />
                          <Bar dataKey="average" fill="#8B5CF6" name="Average Score %" />
                          <Bar dataKey="passRate" fill="#10B981" name="Pass Rate %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grade Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {gradeDistribution.length === 0 ? (
                    <p className="text-royalPurple-text2 text-center py-10">No results found.</p>
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={gradeDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ grade, percentage }) => `${grade}: ${percentage}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {gradeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#F9FAFB',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Term Performance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {termComparison.length === 0 ? (
                  <p className="text-royalPurple-text2 text-center py-10">No trend data.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={termComparison}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="term" stroke="#9CA3AF" fontSize={12} />
                        <YAxis stroke="#9CA3AF" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F9FAFB',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="average"
                          stroke="#8B5CF6"
                          strokeWidth={3}
                          name="Average Score %"
                        />
                        <Line
                          type="monotone"
                          dataKey="passRate"
                          stroke="#10B981"
                          strokeWidth={3}
                          name="Pass Rate %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detailed Subject Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {subjects.length === 0 ? (
                  <p className="text-royalPurple-text2 text-center py-10">No results found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-royalPurple-border">
                          <th className="text-left py-3 px-4 text-royalPurple-text2 font-medium">
                            Subject
                          </th>
                          <th className="text-center py-3 px-4 text-royalPurple-text2 font-medium">
                            Students
                          </th>
                          <th className="text-center py-3 px-4 text-royalPurple-text2 font-medium">
                            Average Score
                          </th>
                          <th className="text-center py-3 px-4 text-royalPurple-text2 font-medium">
                            Pass Rate
                          </th>
                          <th className="text-center py-3 px-4 text-royalPurple-text2 font-medium">
                            Improvement
                          </th>
                          <th className="text-center py-3 px-4 text-royalPurple-text2 font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((subject) => (
                          <tr
                            key={subject.subjectId}
                            className="border-b border-royalPurple-border hover:bg-royalPurple-page"
                          >
                            <td className="py-4 px-4">
                              <div className="font-medium text-royalPurple-text1">
                                {subject.subject}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center text-royalPurple-text2">
                              {subject.students}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`font-medium ${percentTextClass(subject.average)}`}>
                                {Number(subject.average) || 0}%
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`font-medium ${percentTextClass(subject.passRate)}`}>
                                {Number(subject.passRate) || 0}%
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span
                                className={`font-medium ${
                                  subject.improvement > 0
                                    ? 'text-royalPurple-successTx'
                                    : subject.improvement < 0
                                      ? 'text-royalPurple-dangerTx'
                                      : 'text-royalPurple-text2'
                                }`}
                              >
                                {subject.improvement > 0 ? '+' : ''}
                                {subject.improvement}%
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  subject.passRate >= 85
                                    ? 'bg-royalPurple-success text-royalPurple-successTx'
                                    : subject.passRate >= 75
                                      ? 'bg-royalPurple-accent text-royalPurple-accentTx'
                                      : 'bg-yellow-50 text-yellow-800'
                                }`}
                              >
                                {subject.passRate >= 85
                                  ? 'Excellent'
                                  : subject.passRate >= 75
                                    ? 'Good'
                                    : 'Needs Improvement'}
                              </span>
                            </td>
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
                <CardTitle>Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {actions.length === 0 ? (
                    <p className="text-royalPurple-text2 text-center py-6">
                      No recommendations yet.
                    </p>
                  ) : (
                    actions.map((a, idx) => {
                      const bg =
                        a.level === 'danger'
                          ? 'bg-royalPurple-danger border-royalPurple-border'
                          : a.level === 'success'
                            ? 'bg-royalPurple-success border-royalPurple-border'
                            : 'bg-royalPurple-accent border-royalPurple-border2'

                      const tx =
                        a.level === 'danger'
                          ? 'text-royalPurple-dangerTx'
                          : a.level === 'success'
                            ? 'text-royalPurple-successTx'
                            : 'text-royalPurple-accentTx'

                      return (
                        <div key={idx} className={`p-4 border rounded-lg ${bg}`}>
                          <h4 className={`font-medium mb-2 ${tx}`}>{a.title}</h4>
                          <p className={`${tx} text-sm`}>{a.message}</p>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
