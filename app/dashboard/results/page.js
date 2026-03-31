'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { startTopLoading } from '@/lib/uiProgress'
import {
  BookOpen,
  TrendingUp,
  Users,
  Award,
  Download,
  Filter,
  GraduationCap,
  RefreshCw,
  Plus,
  Edit,
} from 'lucide-react'

export default function ResultsPage() {
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const { user } = useAuth()

  const { data: dashboardData } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => api.getTeacherDashboard().then((res) => res.data),
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
      case 'A':
      case 'A+':
        return 'text-royalPurple-successTx bg-royalPurple-success'
      case 'A-':
      case 'B+':
        return 'text-royalPurple-accentTx bg-royalPurple-accent'
      case 'B':
      case 'B-':
        return 'text-yellow-600 bg-yellow-100'
      case 'C+':
      case 'C':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-royalPurple-dangerTx bg-royalPurple-danger'
    }
  }

  const calculateStats = () => {
    if (resultsToShow.length === 0) {
      return {
        average: 0,
        highest: 0,
        lowest: 0,
        totalStudents: 0,
      }
    }

    const totalMarks = resultsToShow.reduce((sum, result) => sum + result.marks, 0)
    const averagePercentage = totalMarks / resultsToShow.length
    const highestScore = Math.max(...resultsToShow.map((r) => r.marks))
    const lowestScore = Math.min(...resultsToShow.map((r) => r.marks))

    return {
      average: averagePercentage.toFixed(1),
      highest: highestScore,
      lowest: lowestScore,
      totalStudents: resultsToShow.length,
    }
  }

  const stats = calculateStats()

  // Show empty state if no results
  if (resultsToShow.length === 0) {
    return (
      <DashboardLayout title={isStudent ? 'My Results' : 'Results & Grading'}>
        <main className="space-y-6">
          <Card className="focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
            <CardContent className="text-center py-12">
              <GraduationCap
                className="h-16 w-16 text-royalPurple-text3 mx-auto mb-4"
                aria-hidden="true"
              />
              <h3 className="text-xl font-medium text-royalPurple-text1 mb-2">
                {isStudent ? 'No Results Available' : 'No Student Results Found'}
              </h3>
              <p className="text-royalPurple-text2 mb-6">
                {isStudent
                  ? 'Your results will appear here once they are published by your teachers.'
                  : 'Student results will appear here once assessments are graded and published.'}
              </p>
              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    startTopLoading('Refreshing')
                    setTimeout(() => window.location.reload(), 350)
                  }}
                  className="focus:ring-2 focus:ring-blue-500 outline-none"
                  aria-label="Refresh results"
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Refresh
                </Button>
                {!isStudent && (
                  <Button
                    className="focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Add new results"
                  >
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add Results
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={isStudent ? 'My Results' : 'Results & Grading'}>
      <main className="space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1">
              {isStudent ? 'My Results' : 'Results & Grading'}
            </h1>
            <p className="text-royalPurple-text2">
              {isStudent
                ? 'View your assessment results and academic progress'
                : 'View and manage student assessment results'}
            </p>
          </div>
          {!isStudent && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="focus:ring-2 focus:ring-blue-500 outline-none flex-1 sm:flex-none"
                aria-label="Export results to CSV"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="focus:ring-2 focus:ring-blue-500 outline-none flex-1 sm:flex-none"
                aria-label="Open filter options"
              >
                <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                Filter
              </Button>
            </div>
          )}
        </header>

        {/* Results Statistics */}
        <section
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
          aria-label="Results Statistics"
        >
          <Card className="focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                {isStudent ? (
                  <BookOpen
                    className="h-6 w-6 sm:h-8 sm:w-8 text-royalPurple-accentTx mb-2 sm:mb-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Users
                    className="h-6 w-6 sm:h-8 sm:w-8 text-royalPurple-accentTx mb-2 sm:mb-0"
                    aria-hidden="true"
                  />
                )}
                <div className="sm:ml-4">
                  <p className="text-[10px] sm:text-sm font-medium text-royalPurple-text2 uppercase tracking-tight">
                    {isStudent ? 'Assessments' : 'Students'}
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-royalPurple-text1 leading-tight">
                    {isStudent ? resultsToShow.length : stats.totalStudents}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="focus-within:ring-2 focus-within:ring-green-500 transition-shadow">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                <TrendingUp
                  className="h-6 w-6 sm:h-8 sm:w-8 text-royalPurple-successTx mb-2 sm:mb-0"
                  aria-hidden="true"
                />
                <div className="sm:ml-4">
                  <p className="text-[10px] sm:text-sm font-medium text-royalPurple-text2 uppercase tracking-tight">
                    Average
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-royalPurple-text1 leading-tight">
                    {stats.average}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="focus-within:ring-2 focus-within:ring-purple-500 transition-shadow">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                <Award
                  className="h-6 w-6 sm:h-8 sm:w-8 text-royalPurple-pillTx mb-2 sm:mb-0"
                  aria-hidden="true"
                />
                <div className="sm:ml-4">
                  <p className="text-[10px] sm:text-sm font-medium text-royalPurple-text2 uppercase tracking-tight">
                    Highest
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-royalPurple-text1 leading-tight">
                    {stats.highest}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="focus-within:ring-2 focus-within:ring-orange-500 transition-shadow">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                <BookOpen
                  className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 mb-2 sm:mb-0"
                  aria-hidden="true"
                />
                <div className="sm:ml-4">
                  <p className="text-[10px] sm:text-sm font-medium text-royalPurple-text2 uppercase tracking-tight">
                    Lowest
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-royalPurple-text1 leading-tight">
                    {stats.lowest}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Filters - Only show for teachers/admins */}
        {!isStudent && (
          <section aria-labelledby="filter-title">
            <Card>
              <CardHeader>
                <CardTitle id="filter-title">Filter Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="class-filter"
                      className="block text-sm font-medium text-royalPurple-text2 mb-2"
                    >
                      Class
                    </label>
                    <select
                      id="class-filter"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full p-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-royalPurple-card"
                      aria-label="Filter results by class"
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
                    <label
                      htmlFor="subject-filter"
                      className="block text-sm font-medium text-royalPurple-text2 mb-2"
                    >
                      Subject
                    </label>
                    <select
                      id="subject-filter"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full p-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-royalPurple-card"
                      aria-label="Filter results by subject"
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
                    <label
                      htmlFor="assessment-filter"
                      className="block text-sm font-medium text-royalPurple-text2 mb-2"
                    >
                      Assessment
                    </label>
                    <select
                      id="assessment-filter"
                      className="w-full p-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-royalPurple-card"
                      aria-label="Filter results by assessment type"
                    >
                      <option value="">All Assessments</option>
                      <option value="algebra-test">Algebra Test</option>
                      <option value="geometry-quiz">Geometry Quiz</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Results Table */}
        <section aria-labelledby="results-table-title">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle id="results-table-title">
                {isStudent ? 'My Assessment Results' : 'Student Results'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b" role="row">
                      {!isStudent && (
                        <th
                          className="text-left py-3 px-4 font-semibold text-sm text-royalPurple-text2"
                          role="columnheader"
                        >
                          Student
                        </th>
                      )}
                      <th
                        className="text-left py-3 px-4 font-semibold text-sm text-royalPurple-text2"
                        role="columnheader"
                      >
                        Assessment
                      </th>
                      <th
                        className="text-left py-3 px-4 font-semibold text-sm text-royalPurple-text2"
                        role="columnheader"
                      >
                        Subject
                      </th>
                      {isStudent && (
                        <th
                          className="text-left py-3 px-4 font-semibold text-sm text-royalPurple-text2"
                          role="columnheader"
                        >
                          Date
                        </th>
                      )}
                      <th
                        className="text-left py-3 px-4 font-semibold text-sm text-royalPurple-text2"
                        role="columnheader"
                      >
                        Marks
                      </th>
                      <th
                        className="text-left py-3 px-4 font-semibold text-sm text-royalPurple-text2"
                        role="columnheader"
                      >
                        Percentage
                      </th>
                      <th
                        className="text-left py-3 px-4 font-semibold text-sm text-royalPurple-text2"
                        role="columnheader"
                      >
                        Grade
                      </th>
                      {!isStudent && (
                        <th
                          className="text-right py-3 px-4 font-semibold text-sm text-royalPurple-text2"
                          role="columnheader"
                        >
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {resultsToShow.map((result) => (
                      <tr
                        key={result.id}
                        className="border-b hover:bg-royalPurple-page transition-colors"
                        role="row"
                      >
                        {!isStudent && (
                          <td className="py-3 px-4" role="cell">
                            <div className="font-medium text-royalPurple-text1">
                              {result.student_name}
                            </div>
                            <div className="text-xs text-royalPurple-text3">
                              ID: {result.student_id}
                            </div>
                          </td>
                        )}
                        <td className="py-3 px-4 text-sm text-royalPurple-text2" role="cell">
                          {result.assessment}
                        </td>
                        <td className="py-3 px-4 text-sm text-royalPurple-text2" role="cell">
                          {result.subject}
                        </td>
                        {isStudent && (
                          <td className="py-3 px-4 text-sm text-royalPurple-text3" role="cell">
                            {result.date}
                          </td>
                        )}
                        <td className="py-3 px-4 text-sm font-medium" role="cell">
                          {result.marks}/{result.total}
                        </td>
                        <td className="py-3 px-4" role="cell">
                          <div
                            className="flex items-center gap-3"
                            aria-label={`${result.percentage} percent`}
                          >
                            <span className="text-sm font-semibold min-w-[3rem]">
                              {result.percentage}%
                            </span>
                            <div
                              className="w-24 bg-royalPurple-card2 rounded-full h-2 overflow-hidden"
                              aria-hidden="true"
                            >
                              <div
                                className="bg-royalPurple-accent h-full rounded-full transition-all duration-500"
                                style={{ width: `${result.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4" role="cell">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getGradeColor(result.grade)}`}
                          >
                            {result.grade}
                          </span>
                        </td>
                        {!isStudent && (
                          <td className="py-3 px-4 text-right" role="cell">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={`Edit result for ${result.student_name}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Cards */}
              <div className="md:hidden space-y-4">
                {resultsToShow.map((result) => (
                  <article
                    key={result.id}
                    className="p-4 rounded-xl border border-royalPurple-border bg-royalPurple-card shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-royalPurple-text1">{result.assessment}</h4>
                        <p className="text-xs text-royalPurple-text3">
                          {result.subject} • {result.date}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getGradeColor(result.grade)}`}
                      >
                        {result.grade}
                      </span>
                    </div>

                    {!isStudent && (
                      <div className="flex items-center gap-3 py-2 border-y border-royalPurple-border">
                        <div className="h-8 w-8 rounded-full bg-royalPurple-accent flex items-center justify-center text-royalPurple-accentTx font-bold text-xs">
                          {result.student_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-royalPurple-text1">
                            {result.student_name}
                          </p>
                          <p className="text-[10px] text-royalPurple-text3">
                            ID: {result.student_id}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-sm">
                        <span className="text-royalPurple-text3">Score: </span>
                        <span className="font-bold">
                          {result.marks}/{result.total}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-royalPurple-accentTx">
                          {result.percentage}%
                        </span>
                        <div className="w-16 bg-royalPurple-card2 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-royalPurple-accent h-full rounded-full"
                            style={{ width: `${result.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {!isStudent && (
                      <div className="pt-2">
                        <Button variant="outline" size="sm" className="w-full">
                          Edit Result
                        </Button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Grade Distribution */}
        <section aria-labelledby="distribution-title">
          <Card>
            <CardHeader>
              <CardTitle id="distribution-title">
                {isStudent ? 'My Grade Distribution' : 'Grade Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4" role="list">
                {['A', 'B+', 'B', 'C+', 'C'].map((grade) => {
                  const count = resultsToShow.filter((r) => r.grade.startsWith(grade)).length
                  const percentage =
                    resultsToShow.length > 0 ? ((count / resultsToShow.length) * 100).toFixed(1) : 0
                  return (
                    <div
                      key={grade}
                      className="text-center p-4 rounded-lg focus-within:bg-royalPurple-page outline-none"
                      role="listitem"
                      tabIndex="0"
                    >
                      <div
                        className={`text-2xl font-bold ${getGradeColor(grade).split(' ')[0]}`}
                        aria-label={`${count} items with grade ${grade}`}
                      >
                        {count}
                      </div>
                      <div className="text-sm text-royalPurple-text2">Grade {grade}</div>
                      <div className="text-xs text-royalPurple-text3">{percentage}%</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </DashboardLayout>
  )
}
