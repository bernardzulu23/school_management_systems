'use client'

import { Fragment, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { percentTextClass } from '@/lib/utils/percentColor'
import {
  ClipboardList,
  Plus,
  Calendar,
  Users,
  BookOpen,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  GraduationCap,
} from 'lucide-react'
import Link from 'next/link'
import { TeacherCompliancePanel } from '@/components/compliance/TeacherCompliancePanel'

function formatPct(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return `${value}%`
}

function AdminAssessmentsOverview() {
  const [expandedTeacherId, setExpandedTeacherId] = useState(null)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['assessments-teacher-overview'],
    queryFn: () => api.getAssessmentsTeacherOverview().then((res) => res.data),
  })

  const overview = data?.data
  const summary = overview?.summary
  const teachers = overview?.teachers || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">Assessments Overview</h1>
          <p className="text-royalPurple-text2">
            Teachers giving assessments and how students are performing (%)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
          <Link href="/dashboard/assessments/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Assessment
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-royalPurple-accentTx" />
              <div className="ml-4">
                <p className="text-sm font-medium text-royalPurple-text2">Teachers</p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {summary?.teacherCount ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ClipboardList className="h-8 w-8 text-royalPurple-pillTx" />
              <div className="ml-4">
                <p className="text-sm font-medium text-royalPurple-text2">Assessments</p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {summary?.totalAssessments ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <GraduationCap className="h-8 w-8 text-royalPurple-successTx" />
              <div className="ml-4">
                <p className="text-sm font-medium text-royalPurple-text2">Student attempts</p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {summary?.studentAttempts ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-accent" />
              <div className="ml-4">
                <p className="text-sm font-medium text-royalPurple-text2">School average</p>
                <p
                  className={`text-2xl font-bold ${percentTextClass(summary?.schoolAveragePct ?? 0)}`}
                >
                  {formatPct(summary?.schoolAveragePct)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher performance</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-royalPurple-text2 py-8 text-center">Loading assessment data…</p>
          ) : error ? (
            <p className="text-royalPurple-dangerTx py-8 text-center">
              Could not load overview. Please try again.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="zsms-table">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4 w-8" />
                    <th className="text-left py-3 px-4">Teacher</th>
                    <th className="text-left py-3 px-4">Assessments</th>
                    <th className="text-left py-3 px-4">Published</th>
                    <th className="text-left py-3 px-4">Student attempts</th>
                    <th className="text-left py-3 px-4">Avg performance</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => {
                    const expanded = expandedTeacherId === teacher.teacherId
                    return (
                      <Fragment key={teacher.teacherId}>
                        <tr
                          className="cursor-pointer hover:bg-royalPurple-card2/50"
                          onClick={() => setExpandedTeacherId(expanded ? null : teacher.teacherId)}
                        >
                          <td className="py-3 px-4 text-royalPurple-text3">
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-royalPurple-text1">
                              {teacher.teacherName}
                            </div>
                            {teacher.teacherEmail ? (
                              <div className="text-xs text-royalPurple-text3">
                                {teacher.teacherEmail}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-3 px-4">{teacher.totalAssessments}</td>
                          <td className="py-3 px-4">{teacher.publishedAssessments}</td>
                          <td className="py-3 px-4">{teacher.studentAttempts}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-semibold ${percentTextClass(
                                teacher.averagePerformancePct ?? 0
                              )}`}
                            >
                              {formatPct(teacher.averagePerformancePct)}
                            </span>
                          </td>
                        </tr>
                        {expanded ? (
                          <tr>
                            <td colSpan={6} className="px-4 pb-4 bg-royalPurple-card2/30">
                              <table className="zsms-table w-full mt-2">
                                <thead>
                                  <tr>
                                    <th className="text-left py-2 px-3 text-sm">Assessment</th>
                                    <th className="text-left py-2 px-3 text-sm">Subject</th>
                                    <th className="text-left py-2 px-3 text-sm">Class</th>
                                    <th className="text-left py-2 px-3 text-sm">Status</th>
                                    <th className="text-left py-2 px-3 text-sm">Date</th>
                                    <th className="text-left py-2 px-3 text-sm">Attempts</th>
                                    <th className="text-left py-2 px-3 text-sm">Avg %</th>
                                    <th className="text-left py-2 px-3 text-sm" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {teacher.assessments.map((assessment) => (
                                    <tr key={assessment.id}>
                                      <td className="py-2 px-3 text-sm font-medium">
                                        {assessment.title}
                                      </td>
                                      <td className="py-2 px-3 text-sm">{assessment.subject}</td>
                                      <td className="py-2 px-3 text-sm">{assessment.class}</td>
                                      <td className="py-2 px-3 text-sm capitalize">
                                        {String(assessment.status || '').toLowerCase()}
                                      </td>
                                      <td className="py-2 px-3 text-sm text-royalPurple-text3">
                                        {assessment.date
                                          ? new Date(assessment.date).toLocaleDateString()
                                          : '—'}
                                      </td>
                                      <td className="py-2 px-3 text-sm">{assessment.attempts}</td>
                                      <td className="py-2 px-3 text-sm">
                                        <span
                                          className={`font-semibold ${percentTextClass(
                                            assessment.averagePercentage ?? 0
                                          )}`}
                                        >
                                          {formatPct(assessment.averagePercentage)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-sm">
                                        <Link href={`/dashboard/assessments/${assessment.id}`}>
                                          <Button variant="outline" size="sm">
                                            View
                                          </Button>
                                        </Link>
                                      </td>
                                    </tr>
                                  ))}
                                  {teacher.assessments.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={8}
                                        className="py-4 px-3 text-sm text-royalPurple-text3 text-center"
                                      >
                                        No assessments for this teacher yet.
                                      </td>
                                    </tr>
                                  ) : null}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>

              {teachers.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="h-12 w-12 text-royalPurple-text3 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-royalPurple-text1 mb-2">
                    No teacher assessments yet
                  </h3>
                  <p className="text-royalPurple-text2">
                    When teachers create and publish assessments, their student performance will
                    appear here.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TeacherAssessmentsView() {
  const { data: dashboardData } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => api.getTeacherDashboard().then((res) => res.data),
  })

  return (
    <div className="space-y-6">
      <TeacherCompliancePanel domain="assessments" />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">My Assessments</h1>
          <p className="text-royalPurple-text2">Create and manage your assessments and tests</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/teacher/assessments/ecz">
            <Button variant="outline">
              <ClipboardList className="h-4 w-4 mr-2" />
              ECZ SBA Hub
            </Button>
          </Link>
          <Link href="/dashboard/assessments/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Assessment
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ClipboardList className="h-8 w-8 text-royalPurple-accentTx" />
              <div className="ml-4">
                <p className="text-sm font-medium text-royalPurple-text2">Total Assessments</p>
                <p className="text-2xl font-bold text-royalPurple-text1">
                  {dashboardData?.recent_assessments?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-royalPurple-successTx" />
              <div className="ml-4">
                <p className="text-sm font-medium text-royalPurple-text2">This Week</p>
                <p className="text-2xl font-bold text-royalPurple-text1">3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-royalPurple-pillTx" />
              <div className="ml-4">
                <p className="text-sm font-medium text-royalPurple-text2">Pending Grading</p>
                <p className="text-2xl font-bold text-royalPurple-text1">5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-accent" />
              <div className="ml-4">
                <p className="text-sm font-medium text-royalPurple-text2">Completed</p>
                <p className="text-2xl font-bold text-royalPurple-text1">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="zsms-table">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4">Subject</th>
                  <th className="text-left py-3 px-4">Class</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Start Date</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.recent_assessments?.map((assessment) => (
                  <tr key={assessment.id}>
                    <td className="py-3 px-4 font-medium">{assessment.title}</td>
                    <td className="py-3 px-4">
                      <span className="badge-brand">{assessment.type}</span>
                    </td>
                    <td className="py-3 px-4">{assessment.subject}</td>
                    <td className="py-3 px-4">{assessment.class}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full capitalize ${
                          assessment.status === 'published'
                            ? 'bg-royalPurple-success text-royalPurple-successTx'
                            : assessment.status === 'draft'
                              ? 'bg-warn/20 text-g-800'
                              : 'bg-royalPurple-card2 text-royalPurple-text1'
                        }`}
                      >
                        {assessment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-royalPurple-text3">
                      {new Date(assessment.start_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Link href={`/dashboard/assessments/${assessment.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-royalPurple-dangerTx hover:text-royalPurple-dangerTx"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!dashboardData?.recent_assessments ||
              dashboardData.recent_assessments.length === 0) && (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 text-royalPurple-text3 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-royalPurple-text1 mb-2">
                  No Assessments Created
                </h3>
                <p className="text-royalPurple-text2 mb-4">
                  You haven&apos;t created any assessments yet. Start by creating your first
                  assessment.
                </p>
                <Link href="/dashboard/assessments/create">
                  <Button>Create Your First Assessment</Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AssessmentsPage() {
  const { user } = useAuth()
  const role = String(user?.role || '').toLowerCase()
  const isAdminView =
    role === 'headteacher' || role === 'admin' || role === 'administrator' || role === 'hod'

  return (
    <DashboardLayout title={isAdminView ? 'Assessments Overview' : 'My Assessments'}>
      {isAdminView ? <AdminAssessmentsOverview /> : <TeacherAssessmentsView />}
    </DashboardLayout>
  )
}
