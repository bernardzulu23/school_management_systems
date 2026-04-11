import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Users, FileBarChart, BookOpen } from 'lucide-react'
import { useHeadteacher } from '@/lib/context/HeadteacherContext'
import { GenderByGradeCard } from '@/components/dashboard/GenderByGradeCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function HeadteacherAnalytics() {
  const {
    selectedTerm,
    setSelectedTerm,
    yearGroupPerformanceData,
    seniorResultsAnalysis,
    schoolStats,
    dashboardData,
  } = useHeadteacher()
  const teacherPerformanceRows = Array.isArray(dashboardData?.teacher_performance_rows)
    ? dashboardData.teacher_performance_rows
    : Array.isArray(dashboardData?.teacherPerformanceRows)
      ? dashboardData.teacherPerformanceRows
      : []
  const topTeacherPerformance = teacherPerformanceRows.slice(0, 10).map((t) => ({
    name: String(t?.name || '').trim() || 'Unknown',
    averageScore: Number(t?.averageScore || 0),
    passRate: Number(t?.passRate || 0),
    resultsEntered: Number(t?.resultsEntered || 0),
  }))
  return (
    <div className="space-y-8">
      {/* Comprehensive Analytics Header */}
      <div className="backdrop-blur-lg bg-royalPurple-card/60 border border-royalPurple-border2/40 rounded-3xl p-8 text-center shadow-2xl">
        <h2 className="text-4xl font-bold text-royalPurple-text1 mb-4">
          Comprehensive School Analytics
        </h2>
        <p className="text-royalPurple-text2 text-lg">
          Detailed performance insights and data-driven decision making
        </p>
      </div>

      {/* Term Selector */}
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-royalPurple-text1 font-bold text-lg">Analytics Period</h3>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-lg px-4 py-2 text-royalPurple-text1"
            >
              <option value="All Terms">All Terms</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* School Performance by Term */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">School Performance by Term</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-16 w-16 text-royalPurple-text3 mx-auto mb-4" />
                  <p className="text-royalPurple-text2 text-lg">Performance Trends</p>
                  <p className="text-royalPurple-text3">School vs National Average</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Year Group Performance */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Year Group Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
              <div className="space-y-4">
                {yearGroupPerformanceData?.map((item, index) => {
                  const performance = item.score
                  return (
                    <div
                      key={index}
                      className="p-3 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-royalPurple-text1 font-semibold">{item.name}</span>
                        <span className="text-royalPurple-accentTx font-bold">{performance}%</span>
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
          </CardContent>
        </Card>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1">
            Senior Results Analysis (Grades 10–12)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!seniorResultsAnalysis ? (
            <div className="text-center py-10 text-royalPurple-text2">No senior results found.</div>
          ) : (
            <div className="space-y-6">
              <GenderByGradeCard
                title="Boys vs Girls (Grades 10–12)"
                data={
                  dashboardData?.senior_gender_by_grade || dashboardData?.seniorGenderByGrade || []
                }
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl text-center">
                  <div className="text-2xl font-bold text-royalPurple-text1">
                    {seniorResultsAnalysis.totalStudents || 0}
                  </div>
                  <div className="text-royalPurple-text2 text-sm">Senior Students</div>
                </div>
                <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl text-center">
                  <div className="text-2xl font-bold text-royalPurple-successTx">
                    {seniorResultsAnalysis.averageScore || 0}%
                  </div>
                  <div className="text-royalPurple-text2 text-sm">Average Score</div>
                </div>
                <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl text-center">
                  <div className="text-2xl font-bold text-royalPurple-accentTx">
                    {seniorResultsAnalysis.passRate || 0}%
                  </div>
                  <div className="text-royalPurple-text2 text-sm">Pass Rate</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl">
                  <h3 className="text-royalPurple-text1 font-bold mb-4">Grade Distribution</h3>
                  {Array.isArray(seniorResultsAnalysis.gradeDistribution) &&
                  seniorResultsAnalysis.gradeDistribution.length > 0 ? (
                    <div className="space-y-3">
                      {seniorResultsAnalysis.gradeDistribution.map((g) => (
                        <div key={g.grade} className="flex items-center justify-between">
                          <div className="text-royalPurple-text2">{g.grade}</div>
                          <div className="text-royalPurple-text1 font-semibold">
                            {g.count} ({g.percentage}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-royalPurple-text2">No grade data.</div>
                  )}
                </div>

                <div className="p-6 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl">
                  <h3 className="text-royalPurple-text1 font-bold mb-4">Subject Performance</h3>
                  {Array.isArray(seniorResultsAnalysis.subjects) &&
                  seniorResultsAnalysis.subjects.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-royalPurple-border/40">
                            <th className="text-left py-2 text-royalPurple-text2 font-medium">
                              Subject
                            </th>
                            <th className="text-right py-2 text-royalPurple-text2 font-medium">
                              Avg
                            </th>
                            <th className="text-right py-2 text-royalPurple-text2 font-medium">
                              Pass
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {seniorResultsAnalysis.subjects.slice(0, 8).map((s) => (
                            <tr key={s.subject} className="border-b border-royalPurple-border/20">
                              <td className="py-2 text-royalPurple-text1">{s.subject}</td>
                              <td className="py-2 text-right text-royalPurple-successTx font-semibold">
                                {s.average}%
                              </td>
                              <td className="py-2 text-right text-royalPurple-accentTx font-semibold">
                                {s.passRate}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-royalPurple-text2">No subject data.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teacher Performance Analytics */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1">Teacher Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Teacher Performance Chart */}
              <div className="h-64 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl p-4">
                {topTeacherPerformance.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <Users className="h-12 w-12 text-royalPurple-text3 mx-auto mb-4" />
                      <p className="text-royalPurple-text2">No teacher performance data yet</p>
                      <p className="text-royalPurple-text3 text-sm">
                        Performance appears after teachers enter results
                      </p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topTeacherPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          borderColor: '#334155',
                          color: '#fff',
                        }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar
                        dataKey="averageScore"
                        fill="#8B5CF6"
                        name="Avg Score %"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="passRate"
                        fill="#10B981"
                        name="Pass Rate %"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Teacher Summary */}
              <div className="space-y-4">
                <h3 className="text-royalPurple-text1 font-bold text-lg">Teacher Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl text-center">
                    <div className="text-2xl font-bold text-royalPurple-successTx">
                      {schoolStats.totalTeachers}
                    </div>
                    <div className="text-royalPurple-text2 text-sm">Total Teachers</div>
                  </div>
                  <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl text-center">
                    <div className="text-2xl font-bold text-royalPurple-accentTx">
                      {schoolStats.teacherEffectiveness}%
                    </div>
                    <div className="text-royalPurple-text2 text-sm">Effectiveness</div>
                  </div>
                  <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl text-center">
                    <div className="text-2xl font-bold text-royalPurple-pillTx">
                      {schoolStats.complianceRate}%
                    </div>
                    <div className="text-royalPurple-text2 text-sm">Compliance</div>
                  </div>
                  <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl text-center">
                    <div className="text-2xl font-bold text-royalPurple-accentTx">
                      {schoolStats.teacherDevelopment}%
                    </div>
                    <div className="text-royalPurple-text2 text-sm">Development</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
