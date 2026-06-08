'use client'

import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { ClipboardList, Plus, Calendar, Users, BookOpen, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { TeacherCompliancePanel } from '@/components/compliance/TeacherCompliancePanel'

export default function AssessmentsPage() {
  const { data: dashboardData } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => api.getTeacherDashboard().then((res) => res.data),
  })

  return (
    <DashboardLayout title="My Assessments">
      <div className="space-y-6">
        <TeacherCompliancePanel domain="assessments" />
        {/* Header */}
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

        {/* Assessment Stats */}
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

        {/* Assessments Table */}
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
                    You haven't created any assessments yet. Start by creating your first
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

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link href="/dashboard/assessments/create">
                <Button variant="outline" className="w-full h-16 flex flex-col">
                  <Plus className="h-5 w-5 mb-1" />
                  Create Assessment
                </Button>
              </Link>
              <Link href="/dashboard/results">
                <Button variant="outline" className="w-full h-16 flex flex-col">
                  <BookOpen className="h-5 w-5 mb-1" />
                  Grade Results
                </Button>
              </Link>
              <Link href="/dashboard/assessments/templates">
                <Button variant="outline" className="w-full h-16 flex flex-col">
                  <ClipboardList className="h-5 w-5 mb-1" />
                  Templates
                </Button>
              </Link>
              <Link href="/dashboard/analytics">
                <Button variant="outline" className="w-full h-16 flex flex-col">
                  <Calendar className="h-5 w-5 mb-1" />
                  Analytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
