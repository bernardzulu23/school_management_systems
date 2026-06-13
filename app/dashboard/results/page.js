'use client'

import { useMemo, useState } from 'react'
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
} from 'lucide-react'
import { getGradeBadgeClasses } from '@/lib/gradingSystem'
import { TeacherCompliancePanel } from '@/components/compliance/TeacherCompliancePanel'

export default function ResultsPage() {
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const { user } = useAuth()

  const role = String(user?.role || '').toLowerCase()
  const isHeadteacher = role === 'headteacher' || role === 'admin' || role === 'administrator'
  const isHod = role === 'hod'
  const isStudent = role === 'student'
  const showTeacherFilter = isHeadteacher || isHod

  const {
    data: resultsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-results', selectedClass, selectedSubject, selectedTeacher],
    queryFn: () =>
      api
        .getResultsOverview({
          class: selectedClass || undefined,
          subject: selectedSubject || undefined,
          teacher: selectedTeacher || undefined,
        })
        .then((res) => res.data),
    enabled: !isStudent,
  })

  const classOptions = useMemo(
    () => (resultsData?.filters?.classes || []).map((c) => c.name).filter(Boolean),
    [resultsData]
  )

  const subjectOptions = useMemo(
    () => (resultsData?.filters?.subjects || []).map((s) => s.name).filter(Boolean),
    [resultsData]
  )

  const teacherOptions = useMemo(() => resultsData?.filters?.teachers || [], [resultsData])

  const resultsToShow = useMemo(
    () => (Array.isArray(resultsData?.results) ? resultsData.results : []),
    [resultsData]
  )

  const stats = useMemo(() => {
    if (resultsToShow.length === 0) {
      return { average: 0, highest: 0, lowest: 0, totalStudents: 0 }
    }
    const percentages = resultsToShow.map((r) => Number(r.percentage || 0))
    const totalMarks = percentages.reduce((sum, n) => sum + n, 0)
    return {
      average: (totalMarks / percentages.length).toFixed(1),
      highest: Math.max(...percentages),
      lowest: Math.min(...percentages),
      totalStudents: resultsToShow.length,
    }
  }, [resultsToShow])

  const handleRefresh = () => {
    startTopLoading('Refreshing')
    refetch()
  }

  if (isLoading) {
    return (
      <DashboardLayout title={isStudent ? 'My Results' : 'Results & Grading'}>
        <main className="flex items-center justify-center py-24">
          <p className="text-royalPurple-text2">Loading results...</p>
        </main>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={isStudent ? 'My Results' : 'Results & Grading'}>
      <main className="space-y-6">
        {!isStudent && <TeacherCompliancePanel domain="results" />}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1">
              {isStudent ? 'My Results' : 'Results & Grading'}
            </h1>
            <p className="text-royalPurple-text2">
              {isHeadteacher
                ? 'Recent results entered across the school'
                : isStudent
                  ? 'View your assessment results and academic progress'
                  : 'View and manage student assessment results'}
            </p>
          </div>
          {!isStudent && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="focus:ring-2 focus:ring-g-500 outline-none"
                aria-label="Refresh results"
              >
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="focus:ring-2 focus:ring-g-500 outline-none flex-1 sm:flex-none"
                aria-label="Export results to CSV"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Export
              </Button>
            </div>
          )}
        </header>

        {!isStudent && (
          <section aria-labelledby="filter-title">
            <Card>
              <CardHeader>
                <CardTitle id="filter-title" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`grid grid-cols-1 gap-4 ${showTeacherFilter ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}
                >
                  <div>
                    <label
                      htmlFor="class-filter"
                      className="block text-sm font-medium text-royalPurple-text2 mb-2"
                    >
                      Class / Grade
                    </label>
                    <select
                      id="class-filter"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                    >
                      <option value="">All Classes</option>
                      {classOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
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
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                    >
                      <option value="">All Subjects</option>
                      {subjectOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {showTeacherFilter && (
                    <div>
                      <label
                        htmlFor="teacher-filter"
                        className="block text-sm font-medium text-royalPurple-text2 mb-2"
                      >
                        Teacher
                      </label>
                      <select
                        id="teacher-filter"
                        value={selectedTeacher}
                        onChange={(e) => setSelectedTeacher(e.target.value)}
                        className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      >
                        <option value="">All Teachers</option>
                        {teacherOptions.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {resultsToShow.length === 0 ? (
          <Card className="focus-within:ring-2 focus-within:ring-g-500 transition-shadow">
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
                  : selectedClass || selectedSubject || selectedTeacher
                    ? 'No results match the selected filters. Try clearing filters or check back after teachers enter grades.'
                    : 'Student results will appear here once assessments are graded and published.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <section
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
              aria-label="Results Statistics"
            >
              <Card>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-royalPurple-accentTx mb-2 sm:mb-0" />
                    <div className="sm:ml-4">
                      <p className="text-[10px] sm:text-sm font-medium text-royalPurple-text2 uppercase">
                        Entries
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-royalPurple-text1">
                        {stats.totalStudents}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                    <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-royalPurple-successTx mb-2 sm:mb-0" />
                    <div className="sm:ml-4">
                      <p className="text-[10px] sm:text-sm font-medium text-royalPurple-text2 uppercase">
                        Average
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-royalPurple-text1">
                        {stats.average}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                    <Award className="h-6 w-6 sm:h-8 sm:w-8 text-royalPurple-pillTx mb-2 sm:mb-0" />
                    <div className="sm:ml-4">
                      <p className="text-[10px] sm:text-sm font-medium text-royalPurple-text2 uppercase">
                        Highest
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-royalPurple-text1">
                        {stats.highest}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-accent mb-2 sm:mb-0" />
                    <div className="sm:ml-4">
                      <p className="text-[10px] sm:text-sm font-medium text-royalPurple-text2 uppercase">
                        Lowest
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-royalPurple-text1">
                        {stats.lowest}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="results-table-title">
              <Card>
                <CardHeader>
                  <CardTitle id="results-table-title">Recent Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm text-royalPurple-text2">
                            Student
                          </th>
                          <th className="text-left py-3 px-4 text-sm text-royalPurple-text2">
                            Subject
                          </th>
                          <th className="text-left py-3 px-4 text-sm text-royalPurple-text2">
                            Class
                          </th>
                          {showTeacherFilter && (
                            <th className="text-left py-3 px-4 text-sm text-royalPurple-text2">
                              Teacher
                            </th>
                          )}
                          <th className="text-left py-3 px-4 text-sm text-royalPurple-text2">
                            Score
                          </th>
                          <th className="text-left py-3 px-4 text-sm text-royalPurple-text2">
                            Grade
                          </th>
                          <th className="text-left py-3 px-4 text-sm text-royalPurple-text2">
                            Term
                          </th>
                          <th className="text-left py-3 px-4 text-sm text-royalPurple-text2">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultsToShow.map((result) => (
                          <tr key={result.id} className="border-b hover:bg-royalPurple-page">
                            <td className="py-3 px-4 font-medium text-royalPurple-text1">
                              {result.student_name}
                            </td>
                            <td className="py-3 px-4 text-sm text-royalPurple-text2">
                              {result.subject}
                            </td>
                            <td className="py-3 px-4 text-sm text-royalPurple-text2">
                              {result.class}
                            </td>
                            {showTeacherFilter && (
                              <td className="py-3 px-4 text-sm text-royalPurple-text2">
                                {result.teacher_name}
                              </td>
                            )}
                            <td className="py-3 px-4 text-sm font-medium">{result.percentage}%</td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeBadgeClasses(result.grade)}`}
                              >
                                {result.grade}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-royalPurple-text3">
                              {result.term} {result.year}
                            </td>
                            <td className="py-3 px-4 text-sm text-royalPurple-text3">
                              {result.date}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </DashboardLayout>
  )
}
