'use client'

import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import {
  Settings,
  BarChart3,
  Target,
  Award,
  AlertCircle,
  Zap,
  Rocket,
  X,
  FileBarChart,
  UserPlus,
  BookOpen,
  TrendingUp,
} from 'lucide-react'
import { HeadteacherProvider, useHeadteacher } from '@/lib/context/HeadteacherContext'
import { ErrorBoundary } from '@/components/dashboard/ErrorBoundary'
import { logger } from '@/lib/utils/logger'
import { ERROR_MESSAGES } from '@/lib/utils/errorMessages'
import SkeletonLoader from '@/components/SkeletonLoader'
import Link from 'next/link'
import { GenderByGradeCard } from '@/components/dashboard/GenderByGradeCard'

// Lazy load heavy dashboard components
const HeadteacherOverview = dynamic(
  () =>
    import('@/components/dashboard/headteacher/HeadteacherOverview').then((m) => ({
      default: m.HeadteacherOverview,
    })),
  { loading: () => <SkeletonLoader /> }
)
const CreativeTeachingHub = dynamic(
  () => import('@/components/creative-teaching/CreativeTeachingHub'),
  { loading: () => <SkeletonLoader /> }
)
const StudentAttentionSystem = dynamic(
  () => import('@/components/dashboard/StudentAttentionSystem'),
  { loading: () => <SkeletonLoader /> }
)
const HeadteacherAnalytics = dynamic(
  () =>
    import('@/components/dashboard/headteacher/HeadteacherAnalytics').then((m) => ({
      default: m.HeadteacherAnalytics,
    })),
  { loading: () => <SkeletonLoader /> }
)
const JuniorPerformanceAnalysis = dynamic(
  () => import('@/components/dashboard/JuniorPerformanceAnalysis'),
  { loading: () => <SkeletonLoader /> }
)
const UserManagement = dynamic(() => import('@/components/dashboard/UserManagement'), {
  loading: () => <SkeletonLoader />,
})
const HeadteacherAcademicManagement = dynamic(
  () =>
    import('@/components/dashboard/headteacher/HeadteacherAcademicManagement').then((m) => ({
      default: m.HeadteacherAcademicManagement,
    })),
  { loading: () => <SkeletonLoader /> }
)
const HeadteacherStrategicPlanning = dynamic(
  () =>
    import('@/components/dashboard/headteacher/HeadteacherStrategicPlanning').then((m) => ({
      default: m.HeadteacherStrategicPlanning,
    })),
  { loading: () => <SkeletonLoader /> }
)
const HeadteacherSettings = dynamic(
  () =>
    import('@/components/dashboard/headteacher/HeadteacherSettings').then((m) => ({
      default: m.HeadteacherSettings,
    })),
  { loading: () => <SkeletonLoader /> }
)
const HeadteacherAdvancedFeatures = dynamic(
  () =>
    import('@/components/dashboard/headteacher/HeadteacherAdvancedFeatures').then((m) => ({
      default: m.HeadteacherAdvancedFeatures,
    })),
  { loading: () => <SkeletonLoader /> }
)
const TeacherRegistrationForm = dynamic(
  () => import('@/components/forms/TeacherRegistrationForm'),
  { loading: () => <SkeletonLoader /> }
)
const StudentRegistrationForm = dynamic(
  () => import('@/components/forms/StudentRegistrationForm'),
  { loading: () => <SkeletonLoader /> }
)
const HodRegistrationForm = dynamic(() => import('@/components/forms/HodRegistrationForm'), {
  loading: () => <SkeletonLoader />,
})
const HeadteacherStats = dynamic(
  () =>
    import('@/components/dashboard/headteacher/HeadteacherStats').then((m) => ({
      default: m.HeadteacherStats,
    })),
  { loading: () => <SkeletonLoader /> }
)

function HeadteacherDashboardContent() {
  const { user } = useAuth()
  const { activeTab, setActiveTab, schoolStats, dashboardData, stats, isLoading, error } =
    useHeadteacher()

  const role = String(user?.role || '').toLowerCase()
  const isHeadteacher = role === 'headteacher' || role === 'admin' || role === 'administrator'

  const [showRegistrationForm, setShowRegistrationForm] = useState(null) // 'teacher', 'student', 'hod', or null
  const [registrationLoading, setRegistrationLoading] = useState(false)

  const handleRegistration = async (formData, userType) => {
    if (registrationLoading) return
    setRegistrationLoading(true)
    try {
      const response = await api.post('/auth/register', {
        ...formData,
        role: String(userType || '').toLowerCase(),
        schoolId: user?.schoolId,
      })

      if (response.data.success) {
        toast.success(`${userType} registered successfully!`)
        setShowRegistrationForm(null)
      } else {
        throw new Error(response.data.message || 'Registration failed')
      }
    } catch (error) {
      logger.error('Registration error', error)
      const message = error?.response?.data?.message || error.message || ERROR_MESSAGES.GENERIC
      toast.error(message)
    } finally {
      setRegistrationLoading(false)
    }
  }

  const tabs = useMemo(
    () => [
      {
        id: 'overview',
        name: 'Dashboard Overview',
        icon: BarChart3,
        description: 'School statistics and performance',
      },
      {
        id: 'creative-teaching',
        name: 'Creative Teaching & STEM',
        icon: Rocket,
        description: 'Creative teaching tools and STEM learning features',
      },
      {
        id: 'student-attention',
        name: 'Students Requiring Attention',
        icon: AlertCircle,
        description: 'Students scoring below 40% - immediate intervention needed',
      },
      {
        id: 'comprehensive-analytics',
        name: 'Comprehensive Analytics',
        icon: FileBarChart,
        description: 'Detailed performance analytics and insights',
      },
      {
        id: 'junior-analysis',
        name: 'Junior Performance',
        icon: Award,
        description: 'Analysis of Form 1 and Form 2 results',
      },
      {
        id: 'user-management',
        name: 'User Management',
        icon: UserPlus,
        description: 'Register and manage users',
      },
      {
        id: 'academic-management',
        name: 'Academic Management',
        icon: BookOpen,
        description: 'Classes, subjects, and assessments',
      },
      {
        id: 'performance-analytics',
        name: 'Performance Analytics',
        icon: TrendingUp,
        description: 'School-wide monitoring and analytics',
      },
      {
        id: 'strategic-planning',
        name: 'Strategic Planning',
        icon: Target,
        description: 'Goals and strategic management',
      },
      {
        id: 'settings',
        name: 'School Settings',
        icon: Settings,
        description: 'System configuration',
      },
      {
        id: 'advanced-features',
        name: 'Advanced Features',
        icon: Zap,
        description: 'Advanced educational and management features',
      },
    ],
    []
  )

  if (!user) {
    return (
      <DashboardLayout title="Headteacher Dashboard">
        <main className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-royalPurple-text2">Please sign in to access this page.</p>
              <Link href="/login">
                <Button>Go to Login</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </DashboardLayout>
    )
  }

  if (!isHeadteacher) {
    return (
      <DashboardLayout title="Headteacher Dashboard">
        <main className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-royalPurple-text2">
                Only Headteachers can register teachers, HODs, and students.
              </p>
              <Link href="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </DashboardLayout>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <HeadteacherOverview />
      case 'creative-teaching':
        return <CreativeTeachingHub />
      case 'student-attention':
        return (
          <StudentAttentionSystem
            studentsData={dashboardData?.students_requiring_attention}
            performanceSummary={dashboardData?.performance_summary}
          />
        )
      case 'comprehensive-analytics':
      case 'performance-analytics':
        return <HeadteacherAnalytics />
      case 'junior-analysis':
        return (
          <div className="space-y-6">
            <GenderByGradeCard
              title="Boys vs Girls (Forms 1–2)"
              data={
                dashboardData?.junior_gender_by_grade || dashboardData?.juniorGenderByGrade || []
              }
            />
            <JuniorPerformanceAnalysis results={dashboardData?.junior_results || []} />
          </div>
        )
      case 'user-management':
        return <UserManagement />
      case 'academic-management':
        return <HeadteacherAcademicManagement />
      case 'strategic-planning':
        return <HeadteacherStrategicPlanning />
      case 'settings':
        return <HeadteacherSettings />
      case 'advanced-features':
        return <HeadteacherAdvancedFeatures />
      default:
        return <HeadteacherOverview />
    }
  }

  // Handle registration form display
  if (showRegistrationForm) {
    const formTitle = `Register New ${showRegistrationForm.charAt(0).toUpperCase() + showRegistrationForm.slice(1)}`
    return (
      <DashboardLayout title={formTitle}>
        <main className="space-y-6" aria-labelledby="form-heading">
          <header className="flex items-center justify-between">
            <div>
              <h2 id="form-heading" className="text-2xl font-bold text-royalPurple-text1">
                {formTitle}
              </h2>
              <p className="text-royalPurple-text2">
                Add a new {showRegistrationForm} to the school management system
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowRegistrationForm(null)}
              aria-label="Cancel and return to dashboard"
              className="focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Back to Dashboard
            </Button>
          </header>

          <section aria-label="Registration Form">
            {showRegistrationForm === 'teacher' && (
              <TeacherRegistrationForm
                onSubmit={(data) => handleRegistration(data, 'teacher')}
                onCancel={() => setShowRegistrationForm(null)}
              />
            )}

            {showRegistrationForm === 'student' && (
              <StudentRegistrationForm
                onSubmit={(data) => handleRegistration(data, 'student')}
                onCancel={() => setShowRegistrationForm(null)}
              />
            )}

            {showRegistrationForm === 'hod' && (
              <HodRegistrationForm
                onSubmit={(data) => handleRegistration(data, 'hod')}
                onCancel={() => setShowRegistrationForm(null)}
              />
            )}
          </section>
        </main>
      </DashboardLayout>
    )
  }

  return (
    <div className="min-h-screen bg-royalPurple-page">
      <DashboardLayout title="Headteacher Dashboard">
        <main className="space-y-4 relative z-10" aria-labelledby="dashboard-heading">
          {/* Header */}
          <header className="bg-royalPurple-deep border border-royalPurple-border rounded-2xl p-6 mb-5">
            <div className="flex justify-between items-center gap-4">
              <div>
                <h1 id="dashboard-heading" className="text-[22px] font-bold text-royalPurple-text1">
                  Headteacher Dashboard
                </h1>
                <p className="text-royalPurple-text2 text-sm mt-1">
                  Welcome back, {user?.name || 'Headteacher'}
                </p>
              </div>
              <div className="flex space-x-3" aria-label="Current date and time">
                <div className="bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 rounded-lg px-3 py-2 text-center">
                  <div className="text-lg font-bold">{new Date().getDate()}</div>
                  <div className="text-xs text-royalPurple-text2">
                    {new Date().toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                </div>
                <div className="bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 rounded-lg px-3 py-2 text-center">
                  <div className="text-sm font-bold">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs text-royalPurple-text2">Time</div>
                </div>
              </div>
            </div>
          </header>

          {error && (
            <div className="bg-royalPurple-card border border-royalPurple-danger/40 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <AlertCircle className="h-5 w-5 text-royalPurple-dangerTx" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-royalPurple-text1 font-semibold">
                    Dashboard data failed to load
                  </div>
                  <div className="text-royalPurple-text2 text-sm break-words">
                    {error?.response?.data?.error || error?.message || ERROR_MESSAGES.GENERIC}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats Overview */}
          <section aria-label="School Statistics" className="overflow-x-auto pb-2">
            {isLoading ? (
              <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4 min-w-max sm:min-w-0">
                {[...Array(7)].map((_, i) => (
                  <SkeletonLoader
                    key={i}
                    className="h-32 w-32 sm:w-full rounded-xl flex-shrink-0"
                  />
                ))}
              </div>
            ) : (
              <HeadteacherStats schoolStats={schoolStats} />
            )}
          </section>

          {/* All Features Grid - Visible on One Screen */}
          <section aria-label="Dashboard Features">
            <div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
              role="tablist"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <Card
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={isActive ? 'active-feature-content' : undefined}
                    tabIndex={0}
                    className={`transition-all duration-200 cursor-pointer bg-royalPurple-card border border-royalPurple-border hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(0,0,0,0.08)] hover:border-royalPurple-border2/60 ${
                      isActive
                        ? 'bg-royalPurple-card2 border-royalPurple-border2/60 font-semibold'
                        : ''
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setActiveTab(tab.id)
                      }
                    }}
                  >
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="flex items-center text-xs font-semibold">
                        <Icon className="h-4 w-4 mr-2 text-royalPurple-text2" aria-hidden="true" />
                        <span className="truncate">{tab.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                      <p className="text-xs text-royalPurple-text2 mb-2 line-clamp-2">
                        {tab.description}
                      </p>
                      {isActive ? (
                        <div
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-royalPurple-accentBg text-royalPurple-accentTx text-xs font-semibold border border-royalPurple-accent"
                          aria-label={`Current ${tab.name}`}
                        >
                          Active
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full text-xs h-8"
                          variant="outline"
                          aria-label={`Open ${tab.name}`}
                        >
                          Open
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          {/* Active Feature Content - Collapsible */}
          {activeTab && (
            <section
              id="active-feature-content"
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              className="bg-royalPurple-card rounded-[14px] border border-royalPurple-border p-4"
            >
              <Card>
                <CardHeader className="bg-royalPurple-card2 py-3 rounded-t-[14px] border-b border-royalPurple-border">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center" id={`tab-${activeTab}`}>
                      {tabs.find((t) => t.id === activeTab)?.icon &&
                        React.createElement(tabs.find((t) => t.id === activeTab).icon, {
                          className: 'h-5 w-5 mr-2 text-royalPurple-text2',
                          'aria-hidden': 'true',
                        })}
                      {tabs.find((t) => t.id === activeTab)?.name}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('')}
                      className="h-8 w-8 p-0 text-royalPurple-text2 hover:text-royalPurple-text1"
                      aria-label="Close feature content"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="bg-royalPurple-card p-4 max-h-96 overflow-y-auto">
                  {renderTabContent()}
                </CardContent>
              </Card>
            </section>
          )}
        </main>
      </DashboardLayout>
    </div>
  )
}

export default function HeadteacherDashboard() {
  return (
    <ErrorBoundary>
      <HeadteacherProvider>
        <HeadteacherDashboardContent />
      </HeadteacherProvider>
    </ErrorBoundary>
  )
}
