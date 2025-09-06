'use client'

import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { BookOpen, Plus, Users, TrendingUp, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function SubjectsPage() {
  const { data: dashboardData } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => api.getTeacherDashboard().then(res => res.data),
  })

  return (
    <DashboardLayout title="My Subjects">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Subjects</h1>
            <p className="text-gray-600">Manage your assigned subjects and curriculum</p>
          </div>
          <Link href="/dashboard/subjects/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </Link>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardData?.my_subjects?.map((subject) => (
            <Card key={subject.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <span>{subject.name}</span>
                    <p className="text-sm text-gray-500 font-normal">Code: {subject.code}</p>
                  </div>
                  <BookOpen className="h-5 w-5 text-gray-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Subject Stats */}
                  {subject.classes && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Classes:</span>
                        <p className="font-medium">{subject.classes.join(', ')}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Students:</span>
                        <p className="font-medium">{subject.students}</p>
                      </div>
                    </div>
                  )}

                  {/* Performance */}
                  {subject.average_grade && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Average Grade:</span>
                        <span className="font-medium">{subject.average_grade}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress:</span>
                        <span className="font-medium">{subject.progress}</span>
                      </div>
                    </div>
                  )}

                  {/* Next Assessment */}
                  {subject.next_assessment && (
                    <div className="flex items-center text-sm text-gray-600 bg-blue-50 p-2 rounded">
                      <Calendar className="h-4 w-4 mr-2" />
                      Next Assessment: {subject.next_assessment}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Link href={`/dashboard/subjects/${subject.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/dashboard/assessments/create?subject=${subject.id}`}>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {(!dashboardData?.my_subjects || dashboardData.my_subjects.length === 0) && (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Assigned</h3>
              <p className="text-gray-600 mb-4">
                You don't have any subjects assigned yet. Contact your administrator to get subjects assigned.
              </p>
              <Link href="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Subject Performance Overview */}
        {dashboardData?.my_subjects && dashboardData.my_subjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Subject Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboardData.stats?.total_subjects || dashboardData.my_subjects.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Subjects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {dashboardData.stats?.total_classes || 3}
                  </div>
                  <div className="text-sm text-gray-600">Total Classes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {dashboardData.stats?.total_students || 130}
                  </div>
                  <div className="text-sm text-gray-600">Total Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {dashboardData.stats?.avg_performance || '80%'}
                  </div>
                  <div className="text-sm text-gray-600">Avg. Performance</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              <Link href="/dashboard/materials">
                <Button variant="outline" className="w-full h-16 flex flex-col">
                  <BookOpen className="h-5 w-5 mb-1" />
                  Teaching Materials
                </Button>
              </Link>
              <Link href="/dashboard/results">
                <Button variant="outline" className="w-full h-16 flex flex-col">
                  <TrendingUp className="h-5 w-5 mb-1" />
                  View Results
                </Button>
              </Link>
              <Link href="/dashboard/attendance">
                <Button variant="outline" className="w-full h-16 flex flex-col">
                  <Users className="h-5 w-5 mb-1" />
                  Take Attendance
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
