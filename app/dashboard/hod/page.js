'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StudentRosterCard } from '@/components/dashboard/StudentRosterCard'
import { Button } from '@/components/ui/Button'
import HodAssignments from '@/components/dashboard/HodAssignments'
import { DepartmentTimetableView } from '@/components/timetable/DepartmentTimetableView'
import { useSchoolTimeSlots } from '@/lib/timetable/useSchoolTimeSlots'
import { api } from '@/lib/api'
import { percentTextClass } from '@/lib/utils/percentColor'
import {
  Users,
  BookOpen,
  ClipboardList,
  TrendingUp,
  UserCheck,
  Plus,
  FileText,
  Calendar,
  BarChart3,
  Monitor,
  Clock,
  Settings,
  GraduationCap,
  CheckCircle,
  CalendarDays,
  FileCheck,
  Group,
  DollarSign,
  Package,
  Briefcase,
  School,
  User,
  Award,
  Target,
  AlertTriangle,
  Library,
  Zap,
  Rocket,
  Globe,
} from 'lucide-react'
import Link from 'next/link'
import CreativeTeachingHub from '@/components/creative-teaching/CreativeTeachingHub'

function defaultClassrooms(count) {
  const n = Math.max(8, Math.min(60, count))
  return Array.from({ length: n }).map((_, i) => ({
    id: `room-${i + 1}`,
    name: `Rm${String(101 + i)}`,
    capacity: 50,
    equipment: ['chalkboard'],
    accessibility: ['ground-floor'],
  }))
}

export default function HodDashboard() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Enhanced state management
  const [departmentData, setDepartmentData] = useState({
    teachers: [],
    students: [],
    subjects: [],
    classes: [],
    results: [],
    assessments: [],
    teacherPerformance: [],
  })

  const [dashboardStats, setDashboardStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    totalSubjects: 0,
    totalClasses: 0,
    averagePerformance: 0,
    pendingLessonPlans: 0,
    pendingAssessments: 0,
  })

  const [performanceData, setPerformanceData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTerm, setSelectedTerm] = useState(() => {
    const m = new Date().getMonth()
    if (m <= 3) return 'Term 1'
    if (m <= 7) return 'Term 2'
    return 'Term 3'
  })
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()))

  // Get current user data from auth context
  const { user: currentUser } = useAuth()
  useEffect(() => {
    if (!currentUser) return
    const role = String(currentUser.role || '').toLowerCase()
    const allowed =
      role === 'hod' ||
      role === 'headteacher' ||
      role === 'admin' ||
      Boolean(currentUser.hodProfile)

    if (!allowed) {
      router.replace(`/dashboard/${role || 'teacher'}`)
    }
  }, [currentUser, router])

  // Department configuration
  const departments = {
    Mathematics: [
      'Mathematics',
      'Information Technology',
      'Computer Studies',
      'Additional Mathematics',
    ],
    'Literature and Languages': [
      'English Language',
      'Literature',
      'Kikaonde',
      'Silozi',
      'Chibemba',
      'Chichewa',
      'Chitonga',
      'Luvale',
      'Lunda',
      'Chinese',
      'French',
    ],
    'Social Sciences': ['Geography', 'Social Studies', 'Civic', 'History'],
    'Arts and Design': [
      'Physical Education',
      'Music',
      'Expressive Art',
      'Design and Technology',
      'Metalwork',
      'Woodwork',
    ],
    'Natural Sciences': [
      'Biology',
      'Physics',
      'Chemistry',
      'Integrated Science',
      'Agricultural Sciences',
    ],
    'Business Studies': ['Commerce', 'Accounts', 'Business Studies', 'Religious Education'],
    'Home Economics': ['Home Economics', 'Fashion and Fabrics', 'Food and Nutrition'],
  }

  const currentDepartment =
    currentUser?.department ||
    currentUser?.hodProfile?.departmentRef?.name ||
    currentUser?.hodProfile?.department ||
    ''

  const { timeSlots } = useSchoolTimeSlots()
  const [timetableMobile, setTimetableMobile] = useState(false)
  const timetableTeachers = useMemo(() => {
    const list = Array.isArray(departmentData?.teachers) ? departmentData.teachers : []
    return list.map((t) => ({
      id: String(t?.id || t?.user?.id || t?.userId || ''),
      fullName: t?.user?.name || t?.name || t?.fullName || 'Teacher',
      subjects: [],
      availability: [],
      maxHours: {},
      traveling: { enabled: false, schools: [] },
      department: t?.department || t?.user?.department,
    }))
  }, [departmentData?.teachers])
  const departmentTeacherIds = useMemo(
    () => timetableTeachers.map((t) => String(t.id)).filter(Boolean),
    [timetableTeachers]
  )
  const timetableClassrooms = useMemo(
    () => defaultClassrooms(Math.max(12, timetableTeachers.length)),
    [timetableTeachers.length]
  )
  const normalizedDepartment =
    currentDepartment === 'Art and Design' ? 'Arts and Design' : currentDepartment
  const departmentSubjects = useMemo(() => {
    return departments[normalizedDepartment] || departments[currentDepartment] || []
  }, [normalizedDepartment, currentDepartment])

  useEffect(() => {
    const update = () => setTimetableMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Data initialization - Load from API
  useEffect(() => {
    // Initialize with empty arrays - data will come from API
    setDepartmentData({
      teachers: [],
      students: [],
      subjects: [],
      classes: [],
      results: [],
      assessments: [],
    })
  }, [departmentSubjects])

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats().then((res) => res.data),
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['hod-dashboard', selectedTerm, selectedYear],
    queryFn: () =>
      api.getHodDashboard({ term: selectedTerm, year: selectedYear }).then((res) => res.data),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const { data: teacherProgressData } = useQuery({
    queryKey: ['hod-teacher-progress', selectedTerm, selectedYear],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (selectedTerm && selectedTerm !== 'All Terms') qs.set('term', selectedTerm)
      if (selectedYear) qs.set('year', selectedYear)
      const suffix = qs.toString()
      const res = await api.get(`/dashboard/hod/teacher-progress${suffix ? `?${suffix}` : ''}`)
      return res.data
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const updateTeacherProgress = async (teacherId, patch) => {
    const termValue = selectedTerm && selectedTerm !== 'All Terms' ? selectedTerm : undefined
    await fetch('/api/dashboard/hod/teacher-progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        teacherId,
        ...(termValue ? { term: termValue } : {}),
        year: selectedYear,
        ...patch,
      }),
    })
    await queryClient.invalidateQueries({
      queryKey: ['hod-teacher-progress', selectedTerm, selectedYear],
    })
  }

  useEffect(() => {
    const data = dashboardData?.data
    if (!data) return

    setDepartmentData({
      teachers: Array.isArray(data.teachers) ? data.teachers : [],
      students: Array.isArray(data.students) ? data.students : [],
      subjects: Array.isArray(data.subjects) ? data.subjects : [],
      classes: Array.isArray(data.classes) ? data.classes : [],
      results: Array.isArray(data.results) ? data.results : [],
      assessments: Array.isArray(data.assessments) ? data.assessments : [],
      teacherPerformance: Array.isArray(data.teacherPerformance) ? data.teacherPerformance : [],
    })

    setDashboardStats((prev) => ({
      ...prev,
      totalTeachers: data.stats?.totalTeachers || 0,
      totalStudents: data.stats?.totalStudents || 0,
      totalSubjects: data.stats?.totalSubjects || 0,
      totalClasses: data.stats?.totalClasses || 0,
      averagePerformance: data.stats?.averagePerformance || 0,
      pendingLessonPlans: data.stats?.pendingLessonPlans || 0,
      pendingAssessments: data.stats?.pendingAssessments || 0,
    }))
  }, [dashboardData])

  // HOD Administrative Duties Data
  const fileManagementDuties = [
    {
      id: 'correspondence',
      title: 'Correspondence File',
      description: 'Manage incoming/outgoing communications',
      icon: FileText,
      route: '/dashboard/hod/correspondence',
    },
    {
      id: 'meetings',
      title: 'Meeting Files',
      description: 'Department and staff meeting records',
      icon: Group,
      route: '/dashboard/hod/meetings',
    },
    {
      id: 'exam-analysis',
      title: 'Exam Analysis',
      description: 'Assessment performance analysis',
      icon: BarChart3,
      route: '/dashboard/hod/exam-analysis',
    },
    {
      id: 'monitoring',
      title: 'Monitoring File',
      description: 'Department oversight and tracking',
      icon: Monitor,
      route: '/dashboard/hod/monitoring',
    },
    {
      id: 'minutes',
      title: 'Department Minutes',
      description: 'Meeting minutes and decisions',
      icon: FileCheck,
      route: '/dashboard/hod/minutes',
    },
    {
      id: 'staff-meetings',
      title: 'Staff Meeting File',
      description: 'Staff meeting documentation',
      icon: Calendar,
      route: '/dashboard/hod/staff-meetings',
    },
  ]

  const academicManagementDuties = [
    {
      id: 'cpd',
      title: 'CPD File',
      description: 'Continuous Professional Development records',
      icon: GraduationCap,
      route: '/dashboard/hod/cpd',
    },
    {
      id: 'timetable',
      title: 'Timetable & Class Allocation',
      description: 'Schedule and class management',
      icon: CalendarDays,
      route: '/dashboard/timetable/hod',
    },
    {
      id: 'teacher-performance',
      title: 'Teacher Performance',
      description: 'Monitor teacher performance and effectiveness',
      icon: TrendingUp,
      route: '/dashboard/hod/teacher-performance',
    },
  ]

  const dailyOperationsDuties = [
    {
      id: 'daily-routine',
      title: 'Daily Routine',
      description: 'Day-to-day operational tasks',
      icon: Clock,
      route: '/dashboard/hod/daily-routine',
    },
  ]

  const financialManagementDuties = [
    {
      id: 'budget',
      title: 'Budget File',
      description: 'Department budget management',
      icon: DollarSign,
      route: '/dashboard/hod/budget',
    },
    {
      id: 'stock-book',
      title: 'Stock Book',
      description: 'Inventory and stock management',
      icon: Package,
      route: '/dashboard/hod/stock-book',
    },
  ]

  const handleDutyClick = (route) => {
    router.push(route)
  }

  const renderDutySection = (title, duties, headerBgClass, buttonHoverClasses) => (
    <Card className="mb-6">
      <CardHeader className={`${headerBgClass} text-royalPurple-text1`}>
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
                className={`h-auto p-4 justify-start text-left ${buttonHoverClasses} transition-all duration-200`}
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
      <div className="min-h-screen bg-gradient-to-br from-ink via-g-800 to-g-700 relative overflow-hidden">
        <DashboardLayout title="Head of Department Dashboard">
          <div className="space-y-6">
            <Card variant="glass">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-16 w-16 text-royalPurple-dangerTx mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-royalPurple-text1 mb-2">
                  No Department Assigned
                </h2>
                <p className="text-royalPurple-text2">
                  Please contact the administrator to assign you to a department.
                </p>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink via-g-800 to-g-700 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-accent/20 to-accent/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-accent/20 to-accent/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-r from-warn/20 to-accent/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      <DashboardLayout title="Head of Department Dashboard">
        <div className="space-y-8 relative z-10">
          {/* Enhanced Header */}
          <div className="backdrop-blur-lg bg-royalPurple-card/60 border border-accent/100/40 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-royalPurple-text1 mb-4">
                  {currentDepartment} Department
                </h1>
                <p className="text-royalPurple-text2 text-lg">Head of Department Dashboard</p>
                <p className="text-royalPurple-text3 text-sm mt-2">
                  Welcome back, {currentUser?.name || 'HOD'}!
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="backdrop-blur-md bg-accent/60 border border-accent/80/50 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-royalPurple-text1">
                    {new Date().getDate()}
                  </div>
                  <div className="text-sm text-accent/40">
                    {new Date().toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                </div>
                <div className="backdrop-blur-md bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-xs text-royalPurple-text3 mb-1">Term</div>
                      <select
                        className="bg-royalPurple-deep border border-royalPurple-border rounded-lg px-3 py-2 text-sm text-royalPurple-text1 outline-none"
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                      >
                        <option value="All Terms">All Terms</option>
                        <option value="Term 1">Term 1</option>
                        <option value="Term 2">Term 2</option>
                        <option value="Term 3">Term 3</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-xs text-royalPurple-text3 mb-1">Year</div>
                      <input
                        className="bg-royalPurple-deep border border-royalPurple-border rounded-lg px-3 py-2 text-sm text-royalPurple-text1 outline-none w-24"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-accent/100 to-accent flex items-center justify-center text-royalPurple-text1 font-bold text-xl">
                  {currentUser?.name?.charAt(0) || 'H'}
                </div>
              </div>
            </div>
          </div>

          {/* Department Subjects Overview */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <Library className="h-6 w-6 mr-3 text-accent/80" />
                Department Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                <div className="flex flex-wrap gap-3">
                  {departmentSubjects.map((subject, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 bg-accent/60 text-accent/20 border border-accent/80/50 rounded-full text-sm font-medium flex items-center"
                    >
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
            <section className="w-full py-3">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-x-10 gap-y-6">
                <StatsCard
                  title="Teachers"
                  value={dashboardStats.totalTeachers}
                  icon={Users}
                  color="blue"
                  description="Department teachers"
                  variant="flat"
                />
                <StatsCard
                  title="Students"
                  value={dashboardStats.totalStudents}
                  icon={School}
                  color="green"
                  description="Department students"
                  variant="flat"
                />
                <StatsCard
                  title="Subjects"
                  value={dashboardStats.totalSubjects}
                  icon={Library}
                  color="purple"
                  description="Subjects managed"
                  variant="flat"
                />
                <StatsCard
                  title="Classes"
                  value={dashboardStats.totalClasses}
                  icon={Group}
                  color="yellow"
                  description="Classes supervised"
                  variant="flat"
                />
                <StatsCard
                  title="Lesson Plans"
                  value={dashboardStats.pendingLessonPlans}
                  icon={FileText}
                  color="purple"
                  description="Pending approval"
                  variant="flat"
                />
                <StatsCard
                  title="Performance"
                  value={`${dashboardStats.averagePerformance}%`}
                  icon={TrendingUp}
                  color="orange"
                  description="Average performance"
                  variant="flat"
                />
                <StatsCard
                  title="Assessments"
                  value={dashboardStats.pendingAssessments}
                  icon={ClipboardList}
                  color="red"
                  description="Pending assessments"
                  variant="flat"
                />
              </div>
            </section>

            <section className="max-w-none">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-royalPurple-text1">Class Allocations</h2>
                <div className="flex items-center gap-2 print:hidden">
                  <Link
                    href="/dashboard/hod/allocation"
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-accent/70 border border-accent/80/50 text-royalPurple-text1 hover:bg-accent transition-colors font-semibold"
                  >
                    <Plus className="h-4 w-4" />
                    Add/Push Allocations
                  </Link>
                </div>
              </div>
              <div className="mt-4 p-8 backdrop-blur-md bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-3xl text-center">
                <BookOpen className="h-12 w-12 text-accent/80 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-royalPurple-text1">
                  Manage Department Teaching
                </h3>
                <p className="text-royalPurple-text2 mt-2 max-w-md mx-auto">
                  Assign teachers to subjects and classes. Once complete, push them to the
                  headteacher to generate the master timetable.
                </p>
                <Link href="/dashboard/hod/allocation">
                  <Button className="mt-6 bg-accent/60 hover:bg-accent/80 text-royalPurple-text1 border border-accent/80/50">
                    Open Allocation Manager
                  </Button>
                </Link>
              </div>
            </section>

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-royalPurple-text1 flex items-center">
                  <UserCheck className="h-6 w-6 mr-3 text-accent/80" />
                  Teacher Progress & CPD ({teacherProgressData?.data?.term || 'Term'})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-royalPurple-deep/60 border border-royalPurple-border/40 rounded-xl p-4">
                      <div className="text-sm text-royalPurple-text2 mb-2">Schemes of Work</div>
                      <div className="flex items-end justify-between">
                        <div className="text-2xl font-bold text-royalPurple-text1">
                          {teacherProgressData?.data?.summary?.schemePercent || 0}%
                        </div>
                        <div className="text-sm text-royalPurple-text3">
                          {teacherProgressData?.data?.summary?.schemeCount || 0}/
                          {teacherProgressData?.data?.summary?.totalTeachers || 0}
                        </div>
                      </div>
                      <div className="w-full bg-royalPurple-card2 rounded-full h-2 mt-3">
                        <div
                          className="bg-royalPurple-pill h-2 rounded-full"
                          style={{
                            width: `${teacherProgressData?.data?.summary?.schemePercent || 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="bg-royalPurple-deep/60 border border-royalPurple-border/40 rounded-xl p-4">
                      <div className="text-sm text-royalPurple-text2 mb-2">Records of Work</div>
                      <div className="flex items-end justify-between">
                        <div className="text-2xl font-bold text-royalPurple-text1">
                          {teacherProgressData?.data?.summary?.recordsPercent || 0}%
                        </div>
                        <div className="text-sm text-royalPurple-text3">
                          {teacherProgressData?.data?.summary?.recordsCount || 0}/
                          {teacherProgressData?.data?.summary?.totalTeachers || 0}
                        </div>
                      </div>
                      <div className="w-full bg-royalPurple-card2 rounded-full h-2 mt-3">
                        <div
                          className="bg-royalPurple-success h-2 rounded-full"
                          style={{
                            width: `${teacherProgressData?.data?.summary?.recordsPercent || 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="bg-royalPurple-deep/60 border border-royalPurple-border/40 rounded-xl p-4">
                      <div className="text-sm text-royalPurple-text2 mb-2">CPD Hours (Term)</div>
                      <div className="flex items-end justify-between">
                        <div className="text-2xl font-bold text-royalPurple-text1">
                          {teacherProgressData?.data?.summary?.cpdPercent || 0}%
                        </div>
                        <div className="text-sm text-royalPurple-text3">
                          {teacherProgressData?.data?.summary?.totalCpdHours || 0}/
                          {teacherProgressData?.data?.summary?.totalCpdTarget || 0}
                        </div>
                      </div>
                      <div className="w-full bg-royalPurple-card2 rounded-full h-2 mt-3">
                        <div
                          className="bg-royalPurple-accent h-2 rounded-full"
                          style={{
                            width: `${teacherProgressData?.data?.summary?.cpdPercent || 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-royalPurple-text3">
                          <th className="py-2 pr-4 font-semibold">Teacher</th>
                          <th className="py-2 pr-4 font-semibold">Scheme</th>
                          <th className="py-2 pr-4 font-semibold">Records</th>
                          <th className="py-2 pr-4 font-semibold">CPD Hours</th>
                          <th className="py-2 pr-4 font-semibold">Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(teacherProgressData?.data?.teachers || []).slice(0, 10).map((t) => (
                          <tr key={t.teacherId} className="border-t border-royalPurple-border/30">
                            <td className="py-3 pr-4">
                              <div className="text-royalPurple-text1 font-medium">{t.name}</div>
                              <div className="text-royalPurple-text3 text-xs">{t.email}</div>
                            </td>
                            <td className="py-3 pr-4">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-royalPurple-border bg-royalPurple-deep accent-royalPurple-accent focus:ring-1 focus:ring-royalPurple-border2 focus:ring-offset-0"
                                checked={t.schemeSubmitted === true}
                                onChange={(e) =>
                                  updateTeacherProgress(t.teacherId, {
                                    schemeSubmitted: e.target.checked,
                                  })
                                }
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-royalPurple-border bg-royalPurple-deep accent-royalPurple-accent focus:ring-1 focus:ring-royalPurple-border2 focus:ring-offset-0"
                                checked={t.recordsSubmitted === true}
                                onChange={(e) =>
                                  updateTeacherProgress(t.teacherId, {
                                    recordsSubmitted: e.target.checked,
                                  })
                                }
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <input
                                type="number"
                                min="0"
                                defaultValue={t.cpdHours ?? 0}
                                className="bg-royalPurple-deep border border-royalPurple-border rounded-lg px-3 py-2 text-royalPurple-text1 w-28"
                                onBlur={(e) =>
                                  updateTeacherProgress(t.teacherId, { cpdHours: e.target.value })
                                }
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <input
                                type="number"
                                min="0"
                                defaultValue={t.cpdTargetHours ?? 10}
                                className="bg-royalPurple-deep border border-royalPurple-border rounded-lg px-3 py-2 text-royalPurple-text1 w-28"
                                onBlur={(e) =>
                                  updateTeacherProgress(t.teacherId, {
                                    cpdTargetHours: e.target.value,
                                  })
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end mt-5">
                    <Button
                      className="bg-accent/60 hover:bg-accent/80 text-royalPurple-text1 border border-accent/80/50"
                      onClick={() => router.push('/dashboard/hod/cpd')}
                    >
                      Open CPD Tracker
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced HOD Features */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-royalPurple-text1 flex items-center">
                  <Zap className="h-6 w-6 mr-3 text-warn" />
                  Advanced Department Management Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {/* Department Analytics */}
                    <div className="bg-gradient-to-br from-accent/20 to-accent/20 border border-accent/80/30 rounded-xl p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-accent/100/30 rounded-lg flex items-center justify-center mr-3">
                          <BarChart3 className="h-5 w-5 text-accent/60" />
                        </div>
                        <h4 className="font-semibold text-royalPurple-text1">
                          Department Analytics
                        </h4>
                      </div>
                      <ul className="space-y-2 text-sm text-royalPurple-text2">
                        <li>Performance Dashboards</li>
                        <li>Teacher Effectiveness Metrics</li>
                        <li>Student Progress Tracking</li>
                        <li>Resource Utilization Reports</li>
                      </ul>
                      <Button
                        className="w-full mt-3 bg-accent/60 hover:bg-accent/80 text-royalPurple-text1 border border-accent/80/50"
                        onClick={() => router.push('/dashboard/hod/exam-analysis')}
                      >
                        View Analytics
                      </Button>
                    </div>

                    {/* Teacher Development */}
                    <div className="bg-gradient-to-br from-ink/20 to-g-700/20 border border-royalPurple-border2/30 rounded-xl p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-royalPurple-accent/30 rounded-lg flex items-center justify-center mr-3">
                          <Users className="h-5 w-5 text-royalPurple-accentTx" />
                        </div>
                        <h4 className="font-semibold text-royalPurple-text1">
                          Teacher Development
                        </h4>
                      </div>
                      <ul className="space-y-2 text-sm text-royalPurple-text2">
                        <li>Professional Development Plans</li>
                        <li>Training Resource Library</li>
                        <li>Mentorship Programs</li>
                        <li>Performance Evaluations</li>
                      </ul>
                      <Button
                        className="w-full mt-3 bg-royalPurple-accent/60 hover:bg-royalPurple-accent/80 text-royalPurple-text1 border border-royalPurple-border2/50"
                        onClick={() => router.push('/dashboard/hod/cpd')}
                      >
                        Manage Development
                      </Button>
                    </div>

                    {/* Curriculum Management */}
                    <div className="bg-gradient-to-br from-kpi-pass/20 to-kpi-pass/20 border border-royalPurple-border/30 rounded-xl p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-royalPurple-success/30 rounded-lg flex items-center justify-center mr-3">
                          <BookOpen className="h-5 w-5 text-royalPurple-successTx" />
                        </div>
                        <h4 className="font-semibold text-royalPurple-text1">
                          Curriculum Management
                        </h4>
                      </div>
                      <ul className="space-y-2 text-sm text-royalPurple-text2">
                        <li>Curriculum Planning Tools</li>
                        <li>Assessment Coordination</li>
                        <li>Academic Calendar Management</li>
                        <li>Learning Outcome Tracking</li>
                      </ul>
                      <Button
                        className="w-full mt-3 bg-royalPurple-success/60 hover:bg-royalPurple-success/80 text-royalPurple-text1 border border-royalPurple-border/50"
                        onClick={() => router.push('/dashboard/timetable/hod')}
                      >
                        Manage Curriculum
                      </Button>
                    </div>
                  </div>

                  {/* Implementation Status */}
                  <div className="bg-gradient-to-r from-accent/20 to-warn/20 border border-royalPurple-border2/30 rounded-xl p-4">
                    <h4 className="font-semibold text-royalPurple-text1 mb-3 flex items-center">
                      <Target className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
                      Advanced Features Implementation Status
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-royalPurple-text2">HOD Dashboard Features</span>
                          <span className="font-semibold text-royalPurple-pillTx">
                            Ready for Testing
                          </span>
                        </div>
                        <div className="w-full bg-royalPurple-muted rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-accent to-warn h-2 rounded-full"
                            style={{ width: '80%' }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-xs text-royalPurple-text3 space-y-1">
                        <div>Student Features Complete</div>
                        <div>Learning Enhancement Complete</div>
                        <div>Cultural Integration Complete</div>
                        <div>Teacher Features Complete</div>
                        <div>HOD Features (80% Complete)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Overview */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-royalPurple-text1 flex items-center">
                  <BarChart3 className="h-6 w-6 mr-3 text-royalPurple-accentTx" />
                  Department Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <Users className="h-10 w-10 text-royalPurple-text1" />
                      </div>
                      <h3 className="font-bold text-royalPurple-text1 text-lg">Teachers</h3>
                      <p className="text-3xl font-bold text-royalPurple-accentTx mt-2">
                        {dashboardStats.totalTeachers}
                      </p>
                      <p className="text-royalPurple-text2 text-sm mt-1">Department staff</p>
                    </div>
                    <div className="text-center">
                      <div className="backdrop-blur-md bg-royalPurple-success/60 border border-royalPurple-border/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <School className="h-10 w-10 text-royalPurple-text1" />
                      </div>
                      <h3 className="font-bold text-royalPurple-text1 text-lg">Students</h3>
                      <p className="text-3xl font-bold text-royalPurple-successTx mt-2">
                        {dashboardStats.totalStudents}
                      </p>
                      <p className="text-royalPurple-text2 text-sm mt-1">Enrolled students</p>
                    </div>
                    <div className="text-center">
                      <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <Award className="h-10 w-10 text-royalPurple-text1" />
                      </div>
                      <h3 className="font-bold text-royalPurple-text1 text-lg">Performance</h3>
                      <p className="text-3xl font-bold text-royalPurple-pillTx mt-2">
                        {dashboardStats.averagePerformance}%
                      </p>
                      <p className="text-royalPurple-text2 text-sm mt-1">Department average</p>
                    </div>
                    <div className="text-center">
                      <div className="backdrop-blur-md bg-accent/60 border border-accent/80/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="h-10 w-10 text-royalPurple-text1" />
                      </div>
                      <h3 className="font-bold text-royalPurple-text1 text-lg">Assessments</h3>
                      <p className="text-3xl font-bold text-accent/80 mt-2">
                        {dashboardStats.pendingAssessments}
                      </p>
                      <p className="text-royalPurple-text2 text-sm mt-1">Pending review</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <StudentRosterCard title="Registered Students by Class (School-wide)" />

            {/* Department Management */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-royalPurple-text1 flex items-center">
                  <Users className="h-6 w-6 mr-3 text-royalPurple-successTx" />
                  Department Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Department Teachers */}
                    <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-royalPurple-text1 font-bold text-lg flex items-center">
                          <Users className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
                          Department Teachers
                        </h3>
                        <span className="text-royalPurple-text2 text-sm">
                          {departmentData.teachers.length} teachers
                        </span>
                      </div>
                      <div className="space-y-3">
                        {departmentData.teachers.slice(0, 4).map((teacher, index) => {
                          const teacherName = teacher?.user?.name || teacher?.name || 'Unknown'
                          const teacherUserId = String(teacher?.user?.id || teacher?.userId || '')
                          const teacherSubjects = Array.isArray(teacher?.assignedSubjects)
                            ? teacher.assignedSubjects
                            : Array.isArray(teacher?.subjects)
                              ? teacher.subjects
                              : Array.isArray(teacher?.teachingAssignments)
                                ? Array.from(
                                    new Set(
                                      teacher.teachingAssignments
                                        .map((a) => a?.subject?.name || a?.subjectId)
                                        .filter(Boolean)
                                        .map(String)
                                    )
                                  )
                                : []
                          const teacherClasses = Array.isArray(teacher?.classes)
                            ? teacher.classes
                            : Array.isArray(teacher?.assignedClasses)
                              ? teacher.assignedClasses
                              : Array.isArray(teacher?.teachingAssignments)
                                ? Array.from(
                                    new Set(
                                      teacher.teachingAssignments
                                        .map((a) => a?.class?.name || a?.classId)
                                        .filter(Boolean)
                                        .map(String)
                                    )
                                  )
                                : []

                          const perf =
                            departmentData.teacherPerformance.find(
                              (p) => String(p?.userId || '') === teacherUserId
                            ) || null

                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-ink to-accent flex items-center justify-center text-royalPurple-text1 font-bold text-sm">
                                  {teacherName.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-royalPurple-text1 font-semibold text-sm">
                                    {teacherName}
                                  </p>
                                  <p className="text-royalPurple-text2 text-xs">
                                    {teacherSubjects.length} subjects • {teacherClasses.length}{' '}
                                    classes • Avg {perf?.averageScore ?? 0}% •{' '}
                                    {perf?.resultsEntered ?? 0} results
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {departmentData.teachers.length > 4 && (
                          <p className="text-royalPurple-text2 text-sm text-center">
                            +{departmentData.teachers.length - 4} more teachers
                          </p>
                        )}
                      </div>
                      <Button
                        className="w-full mt-4 bg-royalPurple-accent/60 hover:bg-royalPurple-accent/80 text-royalPurple-text1 border border-royalPurple-border2/50"
                        onClick={() => router.push('/dashboard/users?filter=teachers')}
                      >
                        Manage Teachers
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full mt-3"
                        onClick={() => router.push('/dashboard/hod/teacher-performance')}
                      >
                        Teacher Performance
                      </Button>
                    </div>

                    {/* Department Students */}
                    <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-royalPurple-text1 font-bold text-lg flex items-center">
                          <School className="h-5 w-5 mr-2 text-royalPurple-successTx" />
                          Department Students
                        </h3>
                        <span className="text-royalPurple-text2 text-sm">
                          {departmentData.students.length} students
                        </span>
                      </div>
                      <div className="space-y-3">
                        {departmentData.students.slice(0, 4).map((student, index) => {
                          const studentName = student?.user?.name || student?.name || 'Unknown'
                          const studentClass =
                            student?.class ||
                            student?.yearGroup ||
                            student?.year_group ||
                            'No class'
                          const studentSubjects = Array.isArray(student?.selected_subjects)
                            ? student.selected_subjects
                            : Array.isArray(student?.subjects)
                              ? student.subjects
                              : []

                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-kpi-pass/100 to-ink flex items-center justify-center text-royalPurple-text1 font-bold text-sm">
                                  {studentName.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-royalPurple-text1 font-semibold text-sm">
                                    {studentName}
                                  </p>
                                  <p className="text-royalPurple-text2 text-xs">{studentClass}</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {studentSubjects
                                      .filter((subject) => departmentSubjects.includes(subject))
                                      .slice(0, 2)
                                      .map((subject, idx) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-1 bg-royalPurple-success/60 text-royalPurple-successTx border border-royalPurple-border/50 rounded text-xs"
                                        >
                                          {subject}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {departmentData.students.length > 4 && (
                          <p className="text-royalPurple-text2 text-sm text-center">
                            +{departmentData.students.length - 4} more students
                          </p>
                        )}
                      </div>
                      <Button
                        className="w-full mt-4 bg-royalPurple-success/60 hover:bg-royalPurple-success/80 text-royalPurple-text1 border border-royalPurple-border/50"
                        onClick={() => router.push('/dashboard/users?filter=students')}
                      >
                        View All Students
                      </Button>
                    </div>

                    {/* Department Classes */}
                    <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-royalPurple-text1 font-bold text-lg flex items-center">
                          <Group className="h-5 w-5 mr-2 text-royalPurple-pillTx" />
                          Department Classes
                        </h3>
                        <span className="text-royalPurple-text2 text-sm">
                          {departmentData.classes.length} classes
                        </span>
                      </div>
                      <div className="space-y-3">
                        {departmentData.classes.slice(0, 4).map((classItem, index) => {
                          const className = classItem?.name ? String(classItem.name) : ''
                          const studentsInClass = className
                            ? departmentData.students.filter(
                                (s) => String(s?.class || '') === className
                              ).length
                            : 0
                          const subjectsInClass = Array.isArray(classItem?.subjects)
                            ? classItem.subjects
                            : []

                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-lg p-2">
                                  <Group className="h-4 w-4 text-royalPurple-text1" />
                                </div>
                                <div>
                                  <p className="text-royalPurple-text1 font-semibold text-sm">
                                    {classItem.name}
                                  </p>
                                  <p className="text-royalPurple-text2 text-xs">
                                    {typeof classItem.students === 'number'
                                      ? classItem.students
                                      : studentsInClass}{' '}
                                    students
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-royalPurple-pillTx text-sm font-semibold">
                                  {subjectsInClass.length}
                                </p>
                                <p className="text-royalPurple-text3 text-xs">subjects</p>
                              </div>
                            </div>
                          )
                        })}
                        {departmentData.classes.length > 4 && (
                          <p className="text-royalPurple-text2 text-sm text-center">
                            +{departmentData.classes.length - 4} more classes
                          </p>
                        )}
                      </div>
                      <Button
                        className="w-full mt-4 bg-royalPurple-pill/60 hover:bg-royalPurple-pill/80 text-royalPurple-text1 border border-royalPurple-border2/50"
                        onClick={() => router.push('/dashboard/classes')}
                      >
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
              <h2 className="text-3xl font-bold text-royalPurple-text1 mb-2">
                HOD Administrative Duties
              </h2>
              <p className="text-royalPurple-text2">
                Comprehensive department management and administrative functions
              </p>
            </div>

            {/* File Management Section */}
            {renderDutySection(
              'File Management',
              fileManagementDuties,
              'bg-royalPurple-accent',
              'hover:bg-royalPurple-accent hover:text-royalPurple-text1'
            )}

            {/* Academic Management Section */}
            {renderDutySection(
              'Academic Management',
              academicManagementDuties,
              'bg-royalPurple-pill',
              'hover:bg-royalPurple-pill hover:text-royalPurple-text1'
            )}

            {/* Daily Operations Section */}
            {renderDutySection(
              'Daily Operations',
              dailyOperationsDuties,
              'bg-royalPurple-success',
              'hover:bg-royalPurple-success hover:text-royalPurple-text1'
            )}

            {/* Financial Management Section */}
            {renderDutySection(
              'Financial Management',
              financialManagementDuties,
              'bg-accent',
              'hover:bg-accent hover:text-royalPurple-text1'
            )}
          </div>

          {/* HOD Department Assignments - Detailed View */}
          <HodAssignments hodData={dashboardData} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Enhanced Department Classes */}
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-royalPurple-text1 flex items-center">
                  <Group className="h-6 w-6 mr-3 text-royalPurple-accentTx" />
                  Department Classes
                </CardTitle>
                <Link href="/dashboard/classes">
                  <Button className="bg-gradient-to-r from-ink to-kpi-pass hover:from-g-800 hover:to-g-700 text-royalPurple-text1">
                    Manage Classes
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {departmentData.classes.map((classItem) => (
                      <div
                        key={classItem.id}
                        className="flex items-center justify-between p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-xl p-3">
                            <Group className="h-6 w-6 text-royalPurple-text1" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-royalPurple-text1">
                              {classItem.name}
                            </h4>
                            <p className="text-royalPurple-text2 text-sm">
                              {classItem.students} students
                            </p>
                            <p className="text-royalPurple-text3 text-xs">
                              {classItem.subjects?.length || 0} department subjects
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-royalPurple-text1">
                            {classItem.students}
                          </div>
                          <div className="text-sm text-royalPurple-text2">Students</div>
                          <div className="w-20 bg-royalPurple-muted/60 rounded-full h-2 mt-2">
                            <div
                              className="bg-royalPurple-accent h-2 rounded-full"
                              style={{
                                width: `${Math.min((classItem.students / 35) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {departmentData.classes.length === 0 && (
                      <div className="text-center py-8">
                        <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <Group className="h-8 w-8 text-royalPurple-text1" />
                        </div>
                        <p className="text-royalPurple-text2">No classes assigned yet</p>
                        <p className="text-royalPurple-text3 text-sm mt-2">
                          Classes will appear here when assigned
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Department Subjects */}
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-royalPurple-text1 flex items-center">
                  <Library className="h-6 w-6 mr-3 text-royalPurple-pillTx" />
                  Department Subjects
                </CardTitle>
                <Link href="/dashboard/hod/subjects">
                  <Button className="bg-gradient-to-r from-accent to-ink hover:from-accent hover:to-g-800 text-royalPurple-text1">
                    Manage Subjects
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {departmentSubjects.map((subject, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-xl p-3">
                            <Library className="h-6 w-6 text-royalPurple-text1" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-royalPurple-text1">{subject}</h4>
                            <p className="text-royalPurple-text2 text-sm">Department subject</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="px-3 py-1 bg-royalPurple-success/60 text-royalPurple-successTx border border-royalPurple-border/50 rounded-full text-xs font-medium">
                            Active
                          </div>
                        </div>
                      </div>
                    ))}
                    {departmentSubjects.length === 0 && (
                      <div className="text-center py-8">
                        <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <Library className="h-8 w-8 text-royalPurple-text1" />
                        </div>
                        <p className="text-royalPurple-text2">No subjects assigned yet</p>
                        <p className="text-royalPurple-text3 text-sm mt-2">
                          Subjects will appear here when assigned
                        </p>
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
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <ClipboardList className="h-6 w-6 mr-3 text-accent/80" />
                Department Assessments
              </CardTitle>
              <div className="flex space-x-2">
                <Link href="/dashboard/hod/assessments/create">
                  <Button className="bg-gradient-to-r from-accent to-accent hover:from-accent hover:to-accent text-royalPurple-text1">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assessment
                  </Button>
                </Link>
                <Link href="/dashboard/hod/assessments">
                  <Button className="bg-royalPurple-muted/60 hover:bg-royalPurple-muted/80 text-royalPurple-text1 border border-royalPurple-border/50">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                <div className="space-y-4">
                  {/* Department assessments - will be loaded from API */}
                  {departmentData.assessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="flex items-center justify-between p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="backdrop-blur-md bg-accent/60 border border-accent/80/50 rounded-xl p-3">
                          <ClipboardList className="h-6 w-6 text-royalPurple-text1" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-royalPurple-text1">
                            {assessment.title}
                          </h4>
                          <p className="text-royalPurple-text2 text-sm">
                            {assessment.subject} • {assessment.class}
                          </p>
                          <p className="text-royalPurple-text3 text-xs">
                            Start: {new Date(assessment.start_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium mb-2 ${
                            assessment.status === 'published'
                              ? 'bg-royalPurple-success/60 text-royalPurple-successTx border border-royalPurple-border/50'
                              : assessment.status === 'draft'
                                ? 'bg-warn/60 text-warn/20 border border-warn/50'
                                : 'bg-royalPurple-muted/60 text-royalPurple-text1 border border-royalPurple-border/50'
                          }`}
                        >
                          {assessment.status}
                        </div>
                        <div className="px-2 py-1 bg-royalPurple-accent/60 text-royalPurple-accentTx border border-royalPurple-border2/50 rounded text-xs">
                          {assessment.type}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!dashboardData?.recent_assessments ||
                    dashboardData.recent_assessments.length === 0) && (
                    <div className="text-center py-8">
                      <div className="backdrop-blur-md bg-accent/60 border border-accent/80/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="h-8 w-8 text-royalPurple-text1" />
                      </div>
                      <p className="text-royalPurple-text2">No assessments in department yet</p>
                      <Link href="/dashboard/hod/assessments/create">
                        <Button className="mt-4 bg-gradient-to-r from-accent to-accent hover:from-accent hover:to-accent text-royalPurple-text1">
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
                  <Button
                    variant="outline"
                    className="w-full h-20 flex flex-col bg-gradient-to-r from-accent/5 to-kpi-pass/10 hover:from-accent/10 hover:to-kpi-pass/20 border-royalPurple-border2"
                  >
                    <Globe className="h-6 w-6 mb-2 text-royalPurple-accentTx" />
                    <span className="text-royalPurple-accentTx font-semibold">🇺🇳 UN SDGs</span>
                    <span className="text-xs text-royalPurple-accentTx">Global Impact</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Performance Analytics */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <TrendingUp className="h-6 w-6 mr-3 text-royalPurple-successTx" />
                Department Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                    <div className="backdrop-blur-md bg-royalPurple-success/60 border border-royalPurple-border/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Award className="h-8 w-8 text-royalPurple-text1" />
                    </div>
                    <div
                      className={`text-3xl font-bold mb-2 ${percentTextClass(dashboardStats.averagePerformance)}`}
                    >
                      {Number(dashboardStats.averagePerformance) || 0}%
                    </div>
                    <p className="text-royalPurple-text2 font-medium">Average Grade</p>
                    <div className="w-full bg-royalPurple-muted/60 rounded-full h-3 mt-3">
                      <div
                        className="bg-royalPurple-success h-3 rounded-full"
                        style={{ width: `${dashboardStats.averagePerformance}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-center p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                    <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <UserCheck className="h-8 w-8 text-royalPurple-text1" />
                    </div>
                    <div className={`text-3xl font-bold mb-2 ${percentTextClass(92)}`}>92%</div>
                    <p className="text-royalPurple-text2 font-medium">Attendance Rate</p>
                    <div className="w-full bg-royalPurple-muted/60 rounded-full h-3 mt-3">
                      <div
                        className="bg-royalPurple-accent h-3 rounded-full"
                        style={{ width: '92%' }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-center p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                    <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <ClipboardList className="h-8 w-8 text-royalPurple-text1" />
                    </div>
                    <div className="text-3xl font-bold text-royalPurple-pillTx mb-2">
                      {dashboardStats.pendingAssessments}
                    </div>
                    <p className="text-royalPurple-text2 font-medium">Active Assessments</p>
                    <div className="w-full bg-royalPurple-muted/60 rounded-full h-3 mt-3">
                      <div
                        className="bg-royalPurple-pill h-3 rounded-full"
                        style={{ width: '75%' }}
                      ></div>
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
                <CardTitle className="text-royalPurple-text1 flex items-center">
                  <BarChart3 className="h-6 w-6 mr-3 text-royalPurple-pillTx" />
                  Department Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Performance by Subject */}
                    <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                      <h3 className="text-royalPurple-text1 font-bold text-lg mb-4 flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
                        Performance by Subject
                      </h3>
                      <div className="space-y-4">
                        {departmentSubjects.slice(0, 4).map((subject, index) => {
                          const performance = 0
                          return (
                            <div
                              key={index}
                              className="p-3 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-royalPurple-text1 font-semibold text-sm">
                                  {subject}
                                </span>
                                <span className={`font-bold ${percentTextClass(performance)}`}>
                                  {Number(performance) || 0}%
                                </span>
                              </div>
                              <div className="w-full bg-royalPurple-muted/60 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    performance >= 85
                                      ? 'bg-royalPurple-success'
                                      : performance >= 75
                                        ? 'bg-royalPurple-accent'
                                        : 'bg-warn/100'
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
                    <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                      <h3 className="text-royalPurple-text1 font-bold text-lg mb-4 flex items-center">
                        <Award className="h-5 w-5 mr-2 text-royalPurple-successTx" />
                        Grade Distribution
                      </h3>
                      <div className="space-y-3">
                        {[
                          { grade: 'Distinction', percentage: 25, color: 'bg-royalPurple-success' },
                          { grade: 'Merit', percentage: 30, color: 'bg-royalPurple-accent' },
                          { grade: 'Credit', percentage: 25, color: 'bg-accent/100' },
                          {
                            grade: 'Pass/Satisfactory',
                            percentage: 15,
                            color: 'bg-royalPurple-pill',
                          },
                          {
                            grade: 'Fail/Unsatisfactory',
                            percentage: 4,
                            color: 'bg-royalPurple-danger',
                          },
                          { grade: 'Absent', percentage: 1, color: 'bg-royalPurple-muted' },
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 rounded ${item.color}`}></div>
                              <span className="text-royalPurple-text1 text-sm">{item.grade}</span>
                            </div>
                            <span className="text-royalPurple-text2 font-semibold">
                              {item.percentage}%
                            </span>
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
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <Clock className="h-6 w-6 mr-3 text-warn" />
                Recent Department Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Recent Assessments */}
                  <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                    <h3 className="text-royalPurple-text1 font-bold text-lg mb-4 flex items-center">
                      <ClipboardList className="h-5 w-5 mr-2 text-accent/80" />
                      Recent Assessments
                    </h3>
                    <div className="space-y-3">
                      {departmentData.assessments.length > 0 ? (
                        departmentData.assessments.slice(0, 4).map((assessment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="backdrop-blur-md bg-accent/60 border border-accent/80/50 rounded-lg p-2">
                                <ClipboardList className="h-4 w-4 text-royalPurple-text1" />
                              </div>
                              <div>
                                <p className="text-royalPurple-text1 font-semibold text-sm">
                                  {assessment.title}
                                </p>
                                <p className="text-royalPurple-text2 text-xs">
                                  {assessment.subject} • {assessment.status}
                                </p>
                              </div>
                            </div>
                            <div
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                assessment.status === 'completed'
                                  ? 'bg-royalPurple-success/60 text-royalPurple-successTx border border-royalPurple-border/50'
                                  : 'bg-warn/60 text-warn/20 border border-warn/50'
                              }`}
                            >
                              {assessment.status}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-royalPurple-text2 text-center py-4">
                          No recent assessments
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Recent Results */}
                  <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                    <h3 className="text-royalPurple-text1 font-bold text-lg mb-4 flex items-center">
                      <Award className="h-5 w-5 mr-2 text-royalPurple-successTx" />
                      Recent Results
                    </h3>
                    <div className="space-y-3">
                      {departmentData.results.length > 0 ? (
                        departmentData.results.slice(0, 4).map((result, index) => {
                          const studentName =
                            result?.student?.name || result?.studentName || result?.student || 'N/A'
                          const subjectName =
                            result?.subject?.name || result?.subjectName || result?.subject || 'N/A'
                          const score =
                            typeof result?.score === 'number'
                              ? result.score
                              : typeof result?.marks === 'number'
                                ? result.marks
                                : null
                          const total =
                            typeof result?.totalMarks === 'number'
                              ? result.totalMarks
                              : score !== null
                                ? 100
                                : null
                          const percent =
                            score !== null && total
                              ? Math.round((Number(score) / Number(total)) * 100)
                              : null
                          const gradeLabel =
                            result?.grade || (percent !== null ? `${percent}%` : 'N/A')
                          const meta = [
                            result?.student?.class || result?.className || '',
                            result?.term ? String(result.term) : '',
                            result?.year ? String(result.year) : '',
                            result?.enteredByName
                              ? `Entered by ${String(result.enteredByName)}`
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' • ')

                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-kpi-pass/100 to-ink flex items-center justify-center text-royalPurple-text1 font-bold text-sm">
                                  {String(gradeLabel).slice(0, 2)}
                                </div>
                                <div>
                                  <p className="text-royalPurple-text1 font-semibold text-sm">
                                    {studentName}
                                  </p>
                                  <p className="text-royalPurple-text2 text-xs">
                                    {subjectName}
                                    {meta ? ` • ${meta}` : ''}
                                  </p>
                                  <p className="text-royalPurple-text3 text-xs">
                                    {score !== null && total !== null && percent !== null
                                      ? `${score}/${total} (${percent}%)`
                                      : ''}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-royalPurple-text2 text-center py-4">No recent results</p>
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
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <Rocket className="h-6 w-6 mr-3 text-royalPurple-pillTx" />
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
