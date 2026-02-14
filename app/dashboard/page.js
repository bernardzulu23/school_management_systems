'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import SmartDashboardIntegration from '@/components/dashboard/SmartDashboardIntegration'
import { TimetableSummary } from '@/components/dashboard/TimetableSummary'
import SkeletonLoader from '@/components/SkeletonLoader'
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
  RefreshCw,
  LayoutDashboard
} from 'lucide-react'
import { CardContent } from '@/components/ui/card'
import ResponsiveDashboardLayout from '@/components/dashboard/ResponsiveDashboardLayout'

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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSmartAnalytics, setShowSmartAnalytics] = useState(true)
  const [analyticsData, setAnalyticsData] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const statsResponse = await api.getDashboardStats()
      if (statsResponse.data?.success) {
        setStats(statsResponse.data.data)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError('Failed to load dashboard statistics. Please check your connection and try again.')
      toast.error('Failed to load dashboard statistics.')
    } finally {
      setIsLoading(false)
    }
  }

  const getUserRole = () => {
    return user?.role || 'teacher' // Default to teacher for demo
  }

  if (isLoading) {
    return (
      <ResponsiveDashboardLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <SkeletonLoader key={n} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <SkeletonLoader className="h-64 w-full rounded-xl" />
        </div>
      </ResponsiveDashboardLayout>
    )
  }

  if (error) {
    return (
      <ResponsiveDashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
          <Button onClick={fetchDashboardData}>Try Again</Button>
        </div>
      </ResponsiveDashboardLayout>
    )
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
    <ResponsiveDashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <section>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}. Here's what's happening today.</p>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Students</p>
                <p className="text-3xl font-bold mt-1">{stats.totalStudents}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Teachers</p>
                <p className="text-3xl font-bold mt-1">{stats.totalTeachers}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Classes</p>
                <p className="text-3xl font-bold mt-1">{stats.totalClasses}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Avg Attendance</p>
                <p className="text-3xl font-bold mt-1">{stats.averageAttendance}%</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>
        </section>

        {/* Smart Analytics Integration */}
        {showSmartAnalytics && (
          <section className="mb-8" aria-labelledby="analytics-title">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="analytics-title" className="text-xl font-bold text-gray-900 flex items-center">
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
                    aria-label="Test PWA in new tab"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Test PWA
                  </Button>
                  <Button 
                    onClick={() => window.open('/test-reports.html', '_blank')}
                    className="btn-secondary btn-sm"
                    aria-label="Test Reports in new tab"
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
          </section>
        )}

        {/* Main Navigation Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" aria-label="Quick navigation">
          <ul className="contents" role="list">
            {/* User Management */}
            <li role="listitem">
              <button 
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl transition-shadow"
                onClick={() => window.location.href = '/dashboard/users'}
                aria-label="Go to User Management"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="h-8 w-8 text-blue-600" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{stats.totalUsers || '0'}</p>
                      <p className="text-sm text-gray-500">Total Users</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
                  <p className="text-sm text-gray-600">Manage all system users and permissions</p>
                </Card>
              </button>
            </li>

            {/* Registration */}
            <li role="listitem">
              <button 
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl transition-shadow"
                onClick={() => window.location.href = '/admin/registration'}
                aria-label="Go to Registration"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="h-8 w-8 text-green-600" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">New</p>
                      <p className="text-sm text-gray-500">Registration</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Registration</h3>
                  <p className="text-sm text-gray-600">Register new users to the system</p>
                </Card>
              </button>
            </li>

            {/* Subjects */}
            <li role="listitem">
              <button 
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl transition-shadow"
                onClick={() => window.location.href = '/admin/subjects'}
                aria-label="Go to Subjects Management"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <BookOpen className="h-8 w-8 text-purple-600" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{stats.totalSubjects || '0'}</p>
                      <p className="text-sm text-gray-500">Subjects</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Subjects</h3>
                  <p className="text-sm text-gray-600">Manage curriculum subjects</p>
                </Card>
              </button>
            </li>

            {/* Teacher Performance */}
            <li role="listitem">
              <button 
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-xl transition-shadow"
                onClick={() => window.location.href = '/dashboard/teacher-performance'}
                aria-label="Go to Teacher Performance"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="h-8 w-8 text-orange-600" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">Live</p>
                      <p className="text-sm text-gray-500">Tracking</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance</h3>
                  <p className="text-sm text-gray-600">Monitor teacher attendance and performance</p>
                </Card>
              </button>
            </li>

            {/* Timetable Management */}
            <li role="listitem">
              <button 
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl transition-shadow"
                onClick={() => window.location.href = '/dashboard/timetable/master'}
                aria-label="Go to Master Timetable"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-indigo-200">
                  <div className="flex items-center justify-between mb-4">
                    <Calendar className="h-8 w-8 text-indigo-600" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">Master</p>
                      <p className="text-sm text-gray-500">Timetable</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Master Timetable</h3>
                  <p className="text-sm text-gray-600">View and manage the school-wide timetable</p>
                </Card>
              </button>
            </li>

            {/* Gamification */}
            <li role="listitem">
              <button 
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 rounded-xl transition-shadow"
                onClick={() => window.location.href = '/dashboard/gamification'}
                aria-label="Go to Gamification Dashboard"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-yellow-200">
                  <div className="flex items-center justify-between mb-4">
                    <Award className="h-8 w-8 text-yellow-600" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">Play</p>
                      <p className="text-sm text-gray-500">Learning</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Gamification</h3>
                  <p className="text-sm text-gray-600">Educational games and student rewards</p>
                </Card>
              </button>
            </li>

            {/* Smart Reports */}
            <li role="listitem">
              <button 
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-xl transition-shadow"
                onClick={() => window.location.href = '/dashboard/reports/smart'}
                aria-label="Go to Smart Reports"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-cyan-200">
                  <div className="flex items-center justify-between mb-4">
                    <BarChart3 className="h-8 w-8 text-cyan-600" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">AI</p>
                      <p className="text-sm text-gray-500">Reports</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Reports</h3>
                  <p className="text-sm text-gray-600">Generate AI-driven academic reports</p>
                </Card>
              </button>
            </li>

            {/* Department Timetable - Only for HOD */}
            {user?.role === 'hod' && (
              <li role="listitem">
                <button 
                  className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl transition-shadow"
                  onClick={() => window.location.href = '/dashboard/timetable/hod'}
                  aria-label="Go to Department Timetable"
                >
                  <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <Calendar className="h-8 w-8 text-purple-600" aria-hidden="true" />
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">0</p>
                        <p className="text-sm text-gray-500">Teachers</p>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Department Timetable</h3>
                    <p className="text-sm text-gray-600">View department schedule overview</p>
                  </Card>
                </button>
              </li>
            )}

            {/* My Timetable - For Teachers and Students */}
            {(user?.role === 'teacher' || user?.role === 'student') && (
              <li role="listitem">
                <button 
                  className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl transition-shadow"
                  onClick={() => window.location.href = user?.role === 'teacher' ? '/dashboard/timetable/teacher' : '/dashboard/timetable/student'}
                  aria-label="Go to My Timetable"
                >
                  <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <Calendar className="h-8 w-8 text-green-600" aria-hidden="true" />
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">{user?.role === 'teacher' ? '0' : '0'}</p>
                        <p className="text-sm text-gray-500">{user?.role === 'teacher' ? 'Periods' : 'Subjects'}</p>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">My Timetable</h3>
                    <p className="text-sm text-gray-600">{user?.role === 'teacher' ? 'View your teaching schedule' : 'View your class schedule'}</p>
                  </Card>
                </button>
              </li>
            )}

            {/* Innovation Hub - Special Feature */}
            <li role="listitem">
              <button 
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-xl transition-shadow"
                onClick={() => window.location.href = '/dashboard/innovation'}
                aria-label="Go to Innovation Hub"
              >
                <Card className="p-6 h-full bg-gradient-to-br from-purple-600 to-blue-600 text-white transform group-hover:scale-[1.02] transition-all duration-300 group-hover:shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="relative">
                      <Rocket className="h-8 w-8 text-white" aria-hidden="true" />
                      <Sparkles className="h-4 w-4 text-yellow-300 absolute -top-1 -right-1 animate-pulse" aria-hidden="true" />
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
              </button>
            </li>
          </ul>
        </section>

        {/* Today's Schedule Section */}
        <section className="mt-8" aria-labelledby="schedule-title">
          <div className="flex items-center justify-between mb-4">
            <h2 id="schedule-title" className="text-xl font-bold text-gray-900 flex items-center">
              <Clock className="w-6 h-6 text-blue-600 mr-2" />
              Your Schedule Today
            </h2>
          </div>
          <TimetableSummary
            userRole={user?.role}
            userId={user?.id}
            className="max-w-none"
          />
        </section>
      </div>

      <footer className="bg-white border-t mt-12 py-8" aria-label="Dashboard footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 Zambian School Management System - Empowering Rural Education Through Innovation
          </p>
        </div>
      </footer>
    </ResponsiveDashboardLayout>
  )
}
