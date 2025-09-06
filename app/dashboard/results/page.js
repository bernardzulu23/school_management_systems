'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { BookOpen, TrendingUp, Users, Award, Download, Filter, GraduationCap, RefreshCw, Plus } from 'lucide-react'

export default function ResultsPage() {
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const { user } = useAuth()

  const { data: dashboardData } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => api.getTeacherDashboard().then(res => res.data),
  })

  // TODO: Replace with actual API calls to load results data
  // Results data should come from database based on user role and permissions
  const allResults = []
  const studentResults = []

  // Determine which results to show based on user role
  const isStudent = user?.role === 'student'
  const resultsToShow = isStudent ? studentResults : allResults

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': case 'A+': return 'text-green-600 bg-green-100'
      case 'A-': case 'B+': return 'text-blue-600 bg-blue-100'
      case 'B': case 'B-': return 'text-yellow-600 bg-yellow-100'
      case 'C+': case 'C': return 'text-orange-600 bg-orange-100'
      default: return 'text-red-600 bg-red-100'
    }
  }

  const calculateStats = () => {
    if (resultsToShow.length === 0) {
      return {
        average: 0,
        highest: 0,
        lowest: 0,
        totalStudents: 0
      }
    }

    const totalMarks = resultsToShow.reduce((sum, result) => sum + result.marks, 0)
    const averagePercentage = totalMarks / resultsToShow.length
    const highestScore = Math.max(...resultsToShow.map(r => r.marks))
    const lowestScore = Math.min(...resultsToShow.map(r => r.marks))

    return {
      average: averagePercentage.toFixed(1),
      highest: highestScore,
      lowest: lowestScore,
      totalStudents: resultsToShow.length
    }
  }

  const stats = calculateStats()

  // Show empty state if no results
  if (resultsToShow.length === 0) {
    return (
      <DashboardLayout title={isStudent ? "My Results" : "Results & Grading"}>
        <div className="space-y-6">
          <Card>
            <CardContent className="text-center py-12">
              <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {isStudent ? "No Results Available" : "No Student Results Found"}
              </h3>
              <p className="text-gray-600 mb-6">
                {isStudent
                  ? "Your results will appear here once they are published by your teachers."
                  : "Student results will appear here once assessments are graded and published."
                }
              </p>
              <div className="flex justify-center space-x-4">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                {!isStudent && (
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Results
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={isStudent ? "My Results" : "Results & Grading"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isStudent ? "My Results" : "Results & Grading"}
            </h1>
            <p className="text-gray-600">
              {isStudent
                ? "View your assessment results and academic progress"
                : "View and manage student assessment results"
              }
            </p>
          </div>
          {!isStudent && (
            <div className="flex space-x-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          )}
        </div>

        {/* Results Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                {isStudent ? <BookOpen className="h-8 w-8 text-blue-600" /> : <Users className="h-8 w-8 text-blue-600" />}
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {isStudent ? "Total Assessments" : "Total Students"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isStudent ? resultsToShow.length : stats.totalStudents}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {isStudent ? "My Average" : "Class Average"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{stats.average}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {isStudent ? "Best Score" : "Highest Score"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{stats.highest}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {isStudent ? "Lowest Score" : "Lowest Score"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{stats.lowest}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Only show for teachers/admins */}
        {!isStudent && (
          <Card>
            <CardHeader>
              <CardTitle>Filter Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Classes</option>
                    {dashboardData?.my_classes?.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Subjects</option>
                    {dashboardData?.my_subjects?.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assessment
                  </label>
                  <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="">All Assessments</option>
                    <option value="algebra-test">Algebra Test</option>
                    <option value="geometry-quiz">Geometry Quiz</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>{isStudent ? "My Assessment Results" : "Student Results"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {!isStudent && <th className="text-left py-3 px-4">Student</th>}
                    {!isStudent && <th className="text-left py-3 px-4">Student ID</th>}
                    <th className="text-left py-3 px-4">Assessment</th>
                    <th className="text-left py-3 px-4">Subject</th>
                    {isStudent && <th className="text-left py-3 px-4">Date</th>}
                    <th className="text-left py-3 px-4">Marks</th>
                    <th className="text-left py-3 px-4">Percentage</th>
                    <th className="text-left py-3 px-4">Grade</th>
                    {!isStudent && <th className="text-left py-3 px-4">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {resultsToShow.map((result) => (
                    <tr key={result.id} className="border-b hover:bg-gray-50">
                      {!isStudent && <td className="py-3 px-4 font-medium">{result.student_name}</td>}
                      {!isStudent && <td className="py-3 px-4 text-gray-600">{result.student_id}</td>}
                      <td className="py-3 px-4">{result.assessment}</td>
                      <td className="py-3 px-4">{result.subject}</td>
                      {isStudent && <td className="py-3 px-4 text-gray-600">{result.date}</td>}
                      <td className="py-3 px-4">{result.marks}/{result.total}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <span className="mr-2">{result.percentage}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${result.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getGradeColor(result.grade)}`}>
                          {result.grade}
                        </span>
                      </td>
                      {!isStudent && (
                        <td className="py-3 px-4">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{isStudent ? "My Grade Distribution" : "Grade Distribution"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {['A', 'B+', 'B', 'C+', 'C'].map((grade) => {
                const count = resultsToShow.filter(r => r.grade.startsWith(grade)).length
                const percentage = resultsToShow.length > 0 ? ((count / resultsToShow.length) * 100).toFixed(1) : 0
                return (
                  <div key={grade} className="text-center">
                    <div className={`text-2xl font-bold ${getGradeColor(grade).split(' ')[0]}`}>
                      {count}
                    </div>
                    <div className="text-sm text-gray-600">Grade {grade}</div>
                    <div className="text-xs text-gray-500">{percentage}%</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
