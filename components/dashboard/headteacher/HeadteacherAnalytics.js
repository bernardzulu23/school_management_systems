import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp, Users, FileBarChart, BookOpen
} from 'lucide-react'
import { useHeadteacher } from '@/lib/context/HeadteacherContext'

export function HeadteacherAnalytics() {
  const {
    selectedTerm,
    setSelectedTerm,
    yearGroupPerformanceData,
    schoolStats
  } = useHeadteacher()
  return (
    <div className="space-y-8">
      {/* Comprehensive Analytics Header */}
      <div className="backdrop-blur-lg bg-slate-800/60 border border-purple-500/40 rounded-3xl p-8 text-center shadow-2xl">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
          Comprehensive School Analytics
        </h2>
        <p className="text-slate-300 text-lg">Detailed performance insights and data-driven decision making</p>
      </div>

      {/* Term Selector */}
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-lg">Analytics Period</h3>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-slate-700/60 border border-slate-600/40 rounded-lg px-4 py-2 text-white"
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
            <CardTitle className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              School Performance by Term
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-300 text-lg">Performance Trends</p>
                  <p className="text-slate-400">School vs National Average</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Year Group Performance */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Year Group Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
              <div className="space-y-4">
                {yearGroupPerformanceData?.map((item, index) => {
                  const performance = item.score
                  return (
                    <div key={index} className="p-3 bg-slate-700/60 border border-slate-600/40 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-semibold">{item.name}</span>
                        <span className="text-blue-400 font-bold">{performance}%</span>
                      </div>
                      <div className="w-full bg-slate-600/60 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            performance >= 85 ? 'bg-green-500' :
                            performance >= 75 ? 'bg-blue-500' : 'bg-yellow-500'
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

      {/* Teacher Performance Analytics */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Teacher Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Teacher Performance Chart */}
              <div className="h-64 flex items-center justify-center bg-slate-700/60 border border-slate-600/40 rounded-xl">
                <div className="text-center">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-300">Teacher Performance Chart</p>
                  <p className="text-slate-400 text-sm">Individual teacher analytics</p>
                </div>
              </div>

              {/* Teacher Summary */}
              <div className="space-y-4">
                <h3 className="text-white font-bold text-lg">Teacher Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-400">{schoolStats.totalTeachers}</div>
                    <div className="text-slate-300 text-sm">Total Teachers</div>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl text-center">
                    <div className="text-2xl font-bold text-blue-400">{schoolStats.teacherEffectiveness}%</div>
                    <div className="text-slate-300 text-sm">Effectiveness</div>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl text-center">
                    <div className="text-2xl font-bold text-purple-400">{schoolStats.complianceRate}%</div>
                    <div className="text-slate-300 text-sm">Compliance</div>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl text-center">
                    <div className="text-2xl font-bold text-orange-400">{schoolStats.teacherDevelopment}%</div>
                    <div className="text-slate-300 text-sm">Development</div>
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
