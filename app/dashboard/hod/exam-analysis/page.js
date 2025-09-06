'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  BarChart3, TrendingUp, TrendingDown, Users, BookOpen,
  ArrowLeft, Download, Filter, Calendar, Target
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import Link from 'next/link'

export default function ExamAnalysisPage() {
  const [selectedTerm, setSelectedTerm] = useState('term2')
  const [selectedSubject, setSelectedSubject] = useState('all')

  // Sample exam data
  const examData = [
    { subject: 'Mathematics', students: 45, average: 78, passRate: 82, improvement: 5 },
    { subject: 'English', students: 45, average: 85, passRate: 91, improvement: 3 },
    { subject: 'Science', students: 42, average: 72, passRate: 76, improvement: -2 },
    { subject: 'History', students: 38, average: 80, passRate: 84, improvement: 7 },
    { subject: 'Geography', students: 35, average: 75, passRate: 79, improvement: 1 }
  ]

  const gradeDistribution = [
    { grade: 'A', count: 25, percentage: 15 },
    { grade: 'B', count: 45, percentage: 27 },
    { grade: 'C', count: 55, percentage: 33 },
    { grade: 'D', count: 30, percentage: 18 },
    { grade: 'F', count: 12, percentage: 7 }
  ]

  const termComparison = [
    { term: 'Term 1', average: 74, passRate: 78 },
    { term: 'Term 2', average: 78, passRate: 82 },
    { term: 'Term 3', average: 76, passRate: 80 }
  ]

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  const departmentStats = {
    totalStudents: 167,
    averageScore: 78,
    passRate: 82,
    improvement: 4
  }

  return (
    <DashboardLayout title="Exam Analysis">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/hod">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2" />
                Exam Analysis
              </h1>
              <p className="text-gray-600">Assessment performance analysis and insights</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
            >
              <option value="term1">Term 1</option>
              <option value="term2">Term 2</option>
              <option value="term3">Term 3</option>
            </select>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Department Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{departmentStats.totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{departmentStats.averageScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{departmentStats.passRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Improvement</p>
                  <p className="text-2xl font-bold text-green-600">+{departmentStats.improvement}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subject Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Subject Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={examData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" fill="#3B82F6" name="Average Score" />
                  <Bar dataKey="passRate" fill="#10B981" name="Pass Rate" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Grade Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ grade, percentage }) => `${grade}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Term Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Term-by-Term Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={termComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="term" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke="#3B82F6" strokeWidth={2} name="Average Score" />
                <Line type="monotone" dataKey="passRate" stroke="#10B981" strokeWidth={2} name="Pass Rate" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Subject Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Subject</th>
                    <th className="text-left py-3 px-4">Students</th>
                    <th className="text-left py-3 px-4">Average Score</th>
                    <th className="text-left py-3 px-4">Pass Rate</th>
                    <th className="text-left py-3 px-4">Improvement</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {examData.map((subject, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{subject.subject}</td>
                      <td className="py-3 px-4">{subject.students}</td>
                      <td className="py-3 px-4">{subject.average}%</td>
                      <td className="py-3 px-4">{subject.passRate}%</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {subject.improvement > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                          ) : subject.improvement < 0 ? (
                            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                          ) : null}
                          <span className={subject.improvement > 0 ? 'text-green-600' : subject.improvement < 0 ? 'text-red-600' : 'text-gray-600'}>
                            {subject.improvement > 0 ? '+' : ''}{subject.improvement}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          subject.passRate >= 80 ? 'bg-green-100 text-green-800' :
                          subject.passRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {subject.passRate >= 80 ? 'Excellent' : subject.passRate >= 70 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Immediate Attention Required</h4>
                <p className="text-sm text-red-700">Science department showing -2% decline. Consider additional support sessions.</p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Excellent Performance</h4>
                <p className="text-sm text-green-700">History department showing +7% improvement. Share best practices with other subjects.</p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Overall Department Status</h4>
                <p className="text-sm text-blue-700">Department average of 78% meets target. Continue current strategies while addressing Science concerns.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
