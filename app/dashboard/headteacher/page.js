'use client'

import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import {
  Settings, BarChart3, Target, Award, AlertCircle, Zap, Rocket, X,
  FileBarChart, UserPlus, BookOpen, TrendingUp
} from 'lucide-react'
import { HeadteacherProvider, useHeadteacher } from '@/lib/context/HeadteacherContext'
import { ErrorBoundary } from '@/components/dashboard/ErrorBoundary'
import { logger } from '@/lib/utils/logger'
import { ERROR_MESSAGES } from '@/lib/utils/errorMessages'
import SkeletonLoader from '@/components/SkeletonLoader'

// Lazy load heavy dashboard components
const HeadteacherOverview = dynamic(
  () => import('@/components/dashboard/headteacher/HeadteacherOverview').then(m => ({ default: m.HeadteacherOverview })),
  { loading: () => <SkeletonLoader /> }
)
const CreativeTeachingHub = dynamic(() => import('@/components/creative-teaching/CreativeTeachingHub'), { loading: () => <SkeletonLoader /> })
const StudentAttentionSystem = dynamic(() => import('@/components/dashboard/StudentAttentionSystem'), { loading: () => <SkeletonLoader /> })
const HeadteacherAnalytics = dynamic(
  () => import('@/components/dashboard/headteacher/HeadteacherAnalytics').then(m => ({ default: m.HeadteacherAnalytics })),
  { loading: () => <SkeletonLoader /> }
)
const JuniorPerformanceAnalysis = dynamic(() => import('@/components/dashboard/JuniorPerformanceAnalysis'), { loading: () => <SkeletonLoader /> })
const UserManagement = dynamic(() => import('@/components/dashboard/UserManagement'), { loading: () => <SkeletonLoader /> })
const HeadteacherAcademicManagement = dynamic(
  () => import('@/components/dashboard/headteacher/HeadteacherAcademicManagement').then(m => ({ default: m.HeadteacherAcademicManagement })),
  { loading: () => <SkeletonLoader /> }
)
const HeadteacherStrategicPlanning = dynamic(
  () => import('@/components/dashboard/headteacher/HeadteacherStrategicPlanning').then(m => ({ default: m.HeadteacherStrategicPlanning })),
  { loading: () => <SkeletonLoader /> }
)
const HeadteacherSettings = dynamic(
  () => import('@/components/dashboard/headteacher/HeadteacherSettings').then(m => ({ default: m.HeadteacherSettings })),
  { loading: () => <SkeletonLoader /> }
)
const HeadteacherAdvancedFeatures = dynamic(
  () => import('@/components/dashboard/headteacher/HeadteacherAdvancedFeatures').then(m => ({ default: m.HeadteacherAdvancedFeatures })),
  { loading: () => <SkeletonLoader /> }
)
const TeacherRegistrationForm = dynamic(() => import('@/components/forms/TeacherRegistrationForm'), { loading: () => <SkeletonLoader /> })
const StudentRegistrationForm = dynamic(() => import('@/components/forms/StudentRegistrationForm'), { loading: () => <SkeletonLoader /> })
const HodRegistrationForm = dynamic(() => import('@/components/forms/HodRegistrationForm'), { loading: () => <SkeletonLoader /> })
const HeadteacherStats = dynamic(
  () => import('@/components/dashboard/headteacher/HeadteacherStats').then(m => ({ default: m.HeadteacherStats })),
  { loading: () => <SkeletonLoader /> }
)

function HeadteacherDashboardContent() {
  const { user } = useAuth()
  const { 
    activeTab, 
    setActiveTab, 
    schoolStats, 
    dashboardData, 
    stats,
    isLoading,
    error 
  } = useHeadteacher()

  const [showRegistrationForm, setShowRegistrationForm] = useState(null) // 'teacher', 'student', 'hod', or null

  const tabs = useMemo(() => [
    {
      id: 'overview',
      name: 'Dashboard Overview',
      icon: BarChart3,
      description: 'School statistics and performance'
    },
    {
      id: 'creative-teaching',
      name: 'Creative Teaching & STEM',
      icon: Rocket,
      description: 'Creative teaching tools and STEM learning features'
    },
    {
      id: 'student-attention',
      name: 'Students Requiring Attention',
      icon: AlertCircle,
      description: 'Students scoring below 40% - immediate intervention needed'
    },
    {
      id: 'comprehensive-analytics',
      name: 'Comprehensive Analytics',
      icon: FileBarChart,
      description: 'Detailed performance analytics and insights'
    },
    {
      id: 'junior-analysis',
      name: 'Junior Performance',
      icon: Award,
      description: 'Analysis of Form 1 and Form 2 results'
    },
    {
      id: 'user-management',
      name: 'User Management',
      icon: UserPlus,
      description: 'Register and manage users'
    },
    {
      id: 'academic-management',
      name: 'Academic Management',
      icon: BookOpen,
      description: 'Classes, subjects, and assessments'
    },
    {
      id: 'performance-analytics',
      name: 'Performance Analytics',
      icon: TrendingUp,
      description: 'School-wide monitoring and analytics'
    },
    {
      id: 'strategic-planning',
      name: 'Strategic Planning',
      icon: Target,
      description: 'Goals and strategic management'
    },
    {
      id: 'settings',
      name: 'School Settings',
      icon: Settings,
      description: 'System configuration'
    },
    {
      id: 'advanced-features',
      name: 'Advanced Features',
      icon: Zap,
      description: 'Advanced educational and management features'
    }
  ], [])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <HeadteacherOverview />
      case 'creative-teaching':
        return <CreativeTeachingHub />
      case 'student-attention':
        return <StudentAttentionSystem
          studentsData={dashboardData?.students_requiring_attention}
          performanceSummary={dashboardData?.performance_summary}
        />
      case 'comprehensive-analytics':
      case 'performance-analytics':
        return <HeadteacherAnalytics />
      case 'junior-analysis':
        return <JuniorPerformanceAnalysis results={dashboardData?.junior_results || []} />
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
              <h2 id="form-heading" className="text-2xl font-bold text-gray-900">
                {formTitle}
              </h2>
              <p className="text-gray-600">
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
                onSubmit={(data) => {
                  console.log('Teacher registration:', data)
                  setShowRegistrationForm(null)
                }}
                onCancel={() => setShowRegistrationForm(null)}
              />
            )}

            {showRegistrationForm === 'student' && (
              <StudentRegistrationForm
                onSubmit={(data) => {
                  console.log('Student registration:', data)
                  setShowRegistrationForm(null)
                }}
                onCancel={() => setShowRegistrationForm(null)}
              />
            )}

            {showRegistrationForm === 'hod' && (
              <HodRegistrationForm
                onSubmit={(data) => {
                  console.log('HOD registration:', data)
                  setShowRegistrationForm(null)
                }}
                onCancel={() => setShowRegistrationForm(null)}
              />
            )}
          </section>
        </main>
      </DashboardLayout>
    )
  }

  return (
    <div className="dashboard-layout">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-blue-500/10 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-r from-blue-600/10 to-blue-700/10 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 right-1/3 w-60 h-60 bg-gradient-to-r from-blue-300/10 to-blue-400/10 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-6000"></div>
      </div>

      <DashboardLayout title="Headteacher Dashboard">
        <main className="space-y-4 relative z-10" aria-labelledby="dashboard-heading">
          {/* Header */}
          <header className="content-section">
            <div className="flex justify-between items-center">
              <div>
                <h1 id="dashboard-heading" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Headteacher Dashboard
                </h1>
                <p className="text-gray-600 text-sm mt-1">Welcome back, {user?.name || 'Headteacher'}</p>
              </div>
              <div className="flex space-x-4" aria-label="Current date and time">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-3 text-center shadow-lg">
                  <div className="text-lg font-bold">{new Date().getDate()}</div>
                  <div className="text-xs opacity-90">{new Date().toLocaleDateString('en-US', { month: 'short' })}</div>
                </div>
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-3 text-center shadow-lg">
                  <div className="text-sm font-bold">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="text-xs opacity-90">Time</div>
                </div>
              </div>
            </div>
          </header>

          {/* Quick Stats Overview */}
          <section aria-label="School Statistics" className="scrollbar-hide overflow-x-auto pb-2">
            {isLoading ? (
              <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 sm:gap-6 min-w-max sm:min-w-0">
                {[...Array(7)].map((_, i) => (
                  <SkeletonLoader key={i} className="h-32 w-32 sm:w-full rounded-2xl flex-shrink-0" />
                ))}
              </div>
            ) : (
              <HeadteacherStats schoolStats={schoolStats} />
            )}
          </section>

          {/* All Features Grid - Visible on One Screen */}
          <section aria-label="Dashboard Features">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" role="tablist">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <Card
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={isActive ? "active-feature-content" : undefined}
                    tabIndex={0}
                    className={`hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 focus-within:ring-2 focus-within:ring-blue-500 ${
                      isActive
                        ? 'border-l-blue-600 bg-blue-50'
                        : 'border-l-gray-300 hover:border-l-blue-400'
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
                        <Icon className="h-4 w-4 mr-2 text-blue-600" aria-hidden="true" />
                        <span className="truncate">{tab.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{tab.description}</p>
                      <Button
                        size="sm"
                        className="w-full text-xs h-6 focus-visible:ring-2 focus-visible:ring-blue-500"
                        variant={isActive ? "default" : "outline"}
                        aria-label={`${isActive ? 'Current' : 'Open'} ${tab.name}`}
                      >
                        {isActive ? 'Active' : 'Open'}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          {/* Active Feature Content - Collapsible */}
          {activeTab && (
            <section id="active-feature-content" role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="content-section">
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 py-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center" id={`tab-${activeTab}`}>
                      {tabs.find(t => t.id === activeTab)?.icon && (
                        React.createElement(tabs.find(t => t.id === activeTab).icon, {
                          className: "h-5 w-5 mr-2 text-blue-600",
                          "aria-hidden": "true"
                        })
                      )}
                      {tabs.find(t => t.id === activeTab)?.name}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('')}
                      className="h-8 w-8 p-0 focus-visible:ring-2 focus-visible:ring-gray-500"
                      aria-label="Close feature content"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 max-h-96 overflow-y-auto">
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
