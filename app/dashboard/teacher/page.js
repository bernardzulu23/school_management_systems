'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'
import ResponsiveDashboardLayout from '@/components/dashboard/ResponsiveDashboardLayout'
import AIFeaturesShowcase from '@/components/dashboard/AIFeaturesShowcase'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
// import TeacherAssignments from '@/components/dashboard/TeacherAssignments'
import { api } from '@/lib/api'
import { getGradeBadgeClasses } from '@/lib/gradingSystem'
import { inferClassGrade } from '@/lib/timetable/activeClasses'
import { TeacherTimetableView } from '@/components/timetable/TeacherTimetableView'
import { useSchoolTimeSlots } from '@/lib/timetable/useSchoolTimeSlots'
import { usePublishedTimetableView } from '@/lib/timetable/usePublishedTimetableView'
import { printTimetable } from '@/lib/timetable/printTimetable'
import {
  Users,
  BookOpen,
  ClipboardList,
  Calendar,
  Plus,
  TrendingUp,
  Target,
  Award,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  User,
  School,
  Flag,
  Edit,
  Delete,
  FileText,
  GraduationCap,
  Menu,
  Library,
  Zap,
  Map,
  Layers,
  UserCheck,
  MessageSquare,
  Clock,
  PenTool,
  Eye,
  Brain,
  Upload,
  Heart,
  Users as HandshakeIcon,
  Rocket,
  Globe,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { SCHOOL_SUBJECTS, getSubjectsByIds } from '@/data/subjects'
import AdvancedTeachingTools from '@/components/teaching/AdvancedTeachingTools'
import { DepartmentActivityReminders } from '@/components/dashboard/teacher/DepartmentActivityReminders'
import { isEnabled } from '@/lib/featureFlags'
import { useSchool } from '@/lib/context/SchoolContext'
import { percentTextClass } from '@/lib/utils/percentColor'
// Temporarily commented out to isolate error
// import {
//   renderCurriculumMapping,
//   renderDifferentiatedInstruction,
//   renderStudentPortfolios
// } from '@/components/dashboard/teacher/AdvancedTeacherFeatures'
// import {
//   renderLessonPlanning,
//   renderParentConferences
// } from '@/components/dashboard/teacher/AdvancedTeacherFeatures2'
// import CreativeTeachingHub from '@/components/creative-teaching/CreativeTeachingHub'

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

export default function TeacherDashboard() {
  const router = useRouter()
  // Get current user data from auth context
  const { user: currentUser, isAuthenticated, logout, syncSession } = useAuth()
  const { school } = useSchool()
  const { timeSlots: schoolTimeSlots } = useSchoolTimeSlots()
  const {
    assignments: publishedAssignments,
    timeSlots: publishedTimeSlots,
    term: publishedTerm,
    academicYear: publishedYear,
  } = usePublishedTimetableView({ enabled: Boolean(isAuthenticated && currentUser) })
  const timeSlots = publishedTimeSlots.length ? publishedTimeSlots : schoolTimeSlots
  const [timetableClasses, setTimetableClasses] = useState([])
  const [timetableClassrooms, setTimetableClassrooms] = useState([])
  const [timetableMobile, setTimetableMobile] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--rp-accent', 'var(--color-accent)')
    document.documentElement.style.setProperty('--rp-accentbg', 'var(--rp-accentbg)')
    document.documentElement.style.setProperty('--rp-accenttx', 'var(--color-white)')
    return () => {
      document.documentElement.style.removeProperty('--rp-accent')
      document.documentElement.style.removeProperty('--rp-accentbg')
      document.documentElement.style.removeProperty('--rp-accenttx')
    }
  }, [])

  const ACTION_THEMES = {
    'enter-results': { bg: 'bg-accent/10', text: 'text-accent' },
    'my-classes': { bg: 'bg-g-50', text: 'text-ink' },
    assessments: { bg: 'bg-kpi-pass/10', text: 'text-kpi-pass' },
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
  }, [isAuthenticated])

  useEffect(() => {
    syncSession?.({ force: true })
  }, [syncSession])

  useEffect(() => {
    const update = () => setTimetableMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/classes?limit=200', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        const list = Array.isArray(json?.data) ? json.data : []
        const mapped = list.map((c) => ({
          id: c.id,
          name: c.name || c.className || 'Class',
          grade: inferClassGrade(c.name || c.className || 'Class', c.yearGroup || c.year_group),
          students: Number(c.studentCount || 40),
          subjects: [],
        }))
        setTimetableClasses(mapped)
        setTimetableClassrooms(defaultClassrooms(mapped.length))
      } catch {
        setTimetableClasses([])
        setTimetableClassrooms(defaultClassrooms(12))
      }
    }
    load()
  }, [])

  // Enhanced state management
  const [teachingSubjects, setTeachingSubjects] = useState([])
  const [selectedTerm, setSelectedTerm] = useState('All Terms')
  const [results, setResults] = useState([])
  const [teacherClasses, setTeacherClasses] = useState([])
  const [teacherSubjects, setTeacherSubjects] = useState([])
  const [teacherGoals, setTeacherGoals] = useState([])
  const [teacherAssessments, setTeacherAssessments] = useState([])
  const [markingProgress, setMarkingProgress] = useState([])
  const [hasResults, setHasResults] = useState(false)

  // Advanced Teacher Dashboard Features State
  const [curriculumMaps, setCurriculumMaps] = useState([])
  const [differentiatedInstructions, setDifferentiatedInstructions] = useState([])
  const [studentPortfolios, setStudentPortfolios] = useState([])
  const [lessonPlans, setLessonPlans] = useState([])
  const [parentConferences, setParentConferences] = useState([])
  const [assessmentBuilder, setAssessmentBuilder] = useState([])
  const [learningObjectives, setLearningObjectives] = useState([])
  const [behaviorManagement, setBehaviorManagement] = useState([])
  const [professionalCommunity, setProfessionalCommunity] = useState([])
  const [mentorshipPrograms, setMentorshipPrograms] = useState([])

  // Enhanced dashboard statistics
  const [dashboardStats, setDashboardStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalSubjects: 0,
    totalAssessments: 0,
    totalResults: 0,
    totalGoals: 0,
    completedGoals: 0,
    overallProgress: 0,
    averagePerformance: 0,
    attendanceRate: 0,
  })

  // Performance data for charts - will be populated from API
  const [termPerformanceData, setTermPerformanceData] = useState({
    labels: [],
    datasets: [],
  })

  const [subjectPerformanceData, setSubjectPerformanceData] = useState({
    labels: ['Mathematics', 'Physics', 'Computer Science'],
    datasets: [
      {
        label: 'Average Score',
        data: [82, 76, 88],
        backgroundColor: ['var(--color-accent)', 'var(--color-kpi-pass)', 'var(--color-ink)'],
        borderWidth: 1,
      },
    ],
  })

  // Data initialization from API
  useEffect(() => {
    // Initialize teaching subjects from user data
    if (currentUser && currentUser.assigned_subjects) {
      // Get subject names from IDs
      const subjectObjects = getSubjectsByIds(currentUser.assigned_subjects)
      setTeachingSubjects(subjectObjects.map((subject) => subject.name))
    } else {
      setTeachingSubjects([])
    }

    // Initialize with empty arrays - data will come from API
    setResults([])
    setHasResults(false)
    setTeacherGoals([])
  }, [currentUser])

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isError: dashboardError,
  } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => api.getTeacherDashboard().then((res) => res.data),
  })

  const {
    data: departmentAnalysisResponse,
    isLoading: departmentAnalysisLoading,
    isError: departmentAnalysisError,
  } = useQuery({
    queryKey: ['teacher-department-analysis'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/teacher/department-analysis', {
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(json?.message || json?.error || 'Failed to load department analysis')
      return json
    },
    enabled: Boolean(isAuthenticated),
    staleTime: 5 * 60 * 1000,
  })

  const departmentAnalysis = departmentAnalysisResponse?.data || null

  useEffect(() => {
    if (!dashboardData) return

    if (dashboardData.stats) {
      setDashboardStats((prev) => ({
        ...prev,
        totalClasses: dashboardData.stats.totalClasses || 0,
        totalStudents: dashboardData.stats.totalStudents || 0,
        totalSubjects: dashboardData.stats.totalSubjects || 0,
        totalAssessments: dashboardData.stats.totalAssessments || 0,
        totalResults: dashboardData.stats.totalResults || 0,
        totalGoals: dashboardData.stats.totalGoals || 0,
        completedGoals: dashboardData.stats.completedGoals || 0,
        overallProgress: dashboardData.stats.overallProgress || 0,
        averagePerformance: dashboardData.stats.averagePerformance || 0,
        attendanceRate: dashboardData.stats.attendanceRate || 0,
      }))
    }

    if (Array.isArray(dashboardData.teaching_goals)) {
      setTeacherGoals(dashboardData.teaching_goals)
    }

    if (Array.isArray(dashboardData.my_subjects)) {
      setTeachingSubjects(dashboardData.my_subjects.map((s) => s.name))
    }

    if (Array.isArray(dashboardData.my_classes)) {
      setTeacherClasses(
        dashboardData.my_classes.map((c) => ({
          id: c.id,
          name: c.name,
          students: c.student_count || 0,
          subject: 'Multiple subjects',
          attendance: 0,
        }))
      )
    }
  }, [dashboardData])

  if (dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-royalPurple-page">
        <div className="text-center">
          <LoadingSpinner className="h-12 w-12 text-royalPurple-accentTx mb-4" />
          <p className="text-royalPurple-text2">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (dashboardError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-royalPurple-page">
        <Card className="p-8 text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-royalPurple-dangerTx mx-auto mb-4" />
          <h2 className="text-xl font-bold text-royalPurple-text1 mb-2">
            Failed to load dashboard
          </h2>
          <p className="text-royalPurple-text2 mb-6">
            There was an error fetching your dashboard data. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </Card>
      </div>
    )
  }

  // Helper function to calculate grade color
  const getGradeColor = (grade) => getGradeBadgeClasses(grade)

  const teacherTitle = String(currentUser?.gender || '')
    .trim()
    .toLowerCase()
    .startsWith('f')
    ? 'Mrs'
    : String(currentUser?.gender || '')
          .trim()
          .toLowerCase()
          .startsWith('m')
      ? 'Mr'
      : ''

  // Show loading if not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ink via-g-800 to-g-700">
        <div className="text-center space-y-4">
          <LoadingSpinner size="xl" color="white" label="Loading dashboard" />
        </div>
      </div>
    )
  }

  return (
    <ResponsiveDashboardLayout>
      <div className="space-y-8">
        <div className="space-y-8">
          <section className="max-w-none">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-royalPurple-text1">My Teaching Schedule</h2>
              <div className="flex items-center gap-2 print:hidden">
                <Link
                  href="/dashboard/timetable/teacher"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-royalPurple-card/70 border border-royalPurple-border text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1 transition-colors font-semibold"
                >
                  <Calendar className="h-4 w-4" />
                  Open Timetable
                </Link>
                <Button
                  variant="outline"
                  onClick={() => printTimetable()}
                  className="zsms-hover-raise"
                >
                  Print
                </Button>
              </div>
            </div>
            <div className="mt-4 max-w-none max-h-[40vh] overflow-auto">
              <TeacherTimetableView
                assignments={publishedAssignments}
                timeSlots={timeSlots}
                teacherId={String(currentUser?.id || '') || undefined}
                classes={timetableClasses}
                classrooms={timetableClassrooms}
                mobile={timetableMobile}
                term={publishedTerm}
                academicYear={publishedYear}
              />
            </div>
          </section>

          <DepartmentActivityReminders />

          <div className="backdrop-blur-lg bg-royalPurple-card/60 dark:bg-royalPurple-card/60 rounded-3xl p-8 shadow-2xl transition-colors duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-royalPurple-text1 mb-4">
                  Teacher Dashboard
                </h1>
                <p className="text-royalPurple-text2 dark:text-royalPurple-text2 text-lg">
                  Manage your classes and track student progress
                </p>
                <p className="text-royalPurple-text2 dark:text-royalPurple-text3 text-sm mt-2">
                  Welcome back, {teacherTitle ? `${teacherTitle} ` : ''}
                  {currentUser?.name || 'Teacher'}!
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {currentUser?.hodProfile && (
                  <Link
                    href="/dashboard/hod"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-royalPurple-card/70 dark:bg-royalPurple-muted/70 border border-royalPurple-border dark:border-royalPurple-border/40 text-royalPurple-text2 hover:text-royalPurple-text1 hover:bg-royalPurple-card2 transition-colors"
                  >
                    HOD Dashboard
                  </Link>
                )}
                <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-royalPurple-text1">
                    {new Date().getDate()}
                  </div>
                  <div className="text-sm text-royalPurple-pillTx">
                    {new Date().toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-accent to-ink flex items-center justify-center text-royalPurple-text1 font-bold text-xl">
                  {currentUser?.name?.charAt(0) || 'T'}
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Information Card */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <User className="h-6 w-6 mr-3 text-royalPurple-pillTx dark:text-royalPurple-pillTx" />
                Teacher Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 dark:bg-royalPurple-card/60 border border-royalPurple-border dark:border-royalPurple-border/40 rounded-2xl p-6 transition-colors duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-4 bg-royalPurple-page/60 dark:bg-royalPurple-muted/60 border border-royalPurple-border dark:border-royalPurple-border/40 rounded-xl transition-colors duration-300">
                    <div className="flex items-center mb-2">
                      <User className="h-4 w-4 text-royalPurple-pillTx dark:text-royalPurple-pillTx mr-2" />
                      <span className="text-royalPurple-text2 dark:text-royalPurple-text2 text-sm font-medium">
                        Full Name
                      </span>
                    </div>
                    <p className="text-royalPurple-text1 dark:text-royalPurple-text1 font-semibold">
                      {teacherTitle ? `${teacherTitle} ` : ''}
                      {currentUser?.name}
                    </p>
                  </div>
                  <div className="p-4 bg-royalPurple-page/60 dark:bg-royalPurple-muted/60 border border-royalPurple-border dark:border-royalPurple-border/40 rounded-xl transition-colors duration-300">
                    <div className="flex items-center mb-2">
                      <BookOpen className="h-4 w-4 text-royalPurple-accentTx dark:text-royalPurple-accentTx mr-2" />
                      <span className="text-royalPurple-text2 dark:text-royalPurple-text2 text-sm font-medium">
                        Teaching Subjects
                      </span>
                    </div>
                    <p className="text-royalPurple-text1 dark:text-royalPurple-text1 font-semibold">
                      {dashboardStats.totalSubjects || 0} Subjects
                    </p>
                  </div>
                  <div className="p-4 bg-royalPurple-page/60 dark:bg-royalPurple-muted/60 border border-royalPurple-border dark:border-royalPurple-border/40 rounded-xl transition-colors duration-300">
                    <div className="flex items-center mb-2">
                      <Users className="h-4 w-4 text-royalPurple-successTx dark:text-royalPurple-successTx mr-2" />
                      <span className="text-royalPurple-text2 dark:text-royalPurple-text2 text-sm font-medium">
                        Assigned Classes
                      </span>
                    </div>
                    <p className="text-royalPurple-text1 dark:text-royalPurple-text1 font-semibold">
                      {dashboardStats.totalClasses} Classes
                    </p>
                  </div>
                  <div className="p-4 bg-royalPurple-page/60 dark:bg-royalPurple-muted/60 border border-royalPurple-border dark:border-royalPurple-border/40 rounded-xl transition-colors duration-300">
                    <div className="flex items-center mb-2">
                      <School className="h-4 w-4 text-accent dark:text-accent/80 mr-2" />
                      <span className="text-royalPurple-text2 dark:text-royalPurple-text2 text-sm font-medium">
                        Total Students
                      </span>
                    </div>
                    <p className="text-royalPurple-text1 dark:text-royalPurple-text1 font-semibold">
                      {dashboardStats.totalStudents} Students
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <Zap className="h-6 w-6 mr-3 text-royalPurple-pillTx dark:text-royalPurple-pillTx" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {isEnabled('MOBILE_APP_DOWNLOAD') ? (
                  <div className="p-6 bg-royalPurple-accent/10 border border-royalPurple-border rounded-2xl h-full">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl mb-4 bg-royalPurple-accent/20">
                      <Rocket className="h-6 w-6 text-royalPurple-accentTx" />
                    </div>
                    <h3 className="text-xl font-bold text-royalPurple-text1 mb-2">
                      Take attendance on the go
                    </h3>
                    <p className="text-royalPurple-text3 text-sm mb-4">
                      Download the ZSMS Teacher App for fast mobile attendance marking.
                    </p>
                    <p className="text-xs text-royalPurple-text3">
                      App Store / Play Store links coming when published.
                      {school?.subdomain
                        ? ` Portal: ${school.subdomain}.bluepeacktechnologies.com`
                        : ''}
                    </p>
                  </div>
                ) : null}
                <Link href="/dashboard/teacher/results" className="block">
                  <div className="p-6 bg-royalPurple-card/60 dark:bg-royalPurple-card/60 border border-royalPurple-border2 dark:border-royalPurple-border2/40 hover:border-royalPurple-border2 hover:bg-royalPurple-page dark:hover:bg-royalPurple-muted/80 rounded-2xl transition-all duration-300 group cursor-pointer h-full shadow-sm hover:shadow-md">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 group-hover:scale-110 transition-transform ${ACTION_THEMES['enter-results'].bg}`}
                    >
                      <Edit className={`h-6 w-6 ${ACTION_THEMES['enter-results'].text}`} />
                    </div>
                    <h3 className="text-xl font-bold text-royalPurple-text1 dark:text-royalPurple-text1 mb-2">
                      Enter Results
                    </h3>
                    <p className="text-royalPurple-text3 dark:text-royalPurple-text3 text-sm">
                      Input student grades for subjects and assessments.
                    </p>
                  </div>
                </Link>

                <Link href="/dashboard/teacher/classes" className="block">
                  <div className="p-6 bg-royalPurple-card/60 dark:bg-royalPurple-card/60 border border-royalPurple-border2 dark:border-royalPurple-border2/40 hover:border-royalPurple-border2 hover:bg-royalPurple-page dark:hover:bg-royalPurple-muted/80 rounded-2xl transition-all duration-300 group cursor-pointer h-full shadow-sm hover:shadow-md">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 group-hover:scale-110 transition-transform ${ACTION_THEMES['my-classes'].bg}`}
                    >
                      <Users className={`h-6 w-6 ${ACTION_THEMES['my-classes'].text}`} />
                    </div>
                    <h3 className="text-xl font-bold text-royalPurple-text1 dark:text-royalPurple-text1 mb-2">
                      My Classes
                    </h3>
                    <p className="text-royalPurple-text3 dark:text-royalPurple-text3 text-sm">
                      View student lists and class performance.
                    </p>
                  </div>
                </Link>

                <Link href="/dashboard/teacher/assessments" className="block">
                  <div className="p-6 bg-royalPurple-card/60 dark:bg-royalPurple-card/60 border border-royalPurple-border dark:border-royalPurple-border/40 hover:border-royalPurple-border hover:bg-royalPurple-page dark:hover:bg-royalPurple-muted/80 rounded-2xl transition-all duration-300 group cursor-pointer h-full shadow-sm hover:shadow-md">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 group-hover:scale-110 transition-transform ${ACTION_THEMES.assessments.bg}`}
                    >
                      <ClipboardList className={`h-6 w-6 ${ACTION_THEMES.assessments.text}`} />
                    </div>
                    <h3 className="text-xl font-bold text-royalPurple-text1 dark:text-royalPurple-text1 mb-2">
                      Assessments
                    </h3>
                    <p className="text-royalPurple-text3 dark:text-royalPurple-text3 text-sm">
                      Create and manage tests and assignments.
                    </p>
                  </div>
                </Link>

                <Link href="/dashboard/teacher/ai-materials" className="block">
                  <div className="p-6 bg-royalPurple-card/60 dark:bg-royalPurple-card/60 border border-indigo-500/30 hover:border-indigo-400 hover:bg-royalPurple-page dark:hover:bg-royalPurple-muted/80 rounded-2xl transition-all duration-300 group cursor-pointer h-full shadow-sm hover:shadow-md">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl mb-4 group-hover:scale-110 transition-transform bg-indigo-500/10">
                      <Upload className="h-6 w-6 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold text-royalPurple-text1 dark:text-royalPurple-text1 mb-2">
                      AI Reference Materials
                    </h3>
                    <p className="text-royalPurple-text3 dark:text-royalPurple-text3 text-sm">
                      Upload PDFs and notes for RAG — powers lesson plans, quizzes, and the study
                      assistant.
                    </p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          <AIFeaturesShowcase />

          {/* Enhanced Stats Cards */}
          <section className="w-full py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-6">
              <StatsCard
                title="My Classes"
                value={dashboardStats.totalClasses}
                icon={Users}
                color="blue"
                description="Classes assigned to you"
                variant="flat"
              />
              <StatsCard
                title="Total Students"
                value={dashboardStats.totalStudents}
                icon={School}
                color="green"
                description="Students under your guidance"
                variant="flat"
              />
              <StatsCard
                title="My Assessments"
                value={dashboardStats.totalAssessments}
                icon={ClipboardList}
                color="yellow"
                description="Assessments created"
                variant="flat"
              />
              <StatsCard
                title="Average Performance"
                value={`${dashboardStats.averagePerformance}%`}
                icon={TrendingUp}
                color="purple"
                description="Class average score"
                variant="flat"
              />
            </div>
          </section>

          {/* Performance Overview */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <TrendingUp className="h-6 w-6 mr-3 text-royalPurple-successTx" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <Award className="h-10 w-10 text-royalPurple-text1" />
                    </div>
                    <h3 className="font-bold text-royalPurple-text1 text-lg">Class Average</h3>
                    <p
                      className={`text-3xl font-bold mt-2 ${percentTextClass(dashboardStats.averagePerformance)}`}
                    >
                      {Number(dashboardStats.averagePerformance) || 0}%
                    </p>
                    <p className="text-royalPurple-text2 text-sm mt-1">Above school average</p>
                  </div>
                  <div className="text-center">
                    <div className="backdrop-blur-md bg-royalPurple-success/60 border border-royalPurple-border/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-10 w-10 text-royalPurple-text1" />
                    </div>
                    <h3 className="font-bold text-royalPurple-text1 text-lg">Attendance Rate</h3>
                    <p
                      className={`text-3xl font-bold mt-2 ${percentTextClass(dashboardStats.attendanceRate)}`}
                    >
                      {Number(dashboardStats.attendanceRate) || 0}%
                    </p>
                    <p className="text-royalPurple-text2 text-sm mt-1">Excellent attendance</p>
                  </div>
                  <div className="text-center">
                    <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <Target className="h-10 w-10 text-royalPurple-text1" />
                    </div>
                    <h3 className="font-bold text-royalPurple-text1 text-lg">Goals Progress</h3>
                    <p className="text-3xl font-bold text-royalPurple-pillTx mt-2">
                      {dashboardStats.completedGoals}/{dashboardStats.totalGoals}
                    </p>
                    <p className="text-royalPurple-text2 text-sm mt-1">Goals completed</p>
                  </div>
                  <div className="text-center">
                    <div className="backdrop-blur-md bg-accent/60 border border-accent/80/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-10 w-10 text-royalPurple-text1" />
                    </div>
                    <h3 className="font-bold text-royalPurple-text1 text-lg">Total Results</h3>
                    <p className="text-3xl font-bold text-accent/80 mt-2">
                      {dashboardStats.totalResults}
                    </p>
                    <p className="text-royalPurple-text2 text-sm mt-1">Results recorded</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <Layers className="h-6 w-6 mr-3 text-royalPurple-pillTx" />
                Department Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                {departmentAnalysisLoading ? (
                  <div className="flex items-center gap-2 text-royalPurple-text2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading department performance...
                  </div>
                ) : departmentAnalysisError ? (
                  <div className="text-royalPurple-dangerTx">
                    Failed to load department performance
                  </div>
                ) : !departmentAnalysis ? (
                  <div className="text-royalPurple-text2">No department data available</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                      <div className="text-royalPurple-text2 text-sm">Department</div>
                      <div className="text-royalPurple-text1 font-bold text-lg mt-1">
                        {departmentAnalysis.department || 'Not set'}
                      </div>
                    </div>
                    <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                      <div className="text-royalPurple-text2 text-sm">Your Average / Pass Rate</div>
                      <div className="text-royalPurple-text1 font-bold text-lg mt-1">
                        {departmentAnalysis.teacher?.averageScore || 0}% /{' '}
                        {departmentAnalysis.teacher?.passRate || 0}%
                      </div>
                      <div className="text-royalPurple-text3 text-xs mt-1">
                        Based on results in your teaching assignments
                      </div>
                    </div>
                    <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                      <div className="text-royalPurple-text2 text-sm">
                        Department Average / Pass Rate
                      </div>
                      <div className="text-royalPurple-text1 font-bold text-lg mt-1">
                        {departmentAnalysis.departmentStats?.averageScore || 0}% /{' '}
                        {departmentAnalysis.departmentStats?.passRate || 0}%
                      </div>
                      <div className="text-royalPurple-text3 text-xs mt-1">
                        Across teachers in your department
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Teaching Subjects */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <BookOpen className="h-6 w-6 mr-3 text-royalPurple-accentTx" />
                My Teaching Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                {(Array.isArray(dashboardData?.my_subjects) ? dashboardData.my_subjects : [])
                  .length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(dashboardData?.my_subjects || []).map((subject) => {
                      return (
                        <div
                          key={subject.id}
                          className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-3">
                              <BookOpen className="h-8 w-8 text-royalPurple-text1" />
                            </div>
                            <div
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                (subject.student_count || 0) > 0
                                  ? 'bg-royalPurple-accent/60 text-royalPurple-accentTx border border-royalPurple-border2/50'
                                  : 'bg-warn/60 text-warn/20 border border-warn/50'
                              }`}
                            >
                              {subject.class_count || 0} Classes
                            </div>
                          </div>
                          <h3 className="text-royalPurple-text1 font-bold text-lg mb-2">
                            {subject.name}
                          </h3>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-royalPurple-text2 text-sm">Students</span>
                              <span className="text-royalPurple-text1 font-semibold">
                                {subject.student_count || 0}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-royalPurple-text2 text-sm">Classes</span>
                              <span className="text-royalPurple-text1 font-semibold">
                                {subject.class_count || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-6">
                      <BookOpen className="h-10 w-10 text-royalPurple-text1" />
                    </div>
                    <h3 className="text-royalPurple-text1 font-bold text-xl mb-2">
                      No Subjects Assigned
                    </h3>
                    <p className="text-royalPurple-text2 mb-4">
                      Contact administrator to get teaching assignments
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* My Classes */}
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-royalPurple-text1 flex items-center">
                  <Users className="h-6 w-6 mr-3 text-royalPurple-accentTx" />
                  My Classes
                </CardTitle>
                <Link href="/dashboard/teacher/classes">
                  <Button className="bg-gradient-to-r from-ink to-kpi-pass hover:from-g-800 hover:to-g-700 text-royalPurple-text1">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {teacherClasses.map((classItem) => (
                      <div
                        key={classItem.id}
                        className="flex items-center justify-between p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-xl p-3">
                            <Users className="h-6 w-6 text-royalPurple-text1" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-royalPurple-text1">
                              {classItem.name}
                            </h4>
                            <p className="text-royalPurple-text2 text-sm">
                              {classItem.students} students • {classItem.subject}
                            </p>
                            <p className="text-royalPurple-text3 text-xs">
                              Attendance: {classItem.attendance}%
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
                              style={{ width: `${classItem.attendance}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {teacherClasses.length === 0 && (
                      <div className="text-center py-8">
                        <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-royalPurple-text1" />
                        </div>
                        <p className="text-royalPurple-text2">No classes assigned yet</p>
                        <p className="text-royalPurple-text3 text-sm mt-2">
                          Contact administrator for class assignments
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-royalPurple-text1 flex items-center">
                  <BarChart3 className="h-6 w-6 mr-3 text-royalPurple-successTx" />
                  Recent Results
                </CardTitle>
                <Link href="/dashboard/teacher/results">
                  <Button className="bg-gradient-to-r from-kpi-pass to-ink hover:from-g-700 hover:to-g-800 text-royalPurple-text1">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {(Array.isArray(dashboardData?.recent_results)
                      ? dashboardData.recent_results
                      : []
                    ).map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="backdrop-blur-md bg-royalPurple-success/60 border border-royalPurple-border/50 rounded-xl p-3">
                            <BarChart3 className="h-6 w-6 text-royalPurple-text1" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-royalPurple-text1">
                              {result.studentName || 'Student'}
                            </h4>
                            <p className="text-royalPurple-text2 text-sm">
                              {result.subjectName || 'Subject'}
                              {result.class ? ` • ${result.class}` : ''} • {result.term}{' '}
                              {result.year}
                              {result.result_type_label ? ` • ${result.result_type_label}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-royalPurple-text1">
                            {result.score}
                          </div>
                          <div
                            className={`text-xs px-3 py-1 rounded-full font-medium ${getGradeColor(result.grade)}`}
                          >
                            Grade {result.grade}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!Array.isArray(dashboardData?.recent_results) ||
                      dashboardData.recent_results.length === 0) && (
                      <div className="text-center py-8">
                        <div className="backdrop-blur-md bg-royalPurple-success/60 border border-royalPurple-border/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <BarChart3 className="h-8 w-8 text-royalPurple-text1" />
                        </div>
                        <p className="text-royalPurple-text2">No recent results</p>
                        <p className="text-royalPurple-text3 text-sm mt-2">
                          Results will appear here after grading
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals Progress Section */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center justify-between gap-3">
                <span className="flex items-center">
                  <Target className="h-6 w-6 mr-3 text-warn" />
                  Teaching Goals Progress
                </span>
                <Link
                  href="/dashboard/teacher/teaching-studio"
                  className="text-sm font-medium text-royalPurple-accentTx hover:underline"
                >
                  Open Teaching Studio
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Goals List */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-royalPurple-text1 mb-4">Current Goals</h3>
                    {teacherGoals.length === 0 ? (
                      <div className="p-4 rounded-xl border border-royalPurple-border/40 bg-royalPurple-muted/40">
                        <p className="text-sm text-royalPurple-text2">
                          No schemes of work yet. Generate a scheme in Teaching Studio to track week
                          coverage goals.
                        </p>
                        <Link
                          href="/dashboard/teacher/teaching-studio?tab=scheme"
                          className="inline-block mt-3 text-sm font-semibold text-royalPurple-accentTx hover:underline"
                        >
                          Create scheme of work →
                        </Link>
                      </div>
                    ) : (
                      teacherGoals.map((goal) => (
                        <Link
                          key={goal.id}
                          href={
                            goal.href ||
                            `/dashboard/teacher/teaching-studio?tab=progress&schemeId=${goal.id}`
                          }
                          className="block p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-royalPurple-text1 text-sm">
                              {goal.title}
                            </h4>
                            {goal.status === 'completed' && (
                              <CheckCircle className="h-5 w-5 text-royalPurple-successTx" />
                            )}
                          </div>
                          <div className="w-full bg-royalPurple-muted/60 rounded-full h-2 mb-2">
                            <div
                              className={`h-2 rounded-full ${
                                goal.progress === 100
                                  ? 'bg-royalPurple-success'
                                  : goal.progress >= 75
                                    ? 'bg-warn/100'
                                    : 'bg-royalPurple-accent'
                              }`}
                              style={{ width: `${Math.min(100, Number(goal.progress) || 0)}%` }}
                            ></div>
                          </div>
                          <p className="text-royalPurple-text2 text-xs">
                            {goal.progress}% Complete
                            {goal.totalWeeks != null
                              ? ` · ${goal.completedWeeks || 0}/${goal.totalWeeks} teaching weeks`
                              : ''}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>

                  {/* Goals Stats */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-royalPurple-text1 mb-4">
                      Progress Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Link
                        href="/dashboard/teacher/teaching-studio?tab=progress&filter=completed"
                        className="p-4 bg-gradient-to-r from-kpi-pass/20 to-ink/20 border border-royalPurple-border/30 rounded-xl text-center hover:scale-[1.02] transition-transform"
                      >
                        <div className="text-2xl font-bold text-royalPurple-successTx">
                          {dashboardStats.completedGoals}
                        </div>
                        <div className="text-royalPurple-text2 text-sm underline-offset-2 hover:underline">
                          Completed
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/teacher/teaching-studio?tab=progress&filter=in-progress"
                        className="p-4 bg-gradient-to-r from-warn/20 to-accent/20 border border-warn/30 rounded-xl text-center hover:scale-[1.02] transition-transform"
                      >
                        <div className="text-2xl font-bold text-warn">
                          {Math.max(0, dashboardStats.totalGoals - dashboardStats.completedGoals)}
                        </div>
                        <div className="text-royalPurple-text2 text-sm underline-offset-2 hover:underline">
                          In Progress
                        </div>
                      </Link>
                    </div>
                    <Link
                      href="/dashboard/teacher/teaching-studio?tab=analytics"
                      className="block p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl text-center hover:scale-[1.01] transition-transform"
                    >
                      <div className="text-3xl font-bold text-royalPurple-text1 mb-2">
                        {Number.isFinite(Number(dashboardStats.overallProgress))
                          ? Math.round(Number(dashboardStats.overallProgress))
                          : dashboardStats.totalGoals > 0
                            ? Math.round(
                                (dashboardStats.completedGoals / dashboardStats.totalGoals) * 100
                              )
                            : 0}
                        %
                      </div>
                      <div className="text-royalPurple-text2 underline-offset-2 hover:underline">
                        Overall Progress
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <Plus className="h-6 w-6 mr-3 text-royalPurple-pillTx" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <Link href="/dashboard/teacher/assessments?create=1">
                    <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Plus className="h-8 w-8 text-royalPurple-text1" />
                      </div>
                      <h3 className="text-royalPurple-text1 font-semibold text-center">
                        Create Assessments
                      </h3>
                      <p className="text-royalPurple-text2 text-sm text-center mt-2">
                        From syllabus, schemes &amp; ECZ modules
                      </p>
                    </div>
                  </Link>
                  <Link href="/dashboard/attendance">
                    <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-warn/60 border border-warn/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle className="h-8 w-8 text-royalPurple-text1" />
                      </div>
                      <h3 className="text-royalPurple-text1 font-semibold text-center">
                        Grade Attendance
                      </h3>
                      <p className="text-royalPurple-text2 text-sm text-center mt-2">
                        Mark student presence
                      </p>
                    </div>
                  </Link>
                  <Link href="/dashboard/teacher/reports">
                    <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <FileText className="h-8 w-8 text-royalPurple-text1" />
                      </div>
                      <h3 className="text-royalPurple-text1 font-semibold text-center">
                        View Reports
                      </h3>
                      <p className="text-royalPurple-text2 text-sm text-center mt-2">
                        Performance analytics
                      </p>
                    </div>
                  </Link>
                  <Link href="/dashboard/sdg">
                    <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-gradient-to-r from-ink/60 to-kpi-pass/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Globe className="h-8 w-8 text-royalPurple-text1" />
                      </div>
                      <h3 className="text-royalPurple-text1 font-semibold text-center">UN SDGs</h3>
                      <p className="text-royalPurple-text2 text-sm text-center mt-2">
                        Global Impact
                      </p>
                    </div>
                  </Link>
                  <Link href="/dashboard/teacher/ai-materials">
                    <div className="group p-6 bg-royalPurple-muted/60 border border-indigo-500/30 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-indigo-500/20 border border-indigo-400/40 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Upload className="h-8 w-8 text-indigo-300" />
                      </div>
                      <h3 className="text-royalPurple-text1 font-semibold text-center">
                        Upload for AI (RAG)
                      </h3>
                      <p className="text-royalPurple-text2 text-sm text-center mt-2">
                        Index syllabi &amp; notes for AI tools
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Assessments */}
          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <ClipboardList className="h-6 w-6 mr-3 text-royalPurple-accentTx" />
                Recent Assessments
              </CardTitle>
              <Link href="/dashboard/teacher/assessments?create=1">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-ink to-g-700 hover:from-g-800 hover:to-g-900 text-royalPurple-text1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assessment
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-royalPurple-border/40">
                        <th className="text-left py-2 text-royalPurple-text2">Title</th>
                        <th className="text-left py-2 text-royalPurple-text2">Type</th>
                        <th className="text-left py-2 text-royalPurple-text2">Subject</th>
                        <th className="text-left py-2 text-royalPurple-text2">Class</th>
                        <th className="text-left py-2 text-royalPurple-text2">Status</th>
                        <th className="text-left py-2 text-royalPurple-text2">Start Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData?.recent_assessments?.map((assessment) => (
                        <tr
                          key={assessment.id}
                          className="border-b border-royalPurple-border/40 hover:bg-royalPurple-muted/40 transition-colors"
                        >
                          <td className="py-2 font-medium text-royalPurple-text1">
                            {assessment.title}
                          </td>
                          <td className="py-2">
                            <span className="px-2 py-1 text-xs rounded-full bg-royalPurple-accent/20 text-royalPurple-accentTx capitalize border border-royalPurple-border2/30">
                              {assessment.type}
                            </span>
                          </td>
                          <td className="py-2 text-royalPurple-text2">{assessment.subject}</td>
                          <td className="py-2 text-royalPurple-text2">{assessment.class}</td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-1 text-xs rounded-full capitalize border ${
                                assessment.status === 'published'
                                  ? 'bg-royalPurple-success/20 text-royalPurple-successTx border-royalPurple-border/30'
                                  : assessment.status === 'draft'
                                    ? 'bg-warn/100/20 text-warn/40 border-warn/30'
                                    : 'bg-royalPurple-muted/20 text-royalPurple-text2 border-royalPurple-border/30'
                              }`}
                            >
                              {assessment.status}
                            </span>
                          </td>
                          <td className="py-2 text-sm text-royalPurple-text3">
                            {new Date(assessment.start_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!dashboardData?.recent_assessments ||
                    dashboardData.recent_assessments.length === 0) && (
                    <div className="text-center py-8">
                      <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="h-8 w-8 text-royalPurple-text1" />
                      </div>
                      <p className="text-royalPurple-text2">No Assessments Created</p>
                      <p className="text-royalPurple-text3 text-sm mt-2">
                        You haven&apos;t created any assessments yet. Start by creating your first
                        assessment.
                      </p>
                      <Link href="/dashboard/teacher/assessments?create=1">
                        <Button className="mt-4 bg-royalPurple-accent hover:bg-royalPurple-accent text-royalPurple-text1">
                          Create Your First Assessment
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Teacher Information */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <User className="h-6 w-6 mr-3 text-royalPurple-accentTx" />
                Teacher Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <User className="h-4 w-4 text-royalPurple-accentTx mr-2" />
                      <span className="text-royalPurple-text2 text-sm font-medium">Name</span>
                    </div>
                    <p className="text-royalPurple-text1 font-semibold">{currentUser?.name}</p>
                  </div>
                  <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <School className="h-4 w-4 text-royalPurple-successTx mr-2" />
                      <span className="text-royalPurple-text2 text-sm font-medium">Department</span>
                    </div>
                    <p className="text-royalPurple-text1 font-semibold">
                      {dashboardData?.teacher?.department || 'Not assigned'}
                    </p>
                  </div>
                  <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Flag className="h-4 w-4 text-royalPurple-pillTx mr-2" />
                      <span className="text-royalPurple-text2 text-sm font-medium">TS Number</span>
                    </div>
                    <p className="text-royalPurple-text1 font-semibold">
                      {dashboardData?.teacher?.ts_number || 'Not assigned'}
                    </p>
                  </div>
                  <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <User className="h-4 w-4 text-accent/80 mr-2" />
                      <span className="text-royalPurple-text2 text-sm font-medium">Contact</span>
                    </div>
                    <p className="text-royalPurple-text1 font-semibold">
                      {dashboardData?.teacher?.contact_number ||
                        currentUser?.contact_number ||
                        currentUser?.contactNumber ||
                        'Not provided'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Teacher Dashboard Features */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <Brain className="h-6 w-6 mr-3 text-royalPurple-pillTx" />
                Advanced Teaching Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                <AdvancedTeachingTools />
              </div>
            </CardContent>
          </Card>

          {/* Teaching Management Overview */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <Users className="h-6 w-6 mr-3 text-royalPurple-successTx" />
                My Teaching Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* My Classes Management */}
                  <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-royalPurple-text1 font-bold text-lg flex items-center">
                        <Users className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
                        My Classes
                      </h3>
                      <span className="text-royalPurple-text2 text-sm">
                        {teacherClasses.length} classes
                      </span>
                    </div>
                    <div className="space-y-3">
                      {teacherClasses.slice(0, 3).map((cls, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-lg p-2">
                              <Users className="h-4 w-4 text-royalPurple-text1" />
                            </div>
                            <div>
                              <p className="text-royalPurple-text1 font-semibold text-sm">
                                {cls.name}
                              </p>
                              <p className="text-royalPurple-text2 text-xs">
                                {cls.students} students
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-royalPurple-successTx text-sm font-semibold">
                              {cls.attendance}%
                            </p>
                            <p className="text-royalPurple-text3 text-xs">attendance</p>
                          </div>
                        </div>
                      ))}
                      {teacherClasses.length > 3 && (
                        <p className="text-royalPurple-text2 text-sm text-center">
                          +{teacherClasses.length - 3} more classes
                        </p>
                      )}
                    </div>
                    <Button className="w-full mt-4 bg-royalPurple-accent/60 hover:bg-royalPurple-accent/80 text-royalPurple-text1 border border-royalPurple-border2/50">
                      View All Classes
                    </Button>
                  </div>

                  {/* Subject Management */}
                  <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-royalPurple-text1 font-bold text-lg flex items-center">
                        <BookOpen className="h-5 w-5 mr-2 text-royalPurple-successTx" />
                        Subject Management
                      </h3>
                      <span className="text-royalPurple-text2 text-sm">
                        {
                          (Array.isArray(dashboardData?.my_subjects)
                            ? dashboardData.my_subjects
                            : []
                          ).length
                        }{' '}
                        subjects
                      </span>
                    </div>
                    <div className="space-y-3">
                      {(Array.isArray(dashboardData?.my_subjects) ? dashboardData.my_subjects : [])
                        .slice(0, 3)
                        .map((subject) => (
                          <div
                            key={subject.id}
                            className="flex items-center justify-between p-3 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="backdrop-blur-md bg-royalPurple-success/60 border border-royalPurple-border/50 rounded-lg p-2">
                                <BookOpen className="h-4 w-4 text-royalPurple-text1" />
                              </div>
                              <div>
                                <p className="text-royalPurple-text1 font-semibold text-sm">
                                  {subject.name}
                                </p>
                                <p className="text-royalPurple-text2 text-xs">Active subject</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-royalPurple-successTx text-sm font-semibold">
                                Active
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                    <Button className="w-full mt-4 bg-royalPurple-success/60 hover:bg-royalPurple-success/80 text-royalPurple-text1 border border-royalPurple-border/50">
                      Manage Subjects
                    </Button>
                  </div>

                  {/* Academic Goals */}
                  <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-royalPurple-text1 font-bold text-lg flex items-center">
                        <Target className="h-5 w-5 mr-2 text-warn" />
                        Academic Goals
                      </h3>
                      <span className="text-royalPurple-text2 text-sm">
                        {dashboardStats.completedGoals}/{dashboardStats.totalGoals}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {teacherGoals.slice(0, 3).map((goal, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`backdrop-blur-md border rounded-lg p-2 ${
                                goal.status === 'completed'
                                  ? 'bg-royalPurple-success/60 border-royalPurple-border/50'
                                  : 'bg-warn/60 border-warn/50'
                              }`}
                            >
                              {goal.status === 'completed' ? (
                                <CheckCircle className="h-4 w-4 text-royalPurple-text1" />
                              ) : (
                                <Target className="h-4 w-4 text-royalPurple-text1" />
                              )}
                            </div>
                            <div>
                              <p className="text-royalPurple-text1 font-semibold text-sm">
                                {goal.title}
                              </p>
                              <p className="text-royalPurple-text2 text-xs">
                                {goal.progress}% complete
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                goal.status === 'completed'
                                  ? 'bg-royalPurple-success/60 text-royalPurple-successTx border border-royalPurple-border/50'
                                  : 'bg-warn/60 text-warn/20 border border-warn/50'
                              }`}
                            >
                              {goal.status === 'completed' ? 'Done' : 'In Progress'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full mt-4 bg-warn/60 hover:bg-warn/80 text-royalPurple-text1 border border-warn/50">
                      View All Goals
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assessment Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Assessments */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-royalPurple-text1 flex items-center">
                  <ClipboardList className="h-6 w-6 mr-3 text-accent/80" />
                  Upcoming Assessments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {/* No upcoming assessments */}
                    <div className="text-center py-8">
                      <ClipboardList className="h-12 w-12 mx-auto text-royalPurple-text3 mb-4" />
                      <h3 className="text-lg font-medium text-royalPurple-text1 mb-2">
                        No Upcoming Assessments
                      </h3>
                      <p className="text-royalPurple-text2">
                        Create your first assessment to get started
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    className="w-full mt-6 bg-gradient-to-r from-accent to-accent hover:from-accent hover:to-accent text-royalPurple-text1"
                  >
                    <Link href="/dashboard/teacher/assessments/create">Create Assessment</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Marking Progress */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-royalPurple-text1 flex items-center">
                  <BarChart3 className="h-6 w-6 mr-3 text-royalPurple-accentTx" />
                  Marking Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {/* No marking progress */}
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 mx-auto text-royalPurple-text3 mb-4" />
                      <h3 className="text-lg font-medium text-royalPurple-text1 mb-2">
                        No Marking in Progress
                      </h3>
                      <p className="text-royalPurple-text2">
                        Create assessments to start marking student work
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    className="w-full mt-6 bg-gradient-to-r from-ink to-accent hover:from-g-800 hover:to-accent text-royalPurple-text1"
                  >
                    <Link href="/dashboard/teacher/results">Continue Marking</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Analytics */}
          {hasResults && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-royalPurple-text1 flex items-center">
                  <TrendingUp className="h-6 w-6 mr-3 text-royalPurple-successTx" />
                  Teacher Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Performance Trends */}
                    <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                      <h3 className="text-royalPurple-text1 font-bold text-lg mb-4 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-royalPurple-successTx" />
                        Performance Trends by Term
                      </h3>
                      <div className="h-64 flex items-center justify-center bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 text-royalPurple-text3 mx-auto mb-4" />
                          <p className="text-royalPurple-text2">Performance Chart</p>
                          <p className="text-royalPurple-text3 text-sm">
                            Term comparison visualization
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Subject Performance */}
                    <div className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                      <h3 className="text-royalPurple-text1 font-bold text-lg mb-4 flex items-center">
                        <Award className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
                        Subject Performance
                      </h3>
                      <div className="space-y-4">
                        {(
                          currentUser?.subjects || ['Mathematics', 'Physics', 'Computer Science']
                        ).map((subject, index) => {
                          const performance = [82, 76, 88][index] || 75
                          return (
                            <div
                              key={index}
                              className="p-3 bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-royalPurple-text1 font-semibold text-sm">
                                  {subject}
                                </span>
                                <span className="text-royalPurple-accentTx font-bold">
                                  {performance}%
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
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Teaching Tools */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center">
                <Library className="h-6 w-6 mr-3 text-royalPurple-pillTx" />
                Teaching Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Link href="/dashboard/teacher/assessments">
                    <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <ClipboardList className="h-8 w-8 text-royalPurple-text1" />
                      </div>
                      <h3 className="text-royalPurple-text1 font-semibold text-center">
                        Manage Assessments
                      </h3>
                      <p className="text-royalPurple-text2 text-sm text-center mt-2">
                        Create and schedule assessments
                      </p>
                    </div>
                  </Link>
                  <Link href="/dashboard/teacher/lesson-plans">
                    <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-royalPurple-success/60 border border-royalPurple-border/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="h-8 w-8 text-royalPurple-text1" />
                      </div>
                      <h3 className="text-royalPurple-text1 font-semibold text-center">
                        Lesson Planning
                      </h3>
                      <p className="text-royalPurple-text2 text-sm text-center mt-2">
                        Curriculum delivery
                      </p>
                    </div>
                  </Link>
                  <Link href="/dashboard/teacher/results">
                    <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <BarChart3 className="h-8 w-8 text-royalPurple-text1" />
                      </div>
                      <h3 className="text-royalPurple-text1 font-semibold text-center">
                        Record Results
                      </h3>
                      <p className="text-royalPurple-text2 text-sm text-center mt-2">
                        Enter assessment results
                      </p>
                    </div>
                  </Link>
                  <Link href="/dashboard/teacher/schemes">
                    <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-accent/60 border border-accent/80/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="h-8 w-8 text-royalPurple-text1" />
                      </div>
                      <h3 className="text-royalPurple-text1 font-semibold text-center">
                        Scheme of Work
                      </h3>
                      <p className="text-royalPurple-text2 text-sm text-center mt-2">
                        Curriculum planning
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teacher Assignments - Detailed View */}
          {/* <TeacherAssignments teacherData={dashboardData} /> */}
          <div className="p-4 bg-royalPurple-card/60 rounded-lg text-royalPurple-text1">
            Teacher Assignments - Coming Soon
          </div>
        </div>
      </div>
    </ResponsiveDashboardLayout>
  )
}
