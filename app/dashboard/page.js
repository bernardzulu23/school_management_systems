'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { startTopLoading, stopTopLoading } from '@/lib/uiProgress'
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
  LayoutDashboard,
} from 'lucide-react'
import { CardContent } from '@/components/ui/card'
import ResponsiveDashboardLayout from '@/components/dashboard/ResponsiveDashboardLayout'
import AIFeaturesShowcase from '@/components/dashboard/AIFeaturesShowcase'

export default function DashboardPage() {
  const { user, logout, syncSession } = useAuth()
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    averageAttendance: 0,
    totalUsers: 0,
    totalSubjects: 0,
    totalAssessments: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSmartAnalytics, setShowSmartAnalytics] = useState(true)
  const [analyticsData, setAnalyticsData] = useState([])
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setIsLoading(true)
        setError(null)
        await syncSession?.({ force: true })
      } finally {
        setAuthChecked(true)
      }
    }

    bootstrap()
  }, [])

  const fetchDashboardData = async () => {
    startTopLoading('Refreshing')
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
      stopTopLoading()
    }
  }

  useEffect(() => {
    if (!authChecked) return
    if (!user) {
      setIsLoading(false)
      return
    }
    fetchDashboardData()
  }, [authChecked, user?.id])

  const getUserRole = () => {
    return user?.role || 'teacher' // Default to teacher for demo
  }

  if (isLoading || !authChecked) {
    return (
      <ResponsiveDashboardLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
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
          <div className="bg-royalPurple-danger w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="h-8 w-8 text-royalPurple-dangerTx" />
          </div>
          <h2 className="text-2xl font-bold text-royalPurple-text1 mb-2">Something went wrong</h2>
          <p className="text-royalPurple-text2 mb-6 max-w-md mx-auto">{error}</p>
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
          <Button onClick={() => (window.location.href = '/login')}>Go to Login</Button>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveDashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <section>
          <h1 className="text-2xl font-bold text-g-900 dark:text-g-50">Dashboard</h1>
          <p className="text-g-600 dark:text-g-300 mt-1">
            Welcome back, {user?.name}. Here's what's happening today.
          </p>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            className="text-left w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-royalPurple-border2 rounded-xl"
            onClick={() => (window.location.href = '/dashboard/users')}
            aria-label="Open students"
          >
            <Card className="p-4 flex items-center gap-3 hover:-translate-y-px hover:shadow-lg hover:border-ink/20 transition-all">
              <div className="bg-g-100 dark:bg-g-900 border border-g-200 dark:border-white/[0.09] rounded-[12px] w-11 h-11 flex items-center justify-center">
                <Users className="h-6 w-6 text-g-800 dark:text-g-50" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-g-600 dark:text-g-300">Total Students</p>
                <p className="text-[22px] font-bold text-g-900 dark:text-g-50 leading-tight">
                  {stats.totalStudents}
                </p>
              </div>
            </Card>
          </button>

          <button
            type="button"
            className="text-left w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-royalPurple-border2 rounded-xl"
            onClick={() => (window.location.href = '/dashboard/users')}
            aria-label="Open teachers"
          >
            <Card className="p-4 flex items-center gap-3 hover:-translate-y-px hover:shadow-lg hover:border-ink/20 transition-all">
              <div className="bg-g-100 dark:bg-g-900 border border-g-200 dark:border-white/[0.09] rounded-[12px] w-11 h-11 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-g-800 dark:text-g-50" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-g-600 dark:text-g-300">Total Teachers</p>
                <p className="text-[22px] font-bold text-g-900 dark:text-g-50 leading-tight">
                  {stats.totalTeachers}
                </p>
              </div>
            </Card>
          </button>

          <button
            type="button"
            className="text-left w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-royalPurple-border2 rounded-xl"
            onClick={() => (window.location.href = '/dashboard/classes')}
            aria-label="Open classes"
          >
            <Card className="p-4 flex items-center gap-3 hover:-translate-y-px hover:shadow-lg hover:border-ink/20 transition-all">
              <div className="bg-g-100 dark:bg-g-900 border border-g-200 dark:border-white/[0.09] rounded-[12px] w-11 h-11 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-g-800 dark:text-g-50" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-g-600 dark:text-g-300">Total Classes</p>
                <p className="text-[22px] font-bold text-g-900 dark:text-g-50 leading-tight">
                  {stats.totalClasses}
                </p>
              </div>
            </Card>
          </button>

          <button
            type="button"
            className="text-left w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-royalPurple-border2 rounded-xl"
            onClick={() => (window.location.href = '/dashboard/attendance')}
            aria-label="Open attendance"
          >
            <Card className="p-4 flex items-center gap-3 hover:-translate-y-px hover:shadow-lg hover:border-ink/20 transition-all">
              <div className="bg-g-100 dark:bg-g-900 border border-g-200 dark:border-white/[0.09] rounded-[12px] w-11 h-11 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-g-800 dark:text-g-50" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-g-600 dark:text-g-300">Avg Attendance</p>
                <p className="text-[22px] font-bold text-g-900 dark:text-g-50 leading-tight">
                  {stats.averageAttendance}%
                </p>
              </div>
            </Card>
          </button>
        </section>

        {/* AI Features Showcase */}
        <AIFeaturesShowcase />

        {/* Smart Analytics Integration */}
        {showSmartAnalytics && (
          <section className="mb-8" aria-labelledby="analytics-title">
            <div className="bg-royalPurple-card dark:bg-g-800 rounded-[14px] border border-black/[0.09] dark:border-white/[0.09] p-6 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="analytics-title"
                    className="text-xl font-bold text-g-900 dark:text-g-50 flex items-center"
                  >
                    <Zap className="w-6 h-6 text-g-700 dark:text-g-200 mr-2" />
                    Smart Analytics Dashboard
                  </h2>
                  <p className="text-g-600 dark:text-g-300 mt-1">
                    AI-powered insights without external APIs • Real-time analytics • Predictive
                    patterns
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => window.open('/test-pwa.html', '_blank')}
                    variant="secondary"
                    size="sm"
                    aria-label="Test PWA in new tab"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Test PWA
                  </Button>
                  <Button
                    onClick={() => window.open('/test-reports.html', '_blank')}
                    variant="secondary"
                    size="sm"
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
                  <BarChart3 className="h-16 w-16 text-royalPurple-text3 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-royalPurple-text1 mb-2">
                    No Analytics Data Available
                  </h3>
                  <p className="text-royalPurple-text2 mb-6">
                    Analytics data will appear here once students start using the system and
                    generating activity.
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
        <section
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          aria-label="Quick navigation"
        >
          <ul className="contents" role="list">
            {/* User Management */}
            <li role="listitem">
              <button
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-g-500 rounded-xl transition-shadow"
                onClick={() => (window.location.href = '/dashboard/users')}
                aria-label="Go to User Management"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-royalPurple-border2">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="h-8 w-8 text-royalPurple-accentTx" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-royalPurple-text1">
                        {stats.totalUsers || '0'}
                      </p>
                      <p className="text-sm text-royalPurple-text3">Total Users</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-royalPurple-text1 mb-2">
                    User Management
                  </h3>
                  <p className="text-sm text-royalPurple-text2">
                    Manage all system users and permissions
                  </p>
                </Card>
              </button>
            </li>

            {/* Registration */}
            <li role="listitem">
              <button
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-kpi-pass/100 rounded-xl transition-shadow"
                onClick={() => (window.location.href = '/admin/registration')}
                aria-label="Go to Registration"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-royalPurple-border">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="h-8 w-8 text-royalPurple-successTx" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-royalPurple-text1">New</p>
                      <p className="text-sm text-royalPurple-text3">Registration</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-royalPurple-text1 mb-2">
                    Registration
                  </h3>
                  <p className="text-sm text-royalPurple-text2">Register new users to the system</p>
                </Card>
              </button>
            </li>

            {/* Subjects */}
            <li role="listitem">
              <button
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/100 rounded-xl transition-shadow"
                onClick={() => (window.location.href = '/admin/subjects')}
                aria-label="Go to Subjects Management"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-royalPurple-border2">
                  <div className="flex items-center justify-between mb-4">
                    <BookOpen className="h-8 w-8 text-royalPurple-pillTx" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-royalPurple-text1">
                        {stats.totalSubjects || '0'}
                      </p>
                      <p className="text-sm text-royalPurple-text3">Subjects</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-royalPurple-text1 mb-2">Subjects</h3>
                  <p className="text-sm text-royalPurple-text2">Manage curriculum subjects</p>
                </Card>
              </button>
            </li>

            {/* Teacher Performance */}
            <li role="listitem">
              <button
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/100 rounded-xl transition-shadow"
                onClick={() => (window.location.href = '/dashboard/teacher-performance')}
                aria-label="Go to Teacher Performance"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-accent/40">
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="h-8 w-8 text-accent" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-royalPurple-text1">Live</p>
                      <p className="text-sm text-royalPurple-text3">Tracking</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-royalPurple-text1 mb-2">Performance</h3>
                  <p className="text-sm text-royalPurple-text2">
                    Monitor teacher attendance and performance
                  </p>
                </Card>
              </button>
            </li>

            {/* Timetable Management - Headteacher */}
            {user?.role?.toLowerCase() === 'headteacher' && (
              <li role="listitem">
                <button
                  className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-g-500 rounded-xl transition-shadow"
                  onClick={() => (window.location.href = '/dashboard/headteacher/timetable')}
                  aria-label="Go to Timetable Generator"
                >
                  <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-royalPurple-border2">
                    <div className="flex items-center justify-between mb-4">
                      <Calendar className="h-8 w-8 text-royalPurple-pillTx" aria-hidden="true" />
                      <div className="text-right">
                        <p className="text-2xl font-bold text-royalPurple-text1">Gen</p>
                        <p className="text-sm text-royalPurple-text3">Timetable</p>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-royalPurple-text1 mb-2">
                      Master Timetable
                    </h3>
                    <p className="text-sm text-royalPurple-text2">
                      Generate and manage the school schedule
                    </p>
                  </Card>
                </button>
              </li>
            )}

            {/* Class Allocation - HOD */}
            {user?.role?.toLowerCase() === 'hod' && (
              <li role="listitem">
                <button
                  className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/100 rounded-xl transition-shadow"
                  onClick={() => (window.location.href = '/dashboard/hod/allocation')}
                  aria-label="Go to Class Allocation"
                >
                  <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-royalPurple-border2">
                    <div className="flex items-center justify-between mb-4">
                      <BookOpen className="h-8 w-8 text-royalPurple-pillTx" aria-hidden="true" />
                      <div className="text-right">
                        <p className="text-2xl font-bold text-royalPurple-text1">Push</p>
                        <p className="text-sm text-royalPurple-text3">Assignments</p>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-royalPurple-text1 mb-2">
                      Class Allocation
                    </h3>
                    <p className="text-sm text-royalPurple-text2">
                      Assign teachers to subjects and classes
                    </p>
                  </Card>
                </button>
              </li>
            )}

            {/* Gamification */}
            <li role="listitem">
              <button
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-warn/100 rounded-xl transition-shadow"
                onClick={() => (window.location.href = '/dashboard/gamification')}
                aria-label="Go to Gamification Dashboard"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-warn/40">
                  <div className="flex items-center justify-between mb-4">
                    <Award className="h-8 w-8 text-warn" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-royalPurple-text1">Play</p>
                      <p className="text-sm text-royalPurple-text3">Learning</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-royalPurple-text1 mb-2">
                    Gamification
                  </h3>
                  <p className="text-sm text-royalPurple-text2">
                    Educational games and student rewards
                  </p>
                </Card>
              </button>
            </li>

            {/* Smart Reports */}
            <li role="listitem">
              <button
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-g-500 rounded-xl transition-shadow"
                onClick={() => (window.location.href = '/dashboard/reports/smart')}
                aria-label="Go to Smart Reports"
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-g-200">
                  <div className="flex items-center justify-between mb-4">
                    <BarChart3 className="h-8 w-8 text-g-600" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-royalPurple-text1">AI</p>
                      <p className="text-sm text-royalPurple-text3">Reports</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-royalPurple-text1 mb-2">
                    Smart Reports
                  </h3>
                  <p className="text-sm text-royalPurple-text2">
                    Generate AI-driven academic reports
                  </p>
                </Card>
              </button>
            </li>

            {/* My Timetable - For Teachers and Students */}
            {(user?.role === 'teacher' || user?.role === 'student') && (
              <li role="listitem">
                <button
                  className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-kpi-pass/100 rounded-xl transition-shadow"
                  onClick={() =>
                    (window.location.href =
                      user?.role === 'teacher'
                        ? '/dashboard/timetable/teacher'
                        : '/dashboard/timetable/student')
                  }
                  aria-label="Go to My Timetable"
                >
                  <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-royalPurple-border">
                    <div className="flex items-center justify-between mb-4">
                      <Calendar className="h-8 w-8 text-royalPurple-successTx" aria-hidden="true" />
                      <div className="text-right">
                        <p className="text-2xl font-bold text-royalPurple-text1">
                          {user?.role === 'teacher' ? '0' : '0'}
                        </p>
                        <p className="text-sm text-royalPurple-text3">
                          {user?.role === 'teacher' ? 'Periods' : 'Subjects'}
                        </p>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-royalPurple-text1 mb-2">
                      My Timetable
                    </h3>
                    <p className="text-sm text-royalPurple-text2">
                      {user?.role === 'teacher'
                        ? 'View your teaching schedule'
                        : 'View your class schedule'}
                    </p>
                  </Card>
                </button>
              </li>
            )}

            {/* Innovation Hub - Special Feature */}
            <li role="listitem">
              <button
                className="text-left w-full h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded-xl transition-shadow"
                onClick={() => (window.location.href = '/dashboard/innovation')}
                aria-label="Go to Innovation Hub"
              >
                <Card className="p-6 h-full bg-gradient-to-br from-accent to-ink text-royalPurple-text1 transform group-hover:scale-[1.02] transition-all duration-300 group-hover:shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="relative">
                      <Rocket className="h-8 w-8 text-royalPurple-text1" aria-hidden="true" />
                      <Sparkles
                        className="h-4 w-4 text-warn/70 absolute -top-1 -right-1 animate-pulse"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-royalPurple-text1">NEW</p>
                      <p className="text-sm text-royalPurple-pillTx">Innovation</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-royalPurple-text1 mb-2">
                    Innovation Hub
                  </h3>
                  <p className="text-sm text-royalPurple-pillTx mb-3">
                    AI, AR/VR, Mental Health & Blockchain
                  </p>
                  <div className="text-xs text-royalPurple-pillTx">Explore Innovation →</div>
                </Card>
              </button>
            </li>
          </ul>
        </section>

        {/* Today's Schedule Section */}
        <section className="mt-8" aria-labelledby="schedule-title">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="schedule-title"
              className="text-xl font-bold text-royalPurple-text1 flex items-center"
            >
              <Clock className="w-6 h-6 text-royalPurple-accentTx mr-2" />
              Your Schedule Today
            </h2>
          </div>
          <TimetableSummary userRole={user?.role} userId={user?.id} className="max-w-none" />
        </section>
      </div>

      <footer className="bg-royalPurple-card border-t mt-12 py-8" aria-label="Dashboard footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-royalPurple-text3 text-sm">
            2025 Zambian School Management System - Empowering Rural Education Through Innovation
          </p>
        </div>
      </footer>
    </ResponsiveDashboardLayout>
  )
}
