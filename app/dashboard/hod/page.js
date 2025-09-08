'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import HodAssignments from '@/components/dashboard/HodAssignments'
import { api } from '@/lib/api'
import {
  Users, BookOpen, ClipboardList, TrendingUp, UserCheck, Plus,
  FileText, Calendar, BarChart3, Monitor, Clock, Settings,
  GraduationCap, CheckCircle, CalendarDays, FileCheck, Group,
  DollarSign, Package, Briefcase, School, User, Award, Target,
  AlertTriangle, Library, Zap, Rocket, Globe
} from 'lucide-react'
import Link from 'next/link'
import CreativeTeachingHub from '@/components/creative-teaching/CreativeTeachingHub'

export default function HodDashboard() {
  const router = useRouter()

  // Enhanced state management
  const [departmentData, setDepartmentData] = useState({
    teachers: [],
    students: [],
    subjects: [],
    classes: [],
    results: [],
    assessments: []
  })

  const [dashboardStats, setDashboardStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    totalSubjects: 0,
    totalClasses: 0,
    averagePerformance: 0,
    pendingAssessments: 0
  })

  const [performanceData, setPerformanceData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Get current user data from auth context
  const { user: currentUser } = useAuth()

  // Department configuration
  const departments = {
    'Mathematics': ['Mathematics', 'Information Technology', 'Computer Studies', 'Additional Mathematics'],
    'Literature and Languages': ['English Language', 'Literature', 'Kikaonde', 'Silozi', 'Chibemba', 'Chichewa', 'Chitonga', 'Luvale', 'Lunda', 'Chinese', 'French'],
    'Social Sciences': ['Geography', 'Social Studies', 'Civic', 'History'],
    'Art and Design': ['Physical Education', 'Music', 'Expressive Art', 'Design and Technology', 'Metalwork', 'Woodwork'],
    'Natural Sciences': ['Biology', 'Physics', 'Chemistry', 'Integrated Science', 'Agricultural Sciences'],
    'Business Studies': ['Commerce', 'Accounts', 'Business Studies', 'Religious Education'],
    'Home Economics': ['Home Economics', 'Fashion and Fabrics', 'Food and Nutrition']
  }

  const currentDepartment = currentUser?.department || ''
  const departmentSubjects = useMemo(() => {
    return departments[currentDepartment] || []
  }, [currentDepartment])

  // Data initialization - Load from API
  useEffect(() => {
    // Initialize with empty arrays - data will come from API
    setDepartmentData({
      teachers: [],
      students: [],
      subjects: [],
      classes: [],
      results: [],
      assessments: []
    })
  }, [departmentSubjects])

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats().then(res => res.data),
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['teacher-dashboard'], // HOD uses same endpoint as teacher for now
    queryFn: () => api.getTeacherDashboard().then(res => res.data),
  })

  // HOD Administrative Duties Data
  const fileManagementDuties = [
    {
      id: 'correspondence',
      title: 'Correspondence File',
      description: 'Manage incoming/outgoing communications',
      icon: FileText,
      route: '/dashboard/hod/correspondence'
    },
    {
      id: 'meetings',
      title: 'Meeting Files',
      description: 'Department and staff meeting records',
      icon: Group,
      route: '/dashboard/hod/meetings'
    },
    {
      id: 'exam-analysis',
      title: 'Exam Analysis',
      description: 'Assessment performance analysis',
      icon: BarChart3,
      route: '/dashboard/hod/exam-analysis'
    },
    {
      id: 'monitoring',
      title: 'Monitoring File',
      description: 'Department oversight and tracking',
      icon: Monitor,
      route: '/dashboard/hod/monitoring'
    },
    {
      id: 'minutes',
      title: 'Department Minutes',
      description: 'Meeting minutes and decisions',
      icon: FileCheck,
      route: '/dashboard/hod/minutes'
    },
    {
      id: 'staff-meetings',
      title: 'Staff Meeting File',
      description: 'Staff meeting documentation',
      icon: Calendar,
      route: '/dashboard/hod/staff-meetings'
    }
  ]

  const academicManagementDuties = [
    {
      id: 'cpd',
      title: 'CPD File',
      description: 'Continuous Professional Development records',
      icon: GraduationCap,
      route: '/dashboard/hod/cpd'
    },
    {
      id: 'syllabus',
      title: 'Syllabus File',
      description: 'Curriculum and syllabus management',
      icon: BookOpen,
      route: '/dashboard/hod/syllabus'
    },
    {
      id: 'assessments',
      title: 'Assessment Results',
      description: 'Student assessment and results for learners',
      icon: ClipboardList,
      route: '/dashboard/hod/assessment-results'
    },
    {
      id: 'computer-sba',
      title: 'Computer SBA File',
      description: 'School-Based Assessment for computer subjects',
      icon: Monitor,
      route: '/dashboard/hod/computer-sba'
    },
    {
      id: 'timetable',
      title: 'Timetable & Class Allocation',
      description: 'Schedule and class management',
      icon: CalendarDays,
      route: '/dashboard/hod/timetable'
    },
    {
      id: 'homework-checks',
      title: 'Homework Checks',
      description: 'Daily homework monitoring',
      icon: CheckCircle,
      route: '/dashboard/hod/homework-checks'
    }
  ]

  const dailyOperationsDuties = [
    {
      id: 'daily-routine',
      title: 'Daily Routine',
      description: 'Day-to-day operational tasks',
      icon: Clock,
      route: '/dashboard/hod/daily-routine'
    },
    {
      id: 'administration',
      title: 'Administration',
      description: 'General administrative duties',
      icon: Settings,
      route: '/dashboard/hod/administration'
    }
  ]

  const financialManagementDuties = [
    {
      id: 'budget',
      title: 'Budget File',
      description: 'Department budget management',
      icon: DollarSign,
      route: '/dashboard/hod/budget'
    },
    {
      id: 'stock-book',
      title: 'Stock Book',
      description: 'Inventory and stock management',
      icon: Package,
      route: '/dashboard/hod/stock-book'
    }
  ]

  const handleDutyClick = (route) => {
    router.push(route)
  }

  const renderDutySection = (title, duties, colorClass, bgClass) => (
    <Card className="mb-6">
      <CardHeader className={`${bgClass} text-white`}>
        <CardTitle className="flex items-center">
          <Briefcase className="h-5 w-5 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {duties.map((duty) => {
            const Icon = duty.icon
            return (
              <Button
                key={duty.id}
                variant="outline"
                className={`h-auto p-4 justify-start text-left hover:${bgClass} hover:text-white transition-all duration-200`}
                onClick={() => handleDutyClick(duty.route)}
              >
                <div className="flex items-start w-full">
                  <Icon className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{duty.title}</div>
                    <div className="text-sm opacity-75 mt-1">{duty.description}</div>
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )

  if (!currentDepartment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-red-800 relative overflow-hidden">
        <DashboardLayout title="Head of Department Dashboard">
          <div className="space-y-6">
            <Card variant="glass">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">No Department Assigned</h2>
                <p className="text-slate-300">Please contact the administrator to assign you to a department.</p>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-red-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      <DashboardLayout title="Head of Department Dashboard">
        <div className="space-y-8 relative z-10">
          {/* Enhanced Header */}
          <div className="backdrop-blur-lg bg-slate-800/60 border border-orange-500/40 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-4">
                  {currentDepartment} Department
                </h1>
                <p className="text-slate-300 text-lg">Head of Department Dashboard</p>
                <p className="text-slate-400 text-sm mt-2">Welcome back, {currentUser?.name || 'HOD'}!</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{new Date().getDate()}</div>
                  <div className="text-sm text-orange-200">{new Date().toLocaleDateString('en-US', { month: 'short' })}</div>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-xl">
                  {currentUser?.name?.charAt(0) || 'H'}
                </div>
              </div>
            </div>
          </div>

          {/* Department Subjects Overview */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent flex items-center">
                <Library className="h-6 w-6 mr-3 text-orange-400" />
                Department Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="flex flex-wrap gap-3">
                  {departmentSubjects.map((subject, index) => (
                    <div key={index} className="px-4 py-2 bg-orange-600/60 text-orange-100 border border-orange-400/50 rounded-full text-sm font-medium flex items-center">
                      <BookOpen className="h-4 w-4 mr-2" />
                      {subject}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
              <StatsCard
                title="Teachers"
                value={dashboardStats.totalTeachers}
                icon={Users}
                color="blue"
                description="Department teachers"
                trend={{ isPositive: true, value: 2 }}
              />
              <StatsCard
                title="Students"
                value={dashboardStats.totalStudents}
                icon={School}
                color="green"
                description="Department students"
                trend={{ isPositive: true, value: 15 }}
              />
              <StatsCard
                title="Subjects"
                value={dashboardStats.totalSubjects}
                icon={Library}
                color="purple"
                description="Subjects managed"
                trend={{ isPositive: true, value: 1 }}
              />
              <StatsCard
                title="Classes"
                value={dashboardStats.totalClasses}
                icon={Group}
                color="yellow"
                description="Classes supervised"
                trend={{ isPositive: true, value: 3 }}
              />
              <StatsCard
                title="Performance"
                value={`${dashboardStats.averagePerformance}%`}
                icon={TrendingUp}
                color="orange"
                description="Average performance"
                trend={{ isPositive: true, value: 5.2 }}
              />
              <StatsCard
                title="Assessments"
                value={dashboardStats.pendingAssessments}
                icon={ClipboardList}
                color="red"
                description="Pending assessments"
                trend={{ isPositive: false, value: 2 }}
              />
            </div>

            {/* Advanced HOD Features */}
            <div className="bg-blue-500 p-4 text-white font-bold text-center mb-4">
              🚨 HOD ADVANCED FEATURES TEST - IF YOU SEE THIS, THE SECTION IS RENDERING 🚨
            </div>
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent flex items-center">
                  <Zap className="h-6 w-6 mr-3 text-yellow-400" />
                  Advanced Department Management Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {/* Department Analytics */}
                    <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-400/30 rounded-xl p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-orange-500/30 rounded-lg flex items-center justify-center mr-3">
                          <BarChart3 className="h-5 w-5 text-orange-300" />
                        </div>
                        <h4 className="font-semibold text-white">Department Analytics</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li>📊 Performance Dashboards</li>
                        <li>📈 Teacher Effectiveness Metrics</li>
                        <li>🎯 Student Progress Tracking</li>
                        <li>📋 Resource Utilization Reports</li>
                      </ul>
                      <Button className="w-full mt-3 bg-orange-600/60 hover:bg-orange-600/80 text-white border border-orange-400/50">
                        View Analytics
                      </Button>
                    </div>

                    {/* Teacher Development */}
                    <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-400/30 rounded-xl p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center mr-3">
                          <Users className="h-5 w-5 text-blue-300" />
                        </div>
                        <h4 className="font-semibold text-white">Teacher Development</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li>🎓 Professional Development Plans</li>
                        <li>📚 Training Resource Library</li>
                        <li>🤝 Mentorship Programs</li>
                        <li>⭐ Performance Evaluations</li>
                      </ul>
                      <Button className="w-full mt-3 bg-blue-600/60 hover:bg-blue-600/80 text-white border border-blue-400/50">
                        Manage Development
                      </Button>
                    </div>

                    {/* Curriculum Management */}
                    <div className="bg-gradient-to-br from-green-600/20 to-teal-600/20 border border-green-400/30 rounded-xl p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-green-500/30 rounded-lg flex items-center justify-center mr-3">
                          <BookOpen className="h-5 w-5 text-green-300" />
                        </div>
                        <h4 className="font-semibold text-white">Curriculum Management</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li>📖 Curriculum Planning Tools</li>
                        <li>🔄 Assessment Coordination</li>
                        <li>📅 Academic Calendar Management</li>
                        <li>🎯 Learning Outcome Tracking</li>
                      </ul>
                      <Button className="w-full mt-3 bg-green-600/60 hover:bg-green-600/80 text-white border border-green-400/50">
                        Manage Curriculum
                      </Button>
                    </div>
                  </div>

                  {/* Implementation Status */}
                  <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-400/30 rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center">
                      <Target className="h-5 w-5 mr-2 text-purple-300" />
                      Advanced Features Implementation Status
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-300">HOD Dashboard Features</span>
                          <span className="font-semibold text-purple-300">Ready for Testing</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{width: '80%'}}></div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>✅ Student Features Complete</div>
                        <div>✅ Learning Enhancement Complete</div>
                        <div>✅ Cultural Integration Complete</div>
                        <div>✅ Teacher Features Complete</div>
                        <div>🔄 HOD Features (80% Complete)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Overview */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent flex items-center">
                  <BarChart3 className="h-6 w-6 mr-3 text-blue-400" />
                  Department Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <Users className="h-10 w-10 text-white" />
                      </div>
                      <h3 className="font-bold text-white text-lg">Teachers</h3>
                      <p className="text-3xl font-bold text-blue-400 mt-2">{dashboardStats.totalTeachers}</p>
                      <p className="text-slate-300 text-sm mt-1">Department staff</p>
                    </div>
                    <div className="text-center">
                      <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <School className="h-10 w-10 text-white" />
                      </div>
                      <h3 className="font-bold text-white text-lg">Students</h3>
                      <p className="text-3xl font-bold text-green-400 mt-2">{dashboardStats.totalStudents}</p>
                      <p className="text-slate-300 text-sm mt-1">Enrolled students</p>
                    </div>
                    <div className="text-center">
                      <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <Award className="h-10 w-10 text-white" />
                      </div>
                      <h3 className="font-bold text-white text-lg">Performance</h3>
                      <p className="text-3xl font-bold text-purple-400 mt-2">{dashboardStats.averagePerformance}%</p>
                      <p className="text-slate-300 text-sm mt-1">Department average</p>
                    </div>
                    <div className="text-center">
                      <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="h-10 w-10 text-white" />
                      </div>
                      <h3 className="font-bold text-white text-lg">Assessments</h3>
                      <p className="text-3xl font-bold text-orange-400 mt-2">{dashboardStats.pendingAssessments}</p>
                      <p className="text-slate-300 text-sm mt-1">Pending review</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Management */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                  <Users className="h-6 w-6 mr-3 text-green-400" />
                  Department Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Department Teachers */}
                    <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold text-lg flex items-center">
                          <Users className="h-5 w-5 mr-2 text-blue-400" />
                          Department Teachers
                        </h3>
                        <span className="text-slate-300 text-sm">{departmentData.teachers.length} teachers</span>
                      </div>
                      <div className="space-y-3">
                        {departmentData.teachers.slice(0, 4).map((teacher, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-600/40 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                {teacher.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-white font-semibold text-sm">{teacher.name}</p>
                                <p className="text-slate-300 text-xs">{teacher.subjects?.length || 0} subjects • {teacher.assignedClasses?.length || 0} classes</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {departmentData.teachers.length > 4 && (
                          <p className="text-slate-300 text-sm text-center">+{departmentData.teachers.length - 4} more teachers</p>
                        )}
                      </div>
                      <Button className="w-full mt-4 bg-blue-600/60 hover:bg-blue-600/80 text-white border border-blue-400/50">
                        Manage Teachers
                      </Button>
                    </div>

                    {/* Department Students */}
                    <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold text-lg flex items-center">
                          <School className="h-5 w-5 mr-2 text-green-400" />
                          Department Students
                        </h3>
                        <span className="text-slate-300 text-sm">{departmentData.students.length} students</span>
                      </div>
                      <div className="space-y-3">
                        {departmentData.students.slice(0, 4).map((student, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-600/40 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                {student.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-white font-semibold text-sm">{student.name}</p>
                                <p className="text-slate-300 text-xs">{student.yearGroup || 'No class'}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {student.subjects?.filter(subject => departmentSubjects.includes(subject))
                                    .slice(0, 2).map((subject, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-green-600/60 text-green-100 border border-green-400/50 rounded text-xs">
                                      {subject}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {departmentData.students.length > 4 && (
                          <p className="text-slate-300 text-sm text-center">+{departmentData.students.length - 4} more students</p>
                        )}
                      </div>
                      <Button className="w-full mt-4 bg-green-600/60 hover:bg-green-600/80 text-white border border-green-400/50">
                        View All Students
                      </Button>
                    </div>

                    {/* Department Classes */}
                    <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold text-lg flex items-center">
                          <Group className="h-5 w-5 mr-2 text-purple-400" />
                          Department Classes
                        </h3>
                        <span className="text-slate-300 text-sm">{departmentData.classes.length} classes</span>
                      </div>
                      <div className="space-y-3">
                        {departmentData.classes.slice(0, 4).map((classItem, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-600/40 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-lg p-2">
                                <Group className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="text-white font-semibold text-sm">{classItem.name}</p>
                                <p className="text-slate-300 text-xs">{classItem.students} students</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-purple-400 text-sm font-semibold">{classItem.subjects?.length || 0}</p>
                              <p className="text-slate-400 text-xs">subjects</p>
                            </div>
                          </div>
                        ))}
                        {departmentData.classes.length > 4 && (
                          <p className="text-slate-300 text-sm text-center">+{departmentData.classes.length - 4} more classes</p>
                        )}
                      </div>
                      <Button className="w-full mt-4 bg-purple-600/60 hover:bg-purple-600/80 text-white border border-purple-400/50">
                        Manage Classes
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* HOD Administrative Duties Section */}
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">HOD Administrative Duties</h2>
            <p className="text-gray-600">Comprehensive department management and administrative functions</p>
          </div>

          {/* File Management Section */}
          {renderDutySection(
            'File Management',
            fileManagementDuties,
            'text-blue-600',
            'bg-blue-600'
          )}

          {/* Academic Management Section */}
          {renderDutySection(
            'Academic Management',
            academicManagementDuties,
            'text-purple-600',
            'bg-purple-600'
          )}

          {/* Daily Operations Section */}
          {renderDutySection(
            'Daily Operations',
            dailyOperationsDuties,
            'text-green-600',
            'bg-green-600'
          )}

          {/* Financial Management Section */}
          {renderDutySection(
            'Financial Management',
            financialManagementDuties,
            'text-orange-600',
            'bg-orange-600'
          )}
        </div>

        {/* HOD Department Assignments - Detailed View */}
        <HodAssignments hodData={dashboardData} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Enhanced Department Classes */}
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent flex items-center">
                  <Group className="h-6 w-6 mr-3 text-blue-400" />
                  Department Classes
                </CardTitle>
                <Link href="/dashboard/hod/classes">
                  <Button className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white">
                    Manage Classes
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {departmentData.classes.map((classItem) => (
                      <div key={classItem.id} className="flex items-center justify-between p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-colors duration-200">
                        <div className="flex items-center space-x-4">
                          <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-xl p-3">
                            <Group className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{classItem.name}</h4>
                            <p className="text-slate-300 text-sm">{classItem.students} students</p>
                            <p className="text-slate-400 text-xs">{classItem.subjects?.length || 0} department subjects</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{classItem.students}</div>
                          <div className="text-sm text-slate-300">Students</div>
                          <div className="w-20 bg-slate-600/60 rounded-full h-2 mt-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${Math.min((classItem.students / 35) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {departmentData.classes.length === 0 && (
                      <div className="text-center py-8">
                        <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <Group className="h-8 w-8 text-white" />
                        </div>
                        <p className="text-slate-300">No classes assigned yet</p>
                        <p className="text-slate-400 text-sm mt-2">Classes will appear here when assigned</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Department Subjects */}
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                  <Library className="h-6 w-6 mr-3 text-purple-400" />
                  Department Subjects
                </CardTitle>
                <Link href="/dashboard/hod/subjects">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                    Manage Subjects
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {departmentSubjects.map((subject, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-colors duration-200">
                        <div className="flex items-center space-x-4">
                          <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-xl p-3">
                            <Library className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{subject}</h4>
                            <p className="text-slate-300 text-sm">Department subject</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="px-3 py-1 bg-green-600/60 text-green-100 border border-green-400/50 rounded-full text-xs font-medium">
                            Active
                          </div>
                        </div>
                      </div>
                    ))}
                    {departmentSubjects.length === 0 && (
                      <div className="text-center py-8">
                        <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <Library className="h-8 w-8 text-white" />
                        </div>
                        <p className="text-slate-300">No subjects assigned yet</p>
                        <p className="text-slate-400 text-sm mt-2">Subjects will appear here when assigned</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Department Assessments */}
          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent flex items-center">
                <ClipboardList className="h-6 w-6 mr-3 text-orange-400" />
                Department Assessments
              </CardTitle>
              <div className="flex space-x-2">
                <Link href="/dashboard/hod/assessments/create">
                  <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assessment
                  </Button>
                </Link>
                <Link href="/dashboard/hod/assessments">
                  <Button className="bg-slate-600/60 hover:bg-slate-600/80 text-white border border-slate-400/50">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="space-y-4">
                  {/* Department assessments - will be loaded from API */}
                  {departmentData.assessments.map((assessment) => (
                    <div key={assessment.id} className="flex items-center justify-between p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-colors duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-xl p-3">
                          <ClipboardList className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{assessment.title}</h4>
                          <p className="text-slate-300 text-sm">{assessment.subject} • {assessment.class}</p>
                          <p className="text-slate-400 text-xs">Start: {new Date(assessment.start_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium mb-2 ${
                          assessment.status === 'published'
                            ? 'bg-green-600/60 text-green-100 border border-green-400/50'
                            : assessment.status === 'draft'
                            ? 'bg-yellow-600/60 text-yellow-100 border border-yellow-400/50'
                            : 'bg-slate-600/60 text-slate-100 border border-slate-400/50'
                        }`}>
                          {assessment.status}
                        </div>
                        <div className="px-2 py-1 bg-blue-600/60 text-blue-100 border border-blue-400/50 rounded text-xs">
                          {assessment.type}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!dashboardData?.recent_assessments || dashboardData.recent_assessments.length === 0) && (
                    <div className="text-center py-8">
                      <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-slate-300">No assessments in department yet</p>
                      <Link href="/dashboard/hod/assessments/create">
                        <Button className="mt-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">
                          Create Department Assessment
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Department Management Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Department Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/teachers">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  Manage Teachers
                </Button>
              </Link>
              <Link href="/dashboard/attendance">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <UserCheck className="h-6 w-6 mb-2" />
                  Attendance Overview
                </Button>
              </Link>
              <Link href="/dashboard/reports">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  Department Reports
                </Button>
              </Link>
              <Link href="/dashboard/sdg">
                <Button variant="outline" className="w-full h-20 flex flex-col bg-gradient-to-r from-blue-50 to-green-50 hover:from-blue-100 hover:to-green-100 border-blue-200">
                  <Globe className="h-6 w-6 mb-2 text-blue-600" />
                  <span className="text-blue-800 font-semibold">🇺🇳 UN SDGs</span>
                  <span className="text-xs text-blue-600">Global Impact</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

          {/* Enhanced Performance Analytics */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                <TrendingUp className="h-6 w-6 mr-3 text-green-400" />
                Department Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Award className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-green-400 mb-2">{dashboardStats.averagePerformance}%</div>
                    <p className="text-slate-300 font-medium">Average Grade</p>
                    <div className="w-full bg-slate-600/60 rounded-full h-3 mt-3">
                      <div className="bg-green-500 h-3 rounded-full" style={{ width: `${dashboardStats.averagePerformance}%` }}></div>
                    </div>
                  </div>
                  <div className="text-center p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <UserCheck className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-blue-400 mb-2">92%</div>
                    <p className="text-slate-300 font-medium">Attendance Rate</p>
                    <div className="w-full bg-slate-600/60 rounded-full h-3 mt-3">
                      <div className="bg-blue-500 h-3 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                  <div className="text-center p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <ClipboardList className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-purple-400 mb-2">{dashboardStats.pendingAssessments}</div>
                    <p className="text-slate-300 font-medium">Active Assessments</p>
                    <div className="w-full bg-slate-600/60 rounded-full h-3 mt-3">
                      <div className="bg-purple-500 h-3 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Analytics */}
          {departmentData.results.length > 0 && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center">
                  <BarChart3 className="h-6 w-6 mr-3 text-purple-400" />
                  Department Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Performance by Subject */}
                    <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                      <h3 className="text-white font-bold text-lg mb-4 flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-blue-400" />
                        Performance by Subject
                      </h3>
                      <div className="space-y-4">
                        {departmentSubjects.slice(0, 4).map((subject, index) => {
                          const performance = 0
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

                    {/* Grade Distribution */}
                    <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                      <h3 className="text-white font-bold text-lg mb-4 flex items-center">
                        <Award className="h-5 w-5 mr-2 text-green-400" />
                        Grade Distribution
                      </h3>
                      <div className="space-y-3">
                        {[
                          { grade: 'Distinction', percentage: 25, color: 'bg-green-500' },
                          { grade: 'Merit', percentage: 30, color: 'bg-blue-500' },
                          { grade: 'Credit', percentage: 25, color: 'bg-orange-500' },
                          { grade: 'Pass/Satisfactory', percentage: 15, color: 'bg-purple-500' },
                          { grade: 'Fail/Unsatisfactory', percentage: 4, color: 'bg-red-500' },
                          { grade: 'Absent', percentage: 1, color: 'bg-gray-500' }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 rounded ${item.color}`}></div>
                              <span className="text-white text-sm">{item.grade}</span>
                            </div>
                            <span className="text-slate-300 font-semibold">{item.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Department Activities */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent flex items-center">
                <Clock className="h-6 w-6 mr-3 text-yellow-400" />
                Recent Department Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Recent Assessments */}
                  <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center">
                      <ClipboardList className="h-5 w-5 mr-2 text-orange-400" />
                      Recent Assessments
                    </h3>
                    <div className="space-y-3">
                      {departmentData.assessments.length > 0 ? (
                        departmentData.assessments.slice(0, 4).map((assessment, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-600/40 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-lg p-2">
                                <ClipboardList className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="text-white font-semibold text-sm">{assessment.title}</p>
                                <p className="text-slate-300 text-xs">{assessment.subject} • {assessment.status}</p>
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              assessment.status === 'completed'
                                ? 'bg-green-600/60 text-green-100 border border-green-400/50'
                                : 'bg-yellow-600/60 text-yellow-100 border border-yellow-400/50'
                            }`}>
                              {assessment.status}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-300 text-center py-4">No recent assessments</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Results */}
                  <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center">
                      <Award className="h-5 w-5 mr-2 text-green-400" />
                      Recent Results
                    </h3>
                    <div className="space-y-3">
                      {departmentData.results.length > 0 ? (
                        departmentData.results.slice(0, 4).map((result, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-600/40 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                {result.grade}
                              </div>
                              <div>
                                <p className="text-white font-semibold text-sm">{result.student}</p>
                                <p className="text-slate-300 text-xs">{result.subject} • {result.assessment}</p>
                                <p className="text-slate-400 text-xs">{result.marks}/{result.totalMarks} ({Math.round((result.marks/result.totalMarks)*100)}%)</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-300 text-center py-4">No recent results</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Creative Teaching & STEM Hub */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center">
                <Rocket className="h-6 w-6 mr-3 text-purple-400" />
                Creative Teaching & STEM Hub
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CreativeTeachingHub />
            </CardContent>
          </Card>

          {/* HOD Department Assignments - Detailed View */}
          <HodAssignments hodData={dashboardData} />
        </div>
      </DashboardLayout>
    </div>
  )
}
