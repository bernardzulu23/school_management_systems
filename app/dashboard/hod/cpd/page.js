'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  GraduationCap,
  Plus,
  Calendar,
  Clock,
  Users,
  BookOpen,
  ArrowLeft,
  Download,
  Filter,
  CheckCircle,
  AlertCircle,
  Star,
  Award,
  Target,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

export default function CPDPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [filterStatus, setFilterStatus] = useState('all')

  // Sample CPD data
  const cpdActivities = [
    {
      id: 1,
      title: 'Digital Teaching Methods Workshop',
      teacher: 'Sarah Johnson',
      type: 'Workshop',
      date: '2024-01-20',
      duration: '6 hours',
      status: 'completed',
      provider: 'Education Institute',
      credits: 6,
      rating: 4.5,
    },
    {
      id: 2,
      title: 'Assessment Strategies Course',
      teacher: 'Mike Brown',
      type: 'Online Course',
      date: '2024-01-15',
      duration: '12 hours',
      status: 'in-progress',
      provider: 'Teaching Excellence Hub',
      credits: 12,
      rating: null,
    },
    {
      id: 3,
      title: 'Classroom Management Seminar',
      teacher: 'Emma Wilson',
      type: 'Seminar',
      date: '2024-01-10',
      duration: '4 hours',
      status: 'completed',
      provider: 'Professional Development Center',
      credits: 4,
      rating: 4.8,
    },
    {
      id: 4,
      title: 'Subject Knowledge Update',
      teacher: 'David Lee',
      type: 'Conference',
      date: '2024-01-25',
      duration: '8 hours',
      status: 'scheduled',
      provider: 'Subject Association',
      credits: 8,
      rating: null,
    },
  ]

  const teacherProgress = [
    {
      name: 'Sarah Johnson',
      department: 'Mathematics',
      completedHours: 24,
      requiredHours: 30,
      activities: 4,
      lastActivity: '2024-01-20',
    },
    {
      name: 'Mike Brown',
      department: 'Science',
      completedHours: 18,
      requiredHours: 30,
      activities: 3,
      lastActivity: '2024-01-15',
    },
    {
      name: 'Emma Wilson',
      department: 'English',
      completedHours: 28,
      requiredHours: 30,
      activities: 5,
      lastActivity: '2024-01-10',
    },
    {
      name: 'David Lee',
      department: 'History',
      completedHours: 12,
      requiredHours: 30,
      activities: 2,
      lastActivity: '2024-01-05',
    },
  ]

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-royalPurple-successTx" />
      case 'in-progress':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-royalPurple-accentTx" />
      default:
        return <AlertCircle className="h-4 w-4 text-royalPurple-text3" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'scheduled':
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const getProgressColor = (completed, required) => {
    const percentage = (completed / required) * 100
    if (percentage >= 90) return 'bg-royalPurple-success'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-royalPurple-danger'
  }

  const departmentStats = {
    totalTeachers: 8,
    totalActivities: 24,
    completedActivities: 18,
    averageRating: 4.6,
    totalHours: 156,
  }

  return (
    <DashboardLayout title="CPD File">
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
              <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center">
                <GraduationCap className="h-6 w-6 mr-2" />
                CPD File
              </h1>
              <p className="text-royalPurple-text2">
                Continuous Professional Development tracking and management
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add CPD Activity
            </Button>
          </div>
        </div>

        {/* Department CPD Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-royalPurple-accentTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Teachers</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {departmentStats.totalTeachers}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-royalPurple-successTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Activities</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {departmentStats.totalActivities}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-royalPurple-pillTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Completed</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {departmentStats.completedActivities}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Avg Rating</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {departmentStats.averageRating}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Hours</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {departmentStats.totalHours}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-royalPurple-border">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-royalPurple-border2 text-royalPurple-accentTx'
                  : 'border-transparent text-royalPurple-text3 hover:text-royalPurple-text2 hover:border-royalPurple-border'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activities'
                  ? 'border-royalPurple-border2 text-royalPurple-accentTx'
                  : 'border-transparent text-royalPurple-text3 hover:text-royalPurple-text2 hover:border-royalPurple-border'
              }`}
            >
              Activities
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'progress'
                  ? 'border-royalPurple-border2 text-royalPurple-accentTx'
                  : 'border-transparent text-royalPurple-text3 hover:text-royalPurple-text2 hover:border-royalPurple-border'
              }`}
            >
              Teacher Progress
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'activities' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>CPD Activities</CardTitle>
                <select
                  className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Activity</th>
                      <th className="text-left py-3 px-4">Teacher</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Duration</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Credits</th>
                      <th className="text-left py-3 px-4">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cpdActivities.map((activity) => (
                      <tr key={activity.id} className="border-b hover:bg-royalPurple-page">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{activity.title}</div>
                            <div className="text-sm text-royalPurple-text3">
                              {activity.provider}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">{activity.teacher}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs rounded-full bg-royalPurple-card2 text-royalPurple-text1">
                            {activity.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-royalPurple-text3">
                          {new Date(activity.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">{activity.duration}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {getStatusIcon(activity.status)}
                            <span
                              className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(activity.status)}`}
                            >
                              {activity.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">{activity.credits}</td>
                        <td className="py-3 px-4">
                          {activity.rating ? (
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 mr-1" />
                              <span>{activity.rating}</span>
                            </div>
                          ) : (
                            <span className="text-royalPurple-text3">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'progress' && (
          <Card>
            <CardHeader>
              <CardTitle>Teacher CPD Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teacherProgress.map((teacher, index) => (
                  <div key={index} className="p-4 border border-royalPurple-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-royalPurple-text1">{teacher.name}</h4>
                        <p className="text-sm text-royalPurple-text3">
                          {teacher.department} Department
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {teacher.completedHours}/{teacher.requiredHours} hours
                        </p>
                        <p className="text-xs text-royalPurple-text3">
                          {Math.round((teacher.completedHours / teacher.requiredHours) * 100)}%
                          complete
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-royalPurple-card2 rounded-full h-2 mb-3">
                      <div
                        className={`h-2 rounded-full ${getProgressColor(teacher.completedHours, teacher.requiredHours)}`}
                        style={{
                          width: `${Math.min((teacher.completedHours / teacher.requiredHours) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-royalPurple-text2">
                      <span>{teacher.activities} activities completed</span>
                      <span>
                        Last activity: {new Date(teacher.lastActivity).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Department CPD Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-royalPurple-success rounded-lg">
                    <div className="flex items-center">
                      <Award className="h-5 w-5 text-royalPurple-successTx mr-2" />
                      <span className="font-medium">On Track Teachers</span>
                    </div>
                    <span className="text-royalPurple-successTx font-bold">6/8</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                      <span className="font-medium">Need Attention</span>
                    </div>
                    <span className="text-yellow-600 font-bold">2/8</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-royalPurple-accent rounded-lg">
                    <div className="flex items-center">
                      <Target className="h-5 w-5 text-royalPurple-accentTx mr-2" />
                      <span className="font-medium">Department Target</span>
                    </div>
                    <span className="text-royalPurple-accentTx font-bold">240 hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming CPD Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border border-royalPurple-border rounded-lg">
                    <h4 className="font-medium">Technology Integration Workshop</h4>
                    <p className="text-sm text-royalPurple-text2">March 15, 2024 • 6 hours</p>
                    <p className="text-xs text-royalPurple-accentTx">Registration open</p>
                  </div>
                  <div className="p-3 border border-royalPurple-border rounded-lg">
                    <h4 className="font-medium">Assessment Best Practices</h4>
                    <p className="text-sm text-royalPurple-text2">March 22, 2024 • 4 hours</p>
                    <p className="text-xs text-royalPurple-accentTx">Registration open</p>
                  </div>
                  <div className="p-3 border border-royalPurple-border rounded-lg">
                    <h4 className="font-medium">Inclusive Education Seminar</h4>
                    <p className="text-sm text-royalPurple-text2">April 5, 2024 • 8 hours</p>
                    <p className="text-xs text-royalPurple-successTx">Recommended</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
