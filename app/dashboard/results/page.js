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
import { TeacherCompliancePanel } from '@/components/compliance/TeacherCompliancePanel'

function mapHeadteacherActivity(a) {
  const scoreMatch = String(a.description || '').match(/(\d+)%\s*$/)
  const percentage = scoreMatch ? Number(scoreMatch[1]) : 0
  const parts = String(a.description || '')
    .split('•')
    .map((p) => p.trim())
  const studentName = parts[0] || 'Student'
  const className = parts[1] || a.class_name || ''

  return {
    id: a.id,
    student_name: studentName,
    student_id: '',
    teacher_name: a.actor || '',
    assessment: a.title || 'Result entered',
    subject: a.subject_name || '',
    class: className,
    date: a.created_at ? new Date(a.created_at).toLocaleDateString() : '',
    marks: percentage,
    total: 100,
    percentage,
    grade: percentage >= 75 ? 'A' : percentage >= 65 ? 'B' : percentage >= 50 ? 'C' : 'D',
    term: a.term,
    year: a.year,
  }
}

function mapTeacherResult(r) {
  const percentage = Math.round(Number(r.score || 0))
  return {
    id: r.id,
    student_name: r.studentName || 'Student',
    student_id: r.studentExamNumber || r.studentId || '',
    teacher_name: '',
    assessment: `${r.term || ''} ${r.year || ''}`.trim() || 'Assessment',
    subject: r.subjectName || '',
    class: r.class || '',
    date: r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '',
    marks: percentage,
    total: 100,
    percentage,
    grade: r.grade || (percentage >= 75 ? 'A' : percentage >= 65 ? 'B' : 'C'),
    term: r.term,
    year: r.year,
  }
}

export default function ResultsPage() {
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const { user } = useAuth()

  const role = String(user?.role || '').toLowerCase()
  const isHeadteacher = role === 'headteacher' || role === 'admin' || role === 'administrator'
  const isTeacher = role === 'teacher' || role === 'hod'
  const isStudent = role === 'student'

  const {
    data: headteacherData,
    isLoading: headteacherLoading,
    refetch: refetchHeadteacher,
  } = useQuery({
    queryKey: ['headteacher-dashboard-results'],
    queryFn: () => api.getHeadteacherDashboard().then((res) => res.data),
    enabled: isHeadteacher,
  })

  const {
    data: teacherData,
    isLoading: teacherLoading,
    refetch: refetchTeacher,
  } = useQuery({
    queryKey: ['teacher-dashboard-results'],
    queryFn: () => api.getTeacherDashboard().then((res) => res.data),
    enabled: isTeacher && !isHeadteacher,
  })

  const allResults = useMemo(() => {
    if (isHeadteacher) {
      const activities = Array.isArray(headteacherData?.recent_activities)
        ? headteacherData.recent_activities
        : []
      return activities.map(mapHeadteacherActivity)
    }
    if (isTeacher) {
      const rows = Array.isArray(teacherData?.recent_results) ? teacherData.recent_results : []
      return rows.map(mapTeacherResult)
    }
    return []
  }, [isHeadteacher, isTeacher, headteacherData, teacherData])

  const filterSource = isHeadteacher ? headteacherData : teacherData
  const classOptions = useMemo(() => {
    const names = new Set()
    allResults.forEach((r) => {
      if (r.class) names.add(r.class)
    })
    if (isTeacher && Array.isArray(filterSource?.my_classes)) {
      filterSource.my_classes.forEach((c) => names.add(c.name))
    }
    return Array.from(names).filter(Boolean).sort()
  }, [allResults, filterSource, isTeacher])

  const subjectOptions = useMemo(() => {
    const names = new Set()
    allResults.forEach((r) => {
      if (r.subject) names.add(r.subject)
    })
    if (isTeacher && Array.isArray(filterSource?.my_subjects)) {
      filterSource.my_subjects.forEach((s) => names.add(s.name))
    }
    return Array.from(names).filter(Boolean).sort()
  }, [allResults, filterSource, isTeacher])

  const resultsToShow = useMemo(() => {
    return allResults.filter((r) => {
      if (selectedClass && r.class !== selectedClass) return false
      if (selectedSubject && r.subject !== selectedSubject) return false
      return true
    })
  }, [allResults, selectedClass, selectedSubject])

  const isLoading =
    (isHeadteacher && headteacherLoading) || (isTeacher && !isHeadteacher && teacherLoading)

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
        return 'text-warn bg-warn/20'
      case 'C+':
      case 'C':
        return 'text-accent bg-accent/20'
      default:
        return 'text-royalPurple-dangerTx bg-royalPurple-danger'
    }
  }

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
    if (isHeadteacher) refetchHeadteacher()
    else if (isTeacher) refetchTeacher()
    setTimeout(() => window.location.reload(), 350)
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

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
                          {isHeadteacher && (
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
                            {isHeadteacher && (
                              <td className="py-3 px-4 text-sm text-royalPurple-text2">
                                {result.teacher_name}
                              </td>
                            )}
                            <td className="py-3 px-4 text-sm font-medium">{result.percentage}%</td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeColor(result.grade)}`}
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
