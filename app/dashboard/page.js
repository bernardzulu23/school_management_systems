'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import SmartDashboardIntegration from '@/components/dashboard/SmartDashboardIntegration'
import { TimetableSummary } from '@/components/dashboard/TimetableSummary'
import {
  Users,
  BookOpen,
  Calendar,
  TrendingUp,
  Award,
  Bell,
  BarChart3,
  Target,
  Clock,
  CheckCircle,
  Zap,
  Brain,
  Gamepad2,
  Settings,
  Rocket,
  Sparkles,
  Download,
  RefreshCw
} from 'lucide-react'
import { CardContent } from '@/components/ui/Card'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    averageAttendance: 0,
    totalUsers: 0,
    totalSubjects: 0,
    totalAssessments: 0
  })
  const [showSmartAnalytics, setShowSmartAnalytics] = useState(true)
  const [analyticsData, setAnalyticsData] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const statsResponse = await api.getDashboardStats()
      setStats(statsResponse.data)

      // You can also fetch other data for the dashboard here
      // For example, recent announcements or upcoming events
      // const announcementsResponse = await api.getAnnouncements({ limit: 5 });
      // setAnnouncements(announcementsResponse.data);

      // Fetch analytics data
      // This is a placeholder for a real analytics API endpoint
      // const analyticsResponse = await api.get('/analytics/summary');
      // setAnalyticsData(analyticsResponse.data);

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const getUserRole = () => {
    return user?.role || 'teacher' // Default to teacher for demo
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to access the dashboard</h2>
          <Button onClick={() => window.location.href = '/login'}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🎓 School Management Dashboard
              </h1>
              <p className="text-gray-600">
                Welcome back, {user.name} ({getUserRole()})
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setShowSmartAnalytics(!showSmartAnalytics)}
                className={`btn-sm ${showSmartAnalytics ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Brain className="w-4 h-4 mr-2" />
                {showSmartAnalytics ? 'Hide' : 'Show'} Smart Analytics
              </Button>
              
              <Button onClick={logout} className="btn-secondary btn-sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalStudents}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Teachers</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalTeachers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Classes</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalClasses}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Attendance</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.averageAttendance}%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Smart Analytics Integration */}
        {showSmartAnalytics && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Zap className="w-6 h-6 text-yellow-500 mr-2" />
                    Smart Analytics Dashboard
                  </h2>
                  <p className="text-gray-600 mt-1">
                    AI-powered insights without external APIs • Real-time analytics • Predictive patterns
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => window.open('/test-pwa.html', '_blank')}
                    className="btn-secondary btn-sm"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Test PWA
                  </Button>
                  <Button 
                    onClick={() => window.open('/test-reports.html', '_blank')}
                    className="btn-secondary btn-sm"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Test Reports
                  </Button>
                </div>
              </div>
            </div>

            {analyticsData.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Analytics Data Available</h3>
                  <p className="text-gray-600 mb-6">
                    Analytics data will appear here once students start using the system and generating activity.
                  </p>
                  <Button variant="outline" onClick={fetchDashboardData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <SmartDashboardIntegration
                userRole={getUserRole()}
                userData={user}
                studentData={analyticsData}
              />
            )}
          </div>
        )}

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* User Management */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard/users'}>
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers || '0'}</p>
                <p className="text-sm text-gray-500">Total Users</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
            <p className="text-sm text-gray-600">Manage all system users and permissions</p>
          </Card>

          {/* Registration */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/admin/registration'}>
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-green-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">New</p>
                <p className="text-sm text-gray-500">Registration</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Registration</h3>
            <p className="text-sm text-gray-600">Register new users to the system</p>
          </Card>

          {/* Subjects */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/admin/subjects'}>
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="h-8 w-8 text-purple-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubjects || '0'}</p>
                <p className="text-sm text-gray-500">Subjects</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Subjects</h3>
            <p className="text-sm text-gray-600">Manage curriculum subjects</p>
          </Card>

          {/* Teacher Performance */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/admin/teacher-performance'}>
            <div className="flex items-center justify-between mb-4">
              <Target className="h-8 w-8 text-orange-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">0%</p>
                <p className="text-sm text-gray-500">Avg Score</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Teacher Performance</h3>
            <p className="text-sm text-gray-600">Monitor teacher evaluations</p>
          </Card>

          {/* Classes */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard/classes'}>
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-indigo-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{stats.totalClasses}</p>
                <p className="text-sm text-gray-500">Classes</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Classes</h3>
            <p className="text-sm text-gray-600">Manage class schedules and assignments</p>
          </Card>

          {/* Master Timetable - Only for Headteacher */}
          {user?.role === 'headteacher' && (
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard/timetable/master'}>
              <div className="flex items-center justify-between mb-4">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">5</p>
                  <p className="text-sm text-gray-500">Days/Week</p>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Master Timetable</h3>
              <p className="text-sm text-gray-600">Create and manage school timetable</p>
            </Card>
          )}

          {/* Department Timetable - Only for HOD */}
          {user?.role === 'hod' && (
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard/timetable/hod'}>
              <div className="flex items-center justify-between mb-4">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">Teachers</p>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Department Timetable</h3>
              <p className="text-sm text-gray-600">View department schedule overview</p>
            </Card>
          )}

          {/* My Timetable - For Teachers and Students */}
          {(user?.role === 'teacher' || user?.role === 'student') && (
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = user?.role === 'teacher' ? '/dashboard/timetable/teacher' : '/dashboard/timetable/student'}>
              <div className="flex items-center justify-between mb-4">
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{user?.role === 'teacher' ? '0' : '0'}</p>
                  <p className="text-sm text-gray-500">{user?.role === 'teacher' ? 'Periods' : 'Subjects'}</p>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">My Timetable</h3>
              <p className="text-sm text-gray-600">{user?.role === 'teacher' ? 'View your teaching schedule' : 'View your class schedule'}</p>
            </Card>
          )}

          {/* Assessments */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard/assessments'}>
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="h-8 w-8 text-teal-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{stats.totalAssessments || '0'}</p>
                <p className="text-sm text-gray-500">Assessments</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Assessments</h3>
            <p className="text-sm text-gray-600">Create and manage assessments</p>
          </Card>

          {/* Results */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard/results'}>
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="h-8 w-8 text-cyan-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">0%</p>
                <p className="text-sm text-gray-500">Avg Grade</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Results</h3>
            <p className="text-sm text-gray-600">View and analyze student results</p>
          </Card>

          {/* Reports */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard/reports'}>
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-8 w-8 text-red-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-500">Reports</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports</h3>
            <p className="text-sm text-gray-600">Generate comprehensive reports</p>
          </Card>

          {/* Innovation Hub - Special Feature */}
          <Card className="p-6 bg-gradient-to-br from-purple-600 to-blue-600 text-white cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl" onClick={() => window.location.href = '/dashboard/innovation'}>
            <div className="flex items-center justify-between mb-4">
              <div className="relative">
                <Rocket className="h-8 w-8 text-white" />
                <Sparkles className="h-4 w-4 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">NEW</p>
                <p className="text-sm text-purple-200">Innovation</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">🚀 Innovation Hub</h3>
            <p className="text-sm text-purple-100 mb-3">AI, AR/VR, Mental Health & Blockchain</p>
            <div className="text-xs text-purple-200">
              ✨ Explore Innovation →
            </div>
          </Card>
        </div>

        {/* Today's Schedule - Only for Students and Teachers */}
        {(user?.role === 'student' || user?.role === 'teacher') && (
          <div className="mt-8">
            <TimetableSummary
              userRole={user?.role}
              userId={user?.id}
              className="max-w-2xl"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Target className="w-5 h-5 text-blue-500 mr-2" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button className="w-full btn-primary" onClick={() => window.location.href = '/dashboard/users'}>
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
              <Button className="w-full btn-secondary" onClick={() => window.location.href = '/dashboard/classes'}>
                <BookOpen className="w-4 h-4 mr-2" />
                View Classes
              </Button>
              <Button className="w-full btn-secondary" onClick={() => window.location.href = '/dashboard/assessments'}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Assessments
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Bell className="w-5 h-5 text-orange-500 mr-2" />
              Recent Alerts
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">No alerts at this time</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Award className="w-5 h-5 text-purple-500 mr-2" />
              Achievements
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Perfect Attendance</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">0 students</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">High Achievers</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">0 students</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Improvement Stars</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">0 students</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
