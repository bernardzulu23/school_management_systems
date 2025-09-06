'use client'

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import UserManagement from '@/components/dashboard/UserManagement'
import StudentAttentionSystem from '@/components/dashboard/StudentAttentionSystem'
import TeacherRegistrationForm from '@/components/forms/TeacherRegistrationForm'
import StudentRegistrationForm from '@/components/forms/StudentRegistrationForm'
import { HodRegistrationForm } from '@/components/forms/HodRegistrationForm'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  Users, GraduationCap, BookOpen, ClipboardList, TrendingUp, UserPlus, Settings, BarChart3,
  Target, Award, AlertCircle, CheckCircle, Calendar, FileText, Monitor, Clock,
  School, Briefcase, Globe, Shield, Database, Activity, Plus, User, Flag,
  UserCheck, Library, FileBarChart, TrendingDown, AlertTriangle, Zap, Rocket, X
} from 'lucide-react'
import CreativeTeachingHub from '@/components/creative-teaching/CreativeTeachingHub'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

export default function HeadteacherDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('All Terms')
  const [hasResults, setHasResults] = useState(false)
  const [showRegistrationForm, setShowRegistrationForm] = useState(null) // 'teacher', 'student', 'hod', or null

  // Enhanced state management for comprehensive analytics
  const [schoolStats, setSchoolStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalHODs: 0,
    totalClasses: 0,
    totalSubjects: 0,
    totalAssessments: 0,
    totalGoals: 0,
    attendanceRate: 0,
    passRate: 0,
  })

  // Performance data for charts
  const [schoolPerformanceData, setSchoolPerformanceData] = useState({
    labels: [],
    datasets: []
  })

  const [subjectPerformanceData, setSubjectPerformanceData] = useState({
    labels: [],
    datasets: []
  })

  const [yearGroupPerformanceData, setYearGroupPerformanceData] = useState({
    labels: [],
    datasets: []
  })

  // At-risk students data - cleaned for production
  const [atRiskStudentsData, setAtRiskStudentsData] = useState([])

  // Teacher compliance data - cleaned for production
  const [teacherComplianceData, setTeacherComplianceData] = useState([])

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats().then(res => res.data),
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['headteacher-dashboard'],
    queryFn: () => api.getHeadteacherDashboard().then(res => res.data),
  })

  // Initialize with real data from API
  useEffect(() => {
    // Only set hasResults if there's actual data
    setHasResults(false)

    // Update school stats with real data from API
    if (stats?.stats) {
      setSchoolStats(prev => ({
        ...prev,
        totalStudents: stats.stats.total_students || 0,
        totalTeachers: stats.stats.total_teachers || 0,
        totalClasses: stats.stats.total_classes || 0,
        totalSubjects: stats.stats.total_subjects || 0,
        attendanceRate: stats.stats.attendance_rate || 0,
        passRate: stats.stats.pass_rate || 0,
      }))
      setHasResults(true)
    }
  }, [stats])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  const roleDistribution = [
    { name: 'Students', value: stats?.stats?.total_students || 0, color: '#3b82f6' },
    { name: 'Teachers', value: stats?.stats?.total_teachers || 0, color: '#10b981' },
    { name: 'Classes', value: stats?.stats?.total_classes || 0, color: '#f59e0b' },
    { name: 'Subjects', value: stats?.stats?.total_subjects || 0, color: '#ef4444' },
  ]

  const tabs = [
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
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewContent()
      case 'creative-teaching':
        return <CreativeTeachingHub />
      case 'student-attention':
        return <StudentAttentionSystem
          studentsData={dashboardData?.students_requiring_attention}
          performanceSummary={dashboardData?.performance_summary}
        />
      case 'comprehensive-analytics':
        return renderComprehensiveAnalyticsContent()
      case 'user-management':
        return <UserManagement />
      case 'academic-management':
        return renderAcademicManagementContent()
      case 'performance-analytics':
        return renderPerformanceAnalyticsContent()
      case 'strategic-planning':
        return renderStrategicPlanningContent()
      case 'settings':
        return renderSettingsContent()
      case 'advanced-features':
        return renderAdvancedFeaturesContent()
      default:
        return renderOverviewContent()
    }
  }

  const renderOverviewContent = () => (
    <div className="space-y-8">
        {/* Critical Alert Banner */}
        {dashboardData?.students_requiring_attention?.length > 0 && (
          <div className="backdrop-blur-lg bg-slate-800/60 border border-red-500/40 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="backdrop-blur-md bg-red-600/60 border border-red-400/50 rounded-2xl p-3 mr-4">
                  <AlertCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-xl">
                    {dashboardData.students_requiring_attention.length} Students Require Immediate Attention
                  </h3>
                  <p className="text-red-300 mt-1">
                    Students scoring below 40% need urgent academic intervention
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setActiveTab('student-attention')}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300"
              >
                View Details
              </Button>
            </div>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
          <StatsCard
            title="Students"
            value={schoolStats.totalStudents}
            icon={Users}
            color="blue"
            description="Total enrolled"
            trend={{ isPositive: true, value: 12 }}
          />
          <StatsCard
            title="Teachers"
            value={schoolStats.totalTeachers}
            icon={UserPlus}
            color="green"
            description="Active staff"
            trend={{ isPositive: true, value: 2 }}
          />
          <StatsCard
            title="HODs"
            value={schoolStats.totalHODs}
            icon={UserCheck}
            color="purple"
            description="Department heads"
            trend={{ isPositive: false, value: 1 }}
          />
          <StatsCard
            title="Classes"
            value={schoolStats.totalClasses}
            icon={GraduationCap}
            color="yellow"
            description="Active classes"
            trend={{ isPositive: true, value: 3 }}
          />
          <StatsCard
            title="Subjects"
            value={schoolStats.totalSubjects}
            icon={BookOpen}
            color="orange"
            description="Available subjects"
            trend={{ isPositive: true, value: 2 }}
          />
          <StatsCard
            title="Attendance"
            value={`${schoolStats.attendanceRate}%`}
            icon={CheckCircle}
            color="teal"
            description="School attendance"
            trend={{ isPositive: true, value: 2.5 }}
          />
          <StatsCard
            title="Pass Rate"
            value={`${schoolStats.passRate}%`}
            icon={Award}
            color="indigo"
            description="Overall pass rate"
            trend={{ isPositive: true, value: 4.2 }}
          />
        </div>

        {/* School Performance Overview */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent flex items-center">
              <BarChart3 className="h-6 w-6 mr-3 text-green-400" />
              School Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                  <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Student Achievement</h3>
                  <p className="text-3xl font-bold text-green-400 mt-2">85%</p>
                  <p className="text-slate-300 text-sm mt-1">+5% from last term</p>
                </div>
                <div className="text-center p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                  <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Teacher Effectiveness</h3>
                  <p className="text-3xl font-bold text-blue-400 mt-2">0%</p>
                  <p className="text-slate-300 text-sm mt-1">No data available</p>
                </div>
                <div className="text-center p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                  <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Attendance Rate</h3>
                  <p className="text-3xl font-bold text-purple-400 mt-2">{schoolStats.attendanceRate}%</p>
                  <p className="text-slate-300 text-sm mt-1">+2% from last term</p>
                </div>
                <div className="text-center p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                  <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Pass Rate</h3>
                  <p className="text-3xl font-bold text-orange-400 mt-2">{schoolStats.passRate}%</p>
                  <p className="text-slate-300 text-sm mt-1">+4% from last term</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Analytics */}
        {hasResults && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center">
                <FileBarChart className="h-6 w-6 mr-3 text-purple-400" />
                School Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* School Performance Trends */}
                  <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-blue-400" />
                      Performance Trends by Term
                    </h3>
                    <div className="h-64 flex items-center justify-center bg-slate-800/60 border border-slate-600/40 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-300">School Performance Chart</p>
                        <p className="text-slate-400 text-sm">Term comparison visualization</p>
                      </div>
                    </div>
                  </div>

                  {/* Subject Performance */}
                  <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center">
                      <BookOpen className="h-5 w-5 mr-2 text-green-400" />
                      Subject Performance
                    </h3>
                    <div className="space-y-4">
                      {subjectPerformanceData.labels.slice(0, 5).map((subject, index) => {
                        const performance = subjectPerformanceData.datasets[0].data[index]
                        return (
                          <div key={index} className="p-3 bg-slate-800/60 border border-slate-600/40 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-semibold text-sm">{subject}</span>
                              <span className="text-blue-400 font-bold">{performance}%</span>
                            </div>
                            <div className="w-full bg-slate-600/60 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  performance >= 85 ? 'bg-green-500' :
                                  performance >= 75 ? 'bg-blue-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${performance}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Registrations Chart */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Monthly Registrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData?.monthly_registrations || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                    <XAxis dataKey="month" stroke="rgba(203,213,225,0.8)" />
                    <YAxis stroke="rgba(203,213,225,0.8)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(30,41,59,0.95)',
                        border: '1px solid rgba(100,116,139,0.5)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)',
                        color: 'white'
                      }}
                    />
                    <Bar dataKey="count" fill="url(#blueGradient)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Role Distribution */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="rgba(148,163,184,0.4)"
                      strokeWidth={2}
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(30,41,59,0.95)',
                        border: '1px solid rgba(100,116,139,0.5)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)',
                        color: 'white'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* At-Risk Students and Teacher Compliance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* At-Risk Students */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent flex items-center">
                <AlertTriangle className="h-6 w-6 mr-3 text-red-400" />
                At-Risk Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="space-y-4">
                  {atRiskStudentsData.map((student, index) => (
                    <div key={index} className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-colors duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="backdrop-blur-md bg-red-600/60 border border-red-400/50 rounded-xl p-3">
                            <AlertTriangle className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{student.name}</h4>
                            <p className="text-slate-300 text-sm">{student.year} • Average: {student.averageScore}%</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="px-3 py-1 bg-red-600/60 text-red-100 border border-red-400/50 rounded-full text-xs font-medium">
                            Critical
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Failed Assessments</p>
                          <p className="text-white font-semibold">{student.failedAssessments}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Low Grades</p>
                          <p className="text-white font-semibold">{student.lowGrades}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {student.subjects.map((subject, idx) => (
                          <span key={idx} className="px-2 py-1 bg-orange-600/60 text-orange-100 border border-orange-400/50 rounded text-xs">
                            {subject}
                          </span>
                        ))}
                      </div>
                      <Button
                        className="w-full mt-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-sm"
                        onClick={() => alert(`Contact parent: ${student.parentContact}`)}
                      >
                        Contact Parent
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full mt-6 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
                  onClick={() => setActiveTab('student-attention')}
                >
                  View All At-Risk Students
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Teacher Compliance */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                <CheckCircle className="h-6 w-6 mr-3 text-green-400" />
                Teacher Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="space-y-4">
                  {teacherComplianceData.map((dept, index) => (
                    <div key={index} className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`backdrop-blur-md border rounded-xl p-3 ${
                            dept.status === 'Complete'
                              ? 'bg-green-600/60 border-green-400/50'
                              : dept.status === 'On Track'
                              ? 'bg-blue-600/60 border-blue-400/50'
                              : 'bg-yellow-600/60 border-yellow-400/50'
                          }`}>
                            <CheckCircle className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{dept.department}</h4>
                            <p className="text-slate-300 text-sm">{dept.completion}% completion</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          dept.status === 'Complete'
                            ? 'bg-green-600/60 text-green-100 border border-green-400/50'
                            : dept.status === 'On Track'
                            ? 'bg-blue-600/60 text-blue-100 border border-blue-400/50'
                            : 'bg-yellow-600/60 text-yellow-100 border border-yellow-400/50'
                        }`}>
                          {dept.status}
                        </div>
                      </div>
                      <div className="w-full bg-slate-600/60 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            dept.completion >= 90 ? 'bg-green-500' :
                            dept.completion >= 70 ? 'bg-blue-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${dept.completion}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl text-center">
                  <h4 className="font-semibold text-white mb-2">Overall Compliance</h4>
                  <p className="text-3xl font-bold text-green-400">81%</p>
                  <p className="text-slate-300 text-sm">School average</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Users */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Recent Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600/50">
                    <th className="text-left py-4 text-slate-200 font-bold">Name</th>
                    <th className="text-left py-4 text-slate-200 font-bold">Email</th>
                    <th className="text-left py-4 text-slate-200 font-bold">Role</th>
                    <th className="text-left py-4 text-slate-200 font-bold">Status</th>
                    <th className="text-left py-4 text-slate-200 font-bold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData?.recent_users?.map((user) => (
                    <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/40 transition-colors duration-200">
                      <td className="py-4 text-white font-medium">{user.name}</td>
                      <td className="py-4 text-slate-300">{user.email}</td>
                      <td className="py-4">
                        <span className="px-3 py-1 text-xs rounded-full backdrop-blur-md bg-blue-600/60 text-blue-100 border border-blue-400/50 capitalize font-medium">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-3 py-1 text-xs rounded-full backdrop-blur-md border font-medium ${
                          user.status === 'active'
                            ? 'bg-green-600/60 text-green-100 border-green-400/50'
                            : 'bg-red-600/60 text-red-100 border-red-400/50'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-slate-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Class Statistics */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Class Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardData?.class_stats?.map((classItem) => (
                <div key={classItem.name} className="backdrop-blur-lg bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6 hover:scale-105 transition-all duration-300 group">
                  <h4 className="font-bold text-white text-lg mb-3 group-hover:text-orange-300 transition-colors duration-300">
                    {classItem.name}
                  </h4>
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-slate-300">Students: <span className="font-semibold text-white">{classItem.student_count}</span></span>
                    <span className="text-slate-300">Capacity: <span className="font-semibold text-white">{classItem.capacity}</span></span>
                  </div>
                  <div className="w-full bg-slate-700/60 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 group-hover:from-orange-400 group-hover:to-red-500"
                      style={{
                        width: `${(classItem.student_count / classItem.capacity) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="mt-2 text-center">
                    <span className="text-xs text-slate-400">
                      {Math.round((classItem.student_count / classItem.capacity) * 100)}% Full
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )

  const renderComprehensiveAnalyticsContent = () => (
    <div className="space-y-8">
      {/* Comprehensive Analytics Header */}
      <div className="backdrop-blur-lg bg-slate-800/60 border border-purple-500/40 rounded-3xl p-8 text-center shadow-2xl">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
          Comprehensive School Analytics
        </h2>
        <p className="text-slate-300 text-lg">Detailed performance insights and data-driven decision making</p>
      </div>

      {/* Term Selector */}
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-lg">Analytics Period</h3>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-slate-700/60 border border-slate-600/40 rounded-lg px-4 py-2 text-white"
            >
              <option value="All Terms">All Terms</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* School Performance by Term */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              School Performance by Term
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-300 text-lg">Performance Trends</p>
                  <p className="text-slate-400">School vs National Average</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Year Group Performance */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Year Group Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
              <div className="space-y-4">
                {yearGroupPerformanceData.labels.map((year, index) => {
                  const performance = yearGroupPerformanceData.datasets[0].data[index]
                  return (
                    <div key={index} className="p-3 bg-slate-700/60 border border-slate-600/40 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-semibold">{year}</span>
                        <span className="text-blue-400 font-bold">{performance}%</span>
                      </div>
                      <div className="w-full bg-slate-600/60 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            performance >= 85 ? 'bg-green-500' :
                            performance >= 75 ? 'bg-blue-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${performance}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Performance Analytics */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Teacher Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Teacher Performance Chart */}
              <div className="h-64 flex items-center justify-center bg-slate-700/60 border border-slate-600/40 rounded-xl">
                <div className="text-center">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-300">Teacher Performance Chart</p>
                  <p className="text-slate-400 text-sm">Individual teacher analytics</p>
                </div>
              </div>

              {/* Teacher Summary */}
              <div className="space-y-4">
                <h3 className="text-white font-bold text-lg">Teacher Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-400">{schoolStats.totalTeachers}</div>
                    <div className="text-slate-300 text-sm">Total Teachers</div>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl text-center">
                    <div className="text-2xl font-bold text-blue-400">0%</div>
                    <div className="text-slate-300 text-sm">Effectiveness</div>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl text-center">
                    <div className="text-2xl font-bold text-purple-400">0%</div>
                    <div className="text-slate-300 text-sm">Compliance</div>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl text-center">
                    <div className="text-2xl font-bold text-orange-400">88%</div>
                    <div className="text-slate-300 text-sm">Development</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderAcademicManagementContent = () => (
    <div className="space-y-8">
      {/* Academic Management Header */}
      <div className="backdrop-blur-lg bg-slate-800/60 border border-blue-500/40 rounded-3xl p-8 text-center shadow-2xl">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
          Academic Management
        </h2>
        <p className="text-slate-300 text-lg">Comprehensive oversight of classes, subjects, and assessments</p>
      </div>

      {/* Academic Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Classes Management */}
        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardHeader className="backdrop-blur-md bg-blue-600/60 border-b border-blue-400/50 text-white rounded-t-3xl">
            <CardTitle className="flex items-center text-white">
              <School className="h-6 w-6 mr-3" />
              Classes Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300 font-medium">Total Classes</span>
                <span className="font-bold text-blue-400 text-xl">{stats?.stats?.total_classes || 0}</span>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                  onClick={() => alert('Create New Class functionality would be implemented here')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Class
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-blue-400 text-blue-300 hover:bg-blue-600/20 font-semibold py-3"
                  onClick={() => alert('Assign Teachers functionality would be implemented here')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assign Teachers
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-blue-400 text-blue-300 hover:bg-blue-600/20 font-semibold py-3"
                  onClick={() => alert('Monitor Performance functionality would be implemented here')}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Monitor Performance
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Management */}
        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardHeader className="backdrop-blur-md bg-purple-600/60 border-b border-purple-400/50 text-white rounded-t-3xl">
            <CardTitle className="flex items-center text-white">
              <BookOpen className="h-6 w-6 mr-3" />
              Subjects Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300 font-medium">Total Subjects</span>
                <span className="font-bold text-purple-400 text-xl">{stats?.stats?.total_subjects || 0}</span>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
                  onClick={() => alert('Add New Subject functionality would be implemented here')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Subject
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-purple-400 text-purple-300 hover:bg-purple-600/20 font-semibold py-3"
                  onClick={() => alert('Assign Teachers functionality would be implemented here')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assign Teachers
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-purple-400 text-purple-300 hover:bg-purple-600/20 font-semibold py-3"
                  onClick={() => alert('Track Performance functionality would be implemented here')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Track Performance
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Oversight */}
        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardHeader className="backdrop-blur-md bg-green-600/60 border-b border-green-400/50 text-white rounded-t-3xl">
            <CardTitle className="flex items-center text-white">
              <ClipboardList className="h-6 w-6 mr-3" />
              Assessment Oversight
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300 font-medium">Active Assessments</span>
                <span className="font-bold text-green-400 text-xl">24</span>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                  onClick={() => alert('Schedule Assessment functionality would be implemented here')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Assessment
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-green-400 text-green-300 hover:bg-green-600/20 font-semibold py-3"
                  onClick={() => alert('Monitor Completion functionality would be implemented here')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Monitor Completion
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-green-400 text-green-300 hover:bg-green-600/20 font-semibold py-3"
                  onClick={() => alert('Analyze Results functionality would be implemented here')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analyze Results
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Academic Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Academic Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium">Classes on Track</span>
                </div>
                <span className="text-green-600 font-bold">18/20</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="font-medium">Need Attention</span>
                </div>
                <span className="text-yellow-600 font-bold">2/20</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Target className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium">School Average</span>
                </div>
                <span className="text-blue-600 font-bold">82%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teacher Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <Award className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium">Assessment Completion</span>
                </div>
                <span className="text-green-600 font-bold">0%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium">Documentation</span>
                </div>
                <span className="text-blue-600 font-bold">0%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <GraduationCap className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="font-medium">Professional Development</span>
                </div>
                <span className="text-purple-600 font-bold">0%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderPerformanceAnalyticsContent = () => (
    <div className="space-y-8">
      {/* Performance Analytics Header */}
      <div className="backdrop-blur-lg bg-slate-800/60 border border-green-500/40 rounded-3xl p-8 text-center shadow-2xl">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mb-4">
          Performance Analytics
        </h2>
        <p className="text-slate-300 text-lg">School-wide monitoring and data-driven insights</p>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-3">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-300">Student Achievement</p>
                <p className="text-2xl font-bold text-white">85%</p>
                <p className="text-xs text-green-400">+5% from last term</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-3">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-300">Teacher Effectiveness</p>
                <p className="text-2xl font-bold text-white">0%</p>
                <p className="text-xs text-gray-400">No data available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-3">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-300">Attendance Rate</p>
                <p className="text-2xl font-bold text-white">{schoolStats.attendanceRate}%</p>
                <p className="text-xs text-gray-400">No data available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-2xl p-3">
                <Award className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-300">Pass Rate</p>
                <p className="text-2xl font-bold text-white">88%</p>
                <p className="text-xs text-green-400">+4% from last term</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced User Registration Section */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent flex items-center">
            <UserPlus className="h-6 w-6 mr-3 text-blue-400" />
            User Registration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <UserPlus className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-white font-semibold text-center text-lg">Register New Teacher</h3>
                <p className="text-slate-300 text-sm text-center mt-2 mb-4">Add a new teacher to the system</p>
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  onClick={() => setShowRegistrationForm('teacher')}
                >
                  Register Teacher
                </Button>
              </div>
              <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <UserCheck className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-white font-semibold text-center text-lg">Register New HOD</h3>
                <p className="text-slate-300 text-sm text-center mt-2 mb-4">Add a new Head of Department</p>
                <Button
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                  onClick={() => setShowRegistrationForm('hod')}
                >
                  Register HOD
                </Button>
              </div>
              <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-white font-semibold text-center text-lg">Register New Student</h3>
                <p className="text-slate-300 text-sm text-center mt-2 mb-4">Add a new student to the system</p>
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  onClick={() => setShowRegistrationForm('student')}
                >
                  Register Student
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced School Management */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center">
            <School className="h-6 w-6 mr-3 text-purple-400" />
            School Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-white font-semibold text-center">Manage Classes</h3>
                <p className="text-slate-300 text-sm text-center mt-2 mb-4">Oversee class organization and student assignments</p>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-blue-400">{schoolStats.totalClasses}</div>
                  <div className="text-slate-300 text-sm">Active Classes</div>
                </div>
                <Button
                  className="w-full bg-blue-600/60 hover:bg-blue-600/80 text-white border border-blue-400/50"
                  onClick={() => setActiveTab('academic-management')}
                >
                  Manage Classes
                </Button>
              </div>
              <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-white font-semibold text-center">Manage Subjects</h3>
                <p className="text-slate-300 text-sm text-center mt-2 mb-4">Oversee curriculum delivery and subject assignments</p>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-green-400">{schoolStats.totalSubjects}</div>
                  <div className="text-slate-300 text-sm">Available Subjects</div>
                </div>
                <Button
                  className="w-full bg-green-600/60 hover:bg-green-600/80 text-white border border-green-400/50"
                  onClick={() => setActiveTab('academic-management')}
                >
                  Manage Subjects
                </Button>
              </div>
              <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <ClipboardList className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-white font-semibold text-center">Monitor Assessments</h3>
                <p className="text-slate-300 text-sm text-center mt-2 mb-4">Track assessment schedules and completion rates</p>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-purple-400">{schoolStats.totalAssessments}</div>
                  <div className="text-slate-300 text-sm">Total Assessments</div>
                </div>
                <Button
                  className="w-full bg-purple-600/60 hover:bg-purple-600/80 text-white border border-purple-400/50"
                  onClick={() => setActiveTab('performance-analytics')}
                >
                  View Assessments
                </Button>
              </div>
              <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-white font-semibold text-center">Academic Goals</h3>
                <p className="text-slate-300 text-sm text-center mt-2 mb-4">Set institutional goals and track achievements</p>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-orange-400">{schoolStats.totalGoals}</div>
                  <div className="text-slate-300 text-sm">Active Goals</div>
                </div>
                <Button
                  className="w-full bg-orange-600/60 hover:bg-orange-600/80 text-white border border-orange-400/50"
                  onClick={() => setActiveTab('strategic-planning')}
                >
                  Manage Goals
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Department Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { department: 'Mathematics', performance: 85 },
                { department: 'Science', performance: 78 },
                { department: 'English', performance: 92 },
                { department: 'History', performance: 80 },
                { department: 'Geography', performance: 75 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="performance" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>At-Risk Student Identification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Critical Attention Required</h4>
                <p className="text-sm text-red-700">12 students below 60% average</p>
                <Button size="sm" className="mt-2">View Details</Button>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Monitoring Required</h4>
                <p className="text-sm text-yellow-700">25 students between 60-70% average</p>
                <Button size="sm" className="mt-2">View Details</Button>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Performing Well</h4>
                <p className="text-sm text-green-700">163 students above 70% average</p>
                <Button size="sm" className="mt-2">View Details</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Comprehensive School Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Database className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-medium text-blue-800">Data Quality</h4>
              <p className="text-2xl font-bold text-blue-600">98%</p>
              <p className="text-sm text-blue-600">Complete records</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-medium text-green-800">System Health</h4>
              <p className="text-2xl font-bold text-green-600">100%</p>
              <p className="text-sm text-green-600">All systems operational</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Globe className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-medium text-purple-800">Integration Status</h4>
              <p className="text-2xl font-bold text-purple-600">0%</p>
              <p className="text-sm text-purple-600">No integrations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderStrategicPlanningContent = () => (
    <div className="space-y-6">
      {/* Strategic Planning Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Strategic Planning</h2>
        <p className="text-gray-600">School-wide goals and strategic management</p>
      </div>

      {/* Goal Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              School Goals Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Goals</span>
                <span className="font-bold text-blue-600">15</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="font-bold text-green-600">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">In Progress</span>
                <span className="font-bold text-yellow-600">5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Not Started</span>
                <span className="font-bold text-gray-600">2</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '53%' }}></div>
              </div>
              <p className="text-sm text-gray-600 text-center">53% Overall Progress</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-green-600 text-white">
            <CardTitle className="flex items-center">
              <Briefcase className="h-5 w-5 mr-2" />
              Strategic Initiatives
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Button className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Create New Goal
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Monitor className="h-4 w-4 mr-2" />
                Monitor Progress
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Reports
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Reviews
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Current Strategic Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Improve Student Achievement</h4>
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">On Track</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Increase overall student performance by 10% this academic year</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Progress: 75%</span>
                <span>Due: June 2024</span>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Enhance Teacher Development</h4>
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">In Progress</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Complete professional development for all teaching staff</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Progress: 60%</span>
                <span>Due: May 2024</span>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Technology Integration</h4>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Planning</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Implement digital learning tools across all subjects</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '25%' }}></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Progress: 25%</span>
                <span>Due: August 2024</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategic Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">Goal Completion Rate</h4>
            <p className="text-2xl font-bold text-blue-600">73%</p>
            <p className="text-sm text-gray-600">Above target of 70%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">On-Time Delivery</h4>
            <p className="text-2xl font-bold text-green-600">85%</p>
            <p className="text-sm text-gray-600">Goals completed on schedule</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">Impact Score</h4>
            <p className="text-2xl font-bold text-purple-600">4.2/5</p>
            <p className="text-sm text-gray-600">Stakeholder satisfaction</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderSettingsContent = () => (
    <div className="space-y-6">
      {/* Settings Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">School Settings</h2>
        <p className="text-gray-600">System configuration and administrative settings</p>
      </div>

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Database className="h-4 w-4 mr-2" />
                Database Management
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Security Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Globe className="h-4 w-4 mr-2" />
                Integration Management
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Monitor className="h-4 w-4 mr-2" />
                System Monitoring
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-green-600 text-white">
            <CardTitle className="flex items-center">
              <School className="h-5 w-5 mr-2" />
              School Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                School Information
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Academic Calendar
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                User Permissions
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                Grading System
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-medium text-green-800">Database</h4>
              <p className="text-sm text-green-600">Operational</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-medium text-green-800">API Services</h4>
              <p className="text-sm text-green-600">Running</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-medium text-green-800">Security</h4>
              <p className="text-sm text-green-600">Protected</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-medium text-green-800">Backups</h4>
              <p className="text-sm text-green-600">Up to Date</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Handle registration form display
  if (showRegistrationForm) {
    return (
      <DashboardLayout title={`Register New ${showRegistrationForm.charAt(0).toUpperCase() + showRegistrationForm.slice(1)}`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Register New {showRegistrationForm.charAt(0).toUpperCase() + showRegistrationForm.slice(1)}
              </h2>
              <p className="text-gray-600">
                Add a new {showRegistrationForm} to the school management system
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowRegistrationForm(null)}>
              Back to Dashboard
            </Button>
          </div>

          {showRegistrationForm === 'teacher' && (
            <TeacherRegistrationForm
              onSubmit={(data) => {
                console.log('Teacher registration:', data)
                // Handle teacher registration
                setShowRegistrationForm(null)
              }}
              onCancel={() => setShowRegistrationForm(null)}
            />
          )}

          {showRegistrationForm === 'student' && (
            <StudentRegistrationForm
              onSubmit={(data) => {
                console.log('Student registration:', data)
                // Handle student registration
                setShowRegistrationForm(null)
              }}
              onCancel={() => setShowRegistrationForm(null)}
            />
          )}

          {showRegistrationForm === 'hod' && (
            <HodRegistrationForm
              onSubmit={(data) => {
                console.log('HOD registration:', data)
                // Handle HOD registration
                setShowRegistrationForm(null)
              }}
              onCancel={() => setShowRegistrationForm(null)}
            />
          )}
        </div>
      </DashboardLayout>
    )
  }

  const renderAdvancedFeaturesContent = () => (
    <div className="space-y-6">
      {/* Test Banner */}
      <div className="bg-green-500 p-4 text-white font-bold text-center mb-4">
        🚨 HEADTEACHER ADVANCED FEATURES TEST - IF YOU SEE THIS, THE TAB IS WORKING 🚨
      </div>
      {/* Advanced Features Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Advanced Educational Features
        </h2>
        <p className="text-gray-600">Cutting-edge tools for modern school management</p>
      </div>

      {/* Advanced Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Institutional Analytics */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center">
              <BarChart3 className="h-6 w-6 mr-3 text-blue-500" />
              Institutional Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>📊 School-wide Performance Dashboards</li>
              <li>📈 Predictive Analytics & Insights</li>
              <li>🎯 Strategic Planning Tools</li>
              <li>📋 Comprehensive Reporting Suite</li>
            </ul>
            <Button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
              Explore Analytics
            </Button>
          </CardContent>
        </Card>

        {/* Advanced Communication */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent flex items-center">
              <Users className="h-6 w-6 mr-3 text-green-500" />
              Communication Hub
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>📱 Multi-channel Communication</li>
              <li>🔔 Smart Notification System</li>
              <li>👥 Community Engagement Tools</li>
              <li>📧 Automated Messaging</li>
            </ul>
            <Button className="w-full mt-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white">
              Manage Communications
            </Button>
          </CardContent>
        </Card>

        {/* Innovation & Technology */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center">
              <Zap className="h-6 w-6 mr-3 text-purple-500" />
              Innovation Center
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>🚀 AI-Powered Learning Tools</li>
              <li>🥽 AR/VR Integration</li>
              <li>🧠 Mental Health Monitoring</li>
              <li>🔗 Blockchain Credentials</li>
            </ul>
            <Button className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
              Explore Innovation
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Implementation Status Dashboard */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center">
            <Target className="h-6 w-6 mr-3 text-orange-500" />
            Advanced Features Implementation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Student Features</h4>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{width: '100%'}}></div>
              </div>
              <p className="text-sm text-green-600 font-medium">Complete</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Learning Enhancement</h4>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{width: '100%'}}></div>
              </div>
              <p className="text-sm text-green-600 font-medium">Complete</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Cultural Integration</h4>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{width: '100%'}}></div>
              </div>
              <p className="text-sm text-green-600 font-medium">Complete</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Cross-Dashboard Integration</h4>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{width: '90%'}}></div>
              </div>
              <p className="text-sm text-blue-600 font-medium">90% Complete</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">🎉 Latest Update: Cross-Dashboard Feature Integration</h4>
            <p className="text-sm text-blue-700">
              Advanced educational features are now available across all dashboards! Students, teachers, HODs, and headteachers
              can now access role-specific advanced tools and features for enhanced educational management.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="dashboard-layout">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-blue-500/10 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-r from-blue-600/10 to-blue-700/10 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 right-1/3 w-60 h-60 bg-gradient-to-r from-blue-300/10 to-blue-400/10 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-6000"></div>
      </div>

      <DashboardLayout title="Headteacher Dashboard">
        <div className="space-y-4 relative z-10">
          {/* Header */}
          <div className="content-section">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Headteacher Dashboard
                </h1>
                <p className="text-gray-600 text-sm mt-1">Welcome back, {user?.name || 'Headteacher'}</p>
              </div>
              <div className="flex space-x-4">
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
          </div>

          {/* Quick Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-l-green-500">
              <div className="text-lg font-bold text-green-600">{schoolStats.totalStudents}</div>
              <div className="text-xs text-gray-600">Students</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-l-blue-500">
              <div className="text-lg font-bold text-blue-600">{schoolStats.totalTeachers}</div>
              <div className="text-xs text-gray-600">Teachers</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-l-purple-500">
              <div className="text-lg font-bold text-purple-600">{schoolStats.totalHODs}</div>
              <div className="text-xs text-gray-600">HODs</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-l-orange-500">
              <div className="text-lg font-bold text-orange-600">{schoolStats.totalClasses}</div>
              <div className="text-xs text-gray-600">Classes</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-l-red-500">
              <div className="text-lg font-bold text-red-600">{schoolStats.totalSubjects}</div>
              <div className="text-xs text-gray-600">Subjects</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-l-indigo-500">
              <div className="text-lg font-bold text-indigo-600">{schoolStats.attendanceRate}%</div>
              <div className="text-xs text-gray-600">Attendance</div>
            </div>
          </div>

          {/* All Features Grid - Visible on One Screen */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Card
                  key={tab.id}
                  className={`hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 ${
                    activeTab === tab.id
                      ? 'border-l-blue-600 bg-blue-50'
                      : 'border-l-gray-300 hover:border-l-blue-400'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="flex items-center text-xs font-semibold">
                      <Icon className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="truncate">{tab.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{tab.description}</p>
                    <Button
                      size="sm"
                      className="w-full text-xs h-6"
                      variant={activeTab === tab.id ? "default" : "outline"}
                    >
                      {activeTab === tab.id ? 'Active' : 'Open'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Active Feature Content - Collapsible */}
          {activeTab && (
            <div className="content-section">
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 py-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center">
                      {tabs.find(t => t.id === activeTab)?.icon && (
                        React.createElement(tabs.find(t => t.id === activeTab).icon, {
                          className: "h-5 w-5 mr-2 text-blue-600"
                        })
                      )}
                      {tabs.find(t => t.id === activeTab)?.name}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('')}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 max-h-96 overflow-y-auto">
                  {renderTabContent()}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>
    </div>
  )
}
