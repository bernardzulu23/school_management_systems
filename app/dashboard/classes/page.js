'use client'

import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { Users, Plus, Calendar, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default function ClassesPage() {
  const { data: dashboardData } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => api.getTeacherDashboard().then(res => res.data),
  })

  return (
    <DashboardLayout title="My Classes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
            <p className="text-gray-600">Manage your assigned classes and students</p>
          </div>
          <Link href="/dashboard/classes/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </Link>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardData?.my_classes?.map((classItem) => (
            <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{classItem.name}</span>
                  <Users className="h-5 w-5 text-gray-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Student Count */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Students</span>
                    <span className="font-medium">{classItem.student_count}/{classItem.capacity}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(classItem.student_count / classItem.capacity) * 100}%`
                      }}
                    ></div>
                  </div>

                  {/* Next Class */}
                  {classItem.next_class && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Next: {classItem.next_class}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Link href={`/dashboard/classes/${classItem.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/dashboard/attendance?class=${classItem.id}`}>
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {(!dashboardData?.my_classes || dashboardData.my_classes.length === 0) && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Assigned</h3>
              <p className="text-gray-600 mb-4">
                You don't have any classes assigned yet. Contact your administrator to get classes assigned.
              </p>
              <Link href="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
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
              <Link href="/dashboard/attendance">
                <Button variant="outline" className="w-full h-16 flex flex-col">
                  <Users className="h-5 w-5 mb-1" />
                  Take Attendance
                </Button>
              </Link>
              <Link href="/dashboard/assessments/create">
                <Button variant="outline" className="w-full h-16 flex flex-col">
                  <BookOpen className="h-5 w-5 mb-1" />
                  Create Assessment
                </Button>
              </Link>
              <Link href="/dashboard/results">
                <Button variant="outline" className="w-full h-16 flex flex-col">
                  <Calendar className="h-5 w-5 mb-1" />
                  View Results
                </Button>
              </Link>
              <Link href="/dashboard/timetable">
                <Button variant="outline" className="w-full h-16 flex flex-col">
                  <Calendar className="h-5 w-5 mb-1" />
                  Timetable
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
