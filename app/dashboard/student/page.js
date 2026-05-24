'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import StudentSubjects from '@/components/dashboard/StudentSubjects'
import StudentGameDashboard from '@/components/games/StudentGameDashboard'
import GamePlayer from '@/components/games/GamePlayer'
import AchievementSystem from '@/components/games/AchievementSystem'
import SmartDashboardIntegration from '@/components/dashboard/SmartDashboardIntegration'
import { StudentTimetableView } from '@/components/timetable/StudentTimetableView'
import { useSchoolTimeSlots } from '@/lib/timetable/useSchoolTimeSlots'
import { api } from '@/lib/api'
import { percentTextClass } from '@/lib/utils/percentColor'
import {
  BookOpen,
  ClipboardList,
  BarChart3,
  Calendar,
  Clock,
  Award,
  User,
  Phone,
  Mail,
  Home,
  TrendingUp,
  Target,
  Download,
  CheckCircle,
  Flag,
  Trophy,
  GamepadIcon,
  Zap,
  Crown,
  Rocket,
  TrendingUp as LearningPathIcon,
  Globe,
} from 'lucide-react'
import Link from 'next/link'
import LearningPathPage from './learning-path/page'
import CreativeTeachingHub from '@/components/creative-teaching/CreativeTeachingHub'
import { SCHOOL_SUBJECTS, getSubjectsByIds } from '@/data/subjects'
import toast from 'react-hot-toast'

// Games data is now fetched dynamically via API

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

export default function StudentDashboard() {
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

  const [activeTab, setActiveTab] = useState('overview')
  const [currentGame, setCurrentGame] = useState(null)
  const { timeSlots } = useSchoolTimeSlots()
  const [timetableClasses, setTimetableClasses] = useState([])
  const [timetableTeachers, setTimetableTeachers] = useState([])
  const [timetableClassrooms, setTimetableClassrooms] = useState([])
  const [timetableMobile, setTimetableMobile] = useState(false)
  const [studentData, setStudentData] = useState({
    results: [],
    goals: [],
    studyMaterials: [],
    assessments: [],
  })

  const [dashboardStats, setDashboardStats] = useState({
    totalSubjects: 0,
    totalResults: 0,
    averageGrade: 0,
    completedGoals: 0,
    totalGoals: 0,
    recentMaterials: 0,
  })

  const [performanceData, setPerformanceData] = useState({
    labels: [],
    datasets: [
      {
        label: 'My Performance',
        data: [],
        backgroundColor: [],
        borderWidth: 1,
      },
    ],
  })

  useEffect(() => {
    const update = () => setTimetableMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [classesRes, teachersRes] = await Promise.all([
          fetch('/api/classes?limit=200', { cache: 'no-store' }),
          fetch('/api/teachers?limit=200', { cache: 'no-store' }),
        ])
        const classesJson = await classesRes.json().catch(() => ({}))
        const teachersJson = await teachersRes.json().catch(() => ({}))

        const cList = Array.isArray(classesJson?.data) ? classesJson.data : []
        const mappedClasses = cList.map((c) => ({
          id: c.id,
          name: c.name || c.className || 'Class',
          grade: Number(String(c.yearGroup || c.year_group || '').match(/\d+/)?.[0] || 8),
          students: Number(c.studentCount || 40),
          subjects: [],
        }))
        setTimetableClasses(mappedClasses)
        setTimetableClassrooms(defaultClassrooms(mappedClasses.length))

        const tList = Array.isArray(teachersJson?.data) ? teachersJson.data : []
        const mappedTeachers = tList.map((t) => ({
          id: t.id,
          fullName: t?.user?.name || t?.name || 'Teacher',
          subjects: [],
          availability: [],
          maxHours: {},
          traveling: { enabled: false, schools: [] },
        }))
        setTimetableTeachers(mappedTeachers)
      } catch (e) {
        toast.error('Failed to load timetable metadata')
        setTimetableClasses([])
        setTimetableTeachers([])
        setTimetableClassrooms(defaultClassrooms(12))
      }
    }
    load()
  }, [])

  // Get current user data from auth context
  const { user: currentUser } = useAuth()
  const studentProfile = currentUser?.studentProfile || null

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats().then((res) => res.data),
  })

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: async () => {
      const response = await api.getStudentDashboard()
      return response.data.data
    },
  })

  // Update stats when data is loaded
  useEffect(() => {
    if (dashboardData?.stats) {
      setDashboardStats({
        totalSubjects: dashboardData.stats.totalSubjects || 0,
        totalResults: dashboardData.stats.totalResults || 0,
        averageGrade: dashboardData.stats.averageGrade || 0,
        completedGoals: dashboardData.stats.completedGoals || 0,
        totalGoals: dashboardData.stats.totalGoals || 0,
        recentMaterials: dashboardData.stats.recentMaterials || 0,
      })
    }
  }, [dashboardData])

  // Helper function to get achievement icon based on grade
  const getAchievementIcon = (grade) => {
    if (grade === 'A+' || grade === 'A' || grade === 'ONE' || grade === '1' || grade === '2') {
      return <Trophy className="h-4 w-4 text-warn/100" />
    }
    return null
  }

  // Helper function to get grade from score
  const getGrade = (score) => {
    if (!score) return 'N/A'
    if (score >= 75) return 'A+'
    if (score >= 70) return 'A'
    if (score >= 60) return 'B'
    if (score >= 50) return 'C'
    if (score >= 40) return 'D'
    return 'F'
  }

  // Game handlers
  const handleGameComplete = (results) => {
    console.log('Game completed with results:', results)
    // Here you would typically save the results to the backend
    setCurrentGame(null)
    setActiveTab('games') // Return to games tab
  }

  const handleExitGame = () => {
    setCurrentGame(null)
    setActiveTab('games')
  }

  // If playing a game, show the game player
  if (currentGame) {
    return (
      <DashboardLayout title="Playing Game">
        <GamePlayer game={currentGame} onComplete={handleGameComplete} onExit={handleExitGame} />
      </DashboardLayout>
    )
  }

  return (
    <div className="dashboard-layout">
      <DashboardLayout title="Student Dashboard">
        <div className="space-y-8 relative z-10">
          <header className="backdrop-blur-lg bg-royalPurple-card/60 border border-royalPurple-border2/40 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-royalPurple-text1 mb-4">
                  Welcome back, {currentUser?.name?.split(' ')[0] || 'Student'}.
                </h1>
                <p className="text-royalPurple-text2 text-lg">
                  Track your academic progress and achievements
                </p>
              </div>
              {currentUser && (
                <div className="flex items-center space-x-4">
                  <div className="bg-accent text-white rounded-2xl p-4 text-center shadow-sm border border-royalPurple-border">
                    <div className="text-2xl font-bold">{new Date().getDate()}</div>
                    <div className="text-sm opacity-90">
                      {new Date().toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-white font-bold text-xl shadow-sm border border-royalPurple-border">
                    {currentUser.name?.charAt(0) || 'S'}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 -mx-2 px-2 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {[
                  { id: 'overview', name: 'Overview', icon: BarChart3 },
                  { id: 'creative-teaching', name: 'Creative Learning', icon: Rocket },
                  { id: 'advanced', name: 'Advanced Features', icon: Zap },
                  { id: 'analytics', name: 'Smart Analytics', icon: Zap },
                  { id: 'games', name: 'Games & Learning', icon: GamepadIcon },
                  { id: 'achievements', name: 'Achievements', icon: Trophy },
                  { id: 'subjects', name: 'My Subjects', icon: BookOpen },
                  { id: 'learning-path', name: 'Learning Path', icon: LearningPathIcon },
                ].map((tab) => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm whitespace-nowrap transition-colors border ${
                        active
                          ? 'bg-royalPurple-accent/60 text-royalPurple-text1 border-royalPurple-border2/60'
                          : 'bg-royalPurple-card/40 text-royalPurple-text2 border-royalPurple-border/40 hover:bg-royalPurple-card/70'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{tab.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {activeTab === 'overview' && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('games')}
                  className="text-left p-6 rounded-2xl backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 hover:bg-royalPurple-card/80 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-royalPurple-text1">Games</h3>
                  <p
                    className={`text-3xl font-bold ${
                      Number(dashboardData?.stats?.gamesPlayed) > 0 ? 'text-white' : 'text-g-400'
                    }`}
                  >
                    {dashboardData?.stats?.gamesPlayed || 0}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('achievements')}
                  className="text-left p-6 rounded-2xl backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 hover:bg-royalPurple-card/80 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-royalPurple-text1">Achievements</h3>
                  <p
                    className={`text-3xl font-bold ${
                      Number(dashboardData?.stats?.achievements) > 0 ? 'text-white' : 'text-g-400'
                    }`}
                  >
                    {dashboardData?.stats?.achievements || 0}
                  </p>
                </button>
                <div className="p-6 rounded-2xl backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40">
                  <h3 className="text-lg font-semibold text-royalPurple-text1">Level</h3>
                  <p className="text-3xl font-bold text-white">
                    {dashboardData?.stats?.level || 1}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('subjects')}
                  className="text-left p-6 rounded-2xl backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 hover:bg-royalPurple-card/80 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-royalPurple-text1">Points</h3>
                  <p className="text-3xl font-bold text-white">
                    {dashboardData?.stats?.points || 0}
                  </p>
                  <p className="text-xs text-royalPurple-text2 mt-1">Best 6 subjects</p>
                </button>
              </div>
            )}
          </header>

          <section className="max-w-none">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-royalPurple-text1">My Class Timetable</h2>
              <div className="flex items-center gap-2 print:hidden">
                <Link
                  href="/dashboard/timetable/student"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-royalPurple-card/70 border border-royalPurple-border text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1 transition-colors font-semibold"
                >
                  <Calendar className="h-4 w-4" />
                  Open Timetable
                </Link>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="zsms-hover-raise"
                >
                  Print
                </Button>
              </div>
            </div>
            <div className="mt-4 max-w-none max-h-[50vh] overflow-auto">
              <StudentTimetableView
                timeSlots={timeSlots}
                classId={String(currentUser?.studentProfile?.classId || '') || undefined}
                classes={timetableClasses}
                teachers={timetableTeachers}
                classrooms={timetableClassrooms}
                mobile={timetableMobile}
              />
            </div>
          </section>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Student Information Card */}
              {currentUser && (
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="text-royalPurple-text1 flex items-center">
                      <User className="h-6 w-6 mr-3 text-royalPurple-accentTx" />
                      Student Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                          <div className="flex items-center mb-2">
                            <User className="h-4 w-4 text-royalPurple-accentTx mr-2" />
                            <span className="text-royalPurple-text2 text-sm font-medium">
                              Full Name
                            </span>
                          </div>
                          <p className="text-royalPurple-text1 font-semibold">{currentUser.name}</p>
                        </div>
                        <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                          <div className="flex items-center mb-2">
                            <Mail className="h-4 w-4 text-royalPurple-successTx mr-2" />
                            <span className="text-royalPurple-text2 text-sm font-medium">
                              Email Address
                            </span>
                          </div>
                          <p className="text-royalPurple-text1 font-semibold">
                            {currentUser.email || 'Not provided'}
                          </p>
                        </div>
                        <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                          <div className="flex items-center mb-2">
                            <BookOpen className="h-4 w-4 text-royalPurple-pillTx mr-2" />
                            <span className="text-royalPurple-text2 text-sm font-medium">
                              Class
                            </span>
                          </div>
                          <p className="text-royalPurple-text1 font-semibold">
                            {dashboardData?.student?.class ||
                              studentProfile?.class ||
                              'Not assigned'}
                          </p>
                        </div>
                        <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                          <div className="flex items-center mb-2">
                            <Flag className="h-4 w-4 text-accent/80 mr-2" />
                            <span className="text-royalPurple-text2 text-sm font-medium">
                              Exam Number
                            </span>
                          </div>
                          <p className="text-royalPurple-text1 font-semibold">
                            {studentProfile?.exam_number ||
                              dashboardData?.student?.exam_number ||
                              'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Enhanced Stats Cards */}
              <section className="w-full py-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-6">
                  <StatsCard
                    title="My Subjects"
                    value={dashboardStats.totalSubjects}
                    icon={BookOpen}
                    color="blue"
                    description="Enrolled subjects"
                    variant="flat"
                  />
                  <StatsCard
                    title="My Results"
                    value={dashboardStats.totalResults}
                    icon={BarChart3}
                    color="green"
                    description="Total results"
                    variant="flat"
                  />
                  <StatsCard
                    title="Average Grade"
                    value={`${dashboardStats.averageGrade.toFixed(1)}%`}
                    icon={Award}
                    color="purple"
                    description="Overall performance"
                    variant="flat"
                  />
                  <StatsCard
                    title="Goals Progress"
                    value={`${dashboardStats.completedGoals}/${dashboardStats.totalGoals}`}
                    icon={Target}
                    color="yellow"
                    description="Completed goals"
                    variant="flat"
                  />
                </div>
              </section>

              {/* Performance Overview Chart */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-royalPurple-text1 flex items-center">
                    <TrendingUp className="h-6 w-6 mr-3 text-royalPurple-successTx" />
                    Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="backdrop-blur-md bg-royalPurple-success/60 border border-royalPurple-border/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                          <Award className="h-10 w-10 text-royalPurple-text1" />
                        </div>
                        <h3 className="font-bold text-royalPurple-text1 text-lg">Overall Grade</h3>
                        <p className="text-3xl font-bold text-royalPurple-successTx mt-2">
                          {getGrade(dashboardStats.averageGrade)}
                        </p>
                        <p className="text-royalPurple-text2 text-sm mt-1">Above Average</p>
                      </div>
                      <div className="text-center">
                        <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                          <BarChart3 className="h-10 w-10 text-royalPurple-text1" />
                        </div>
                        <h3 className="font-bold text-royalPurple-text1 text-lg">Average Score</h3>
                        <p
                          className={`text-3xl font-bold mt-2 ${percentTextClass(dashboardStats.averageGrade)}`}
                        >
                          {Number(dashboardStats.averageGrade) || 0}%
                        </p>
                        <p className="text-royalPurple-text2 text-sm mt-1">Last 5 assessments</p>
                      </div>
                      <div className="text-center">
                        <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                          <Calendar className="h-10 w-10 text-royalPurple-text1" />
                        </div>
                        <h3 className="font-bold text-royalPurple-text1 text-lg">Attendance</h3>
                        {Number.isFinite(Number(dashboardData?.stats?.attendanceRate)) ? (
                          <p
                            className={`text-3xl font-bold mt-2 ${percentTextClass(
                              Number(dashboardData?.stats?.attendanceRate)
                            )}`}
                          >
                            {Number(dashboardData?.stats?.attendanceRate)}%
                          </p>
                        ) : (
                          <p className="text-3xl font-bold text-g-400 mt-2 italic">No data</p>
                        )}
                        <p className="text-royalPurple-text2 text-sm mt-1">This semester</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* My Class Info */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="text-royalPurple-text1 flex items-center">
                      <BookOpen className="h-6 w-6 mr-3 text-royalPurple-accentTx" />
                      My Class Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                      {dashboardData?.my_class ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-gradient-to-r from-ink/20 to-accent/20 border border-royalPurple-border2/30 rounded-xl">
                            <h3 className="font-bold text-xl text-royalPurple-text1">
                              {dashboardData.my_class.name}
                            </h3>
                            <p className="text-royalPurple-accentTx">
                              Academic Year: {dashboardData.my_class.academic_year}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                              <span className="font-medium text-royalPurple-text2">Class ID:</span>
                              <p className="text-royalPurple-text1 font-semibold">
                                {dashboardData.my_class.id}
                              </p>
                            </div>
                            <div className="p-3 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                              <span className="font-medium text-royalPurple-text2">Status:</span>
                              <p className="text-royalPurple-successTx font-semibold">Active</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="h-8 w-8 text-royalPurple-text1" />
                          </div>
                          <p className="text-royalPurple-text2">No class assigned yet</p>
                          <p className="text-royalPurple-text3 text-sm mt-2">
                            Contact your administrator
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Assessments */}
                <Card variant="glass">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-royalPurple-text1 flex items-center">
                      <ClipboardList className="h-6 w-6 mr-3 text-royalPurple-successTx" />
                      Upcoming Assessments
                    </CardTitle>
                    <Link href="/dashboard/student/assessments">
                      <Button className="bg-gradient-to-r from-kpi-pass to-ink hover:from-g-700 hover:to-g-800 text-royalPurple-text1">
                        View All
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                      <div className="space-y-4">
                        {/* Upcoming assessments data */}
                        {dashboardData?.upcoming_assessments?.map((assessment) => (
                          <div
                            key={assessment.id}
                            className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-colors duration-200"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="backdrop-blur-md bg-royalPurple-success/60 border border-royalPurple-border/50 rounded-xl p-3">
                                  <ClipboardList className="h-6 w-6 text-royalPurple-text1" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-royalPurple-text1">
                                    {assessment.title}
                                  </h4>
                                  <p className="text-royalPurple-text2 text-sm">
                                    {assessment.subject}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="px-3 py-1 text-xs rounded-full bg-royalPurple-accent/60 text-royalPurple-accentTx border border-royalPurple-border2/50 capitalize font-medium">
                                  {assessment.type}
                                </span>
                                <p className="text-royalPurple-text3 text-xs mt-1">
                                  {new Date(assessment.start_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {assessment.duration_minutes && (
                              <div className="flex items-center mt-3 text-sm text-royalPurple-text2">
                                <Clock className="h-4 w-4 mr-2 text-royalPurple-accentTx" />
                                {assessment.duration_minutes} minutes
                              </div>
                            )}
                          </div>
                        ))}
                        {(!dashboardData?.upcoming_assessments ||
                          dashboardData.upcoming_assessments.length === 0) && (
                          <div className="text-center py-8">
                            <div className="backdrop-blur-md bg-royalPurple-success/60 border border-royalPurple-border/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                              <ClipboardList className="h-8 w-8 text-royalPurple-text1" />
                            </div>
                            <p className="text-royalPurple-text2">No upcoming assessments</p>
                            <p className="text-royalPurple-text3 text-sm mt-2">
                              Check back later for new assessments
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
                  <CardTitle className="text-royalPurple-text1 flex items-center">
                    <Target className="h-6 w-6 mr-3 text-warn" />
                    My Goals Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Goals Overview */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-royalPurple-text1 mb-4">
                          Academic Goals
                        </h3>
                        {dashboardData?.goals && dashboardData.goals.length > 0 ? (
                          dashboardData.goals.map((goal) => (
                            <div
                              key={goal.id}
                              className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl"
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
                                  style={{ width: `${goal.progress}%` }}
                                ></div>
                              </div>
                              <p className="text-royalPurple-text2 text-xs">
                                {goal.progress}% Complete
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                            <Target className="h-8 w-8 text-royalPurple-text3 mx-auto mb-2" />
                            <p className="text-royalPurple-text2 text-sm">No active goals</p>
                            <Button
                              variant="link"
                              className="text-royalPurple-accentTx text-xs mt-1"
                            >
                              Create your first goal
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Goals Stats */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-royalPurple-text1 mb-4">
                          Progress Summary
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-gradient-to-r from-kpi-pass/20 to-ink/20 border border-royalPurple-border/30 rounded-xl text-center">
                            <div className="text-2xl font-bold text-royalPurple-successTx">
                              {dashboardStats.completedGoals}
                            </div>
                            <div className="text-royalPurple-text2 text-sm">Completed</div>
                          </div>
                          <div className="p-4 bg-gradient-to-r from-warn/20 to-accent/20 border border-warn/30 rounded-xl text-center">
                            <div className="text-2xl font-bold text-warn">
                              {dashboardStats.totalGoals - dashboardStats.completedGoals}
                            </div>
                            <div className="text-royalPurple-text2 text-sm">In Progress</div>
                          </div>
                        </div>
                        <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl text-center">
                          <div className="text-3xl font-bold text-royalPurple-text1 mb-2">
                            {Math.round(
                              (dashboardStats.completedGoals / dashboardStats.totalGoals) * 100
                            )}
                            %
                          </div>
                          <div className="text-royalPurple-text2">Overall Progress</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* My Subjects Section */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-royalPurple-text1 flex items-center">
                    <BookOpen className="h-6 w-6 mr-3 text-royalPurple-pillTx" />
                    My Subjects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                    {(dashboardData?.subject_performance || []).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {dashboardData.subject_performance.map((performance, index) => {
                          return (
                            <div
                              key={index}
                              className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-3">
                                  <BookOpen className="h-8 w-8 text-royalPurple-text1" />
                                </div>
                                <div
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    performance.avgScore >= 90
                                      ? 'bg-royalPurple-success/60 text-royalPurple-successTx border border-royalPurple-border/50'
                                      : performance.avgScore >= 80
                                        ? 'bg-royalPurple-accent/60 text-royalPurple-accentTx border border-royalPurple-border2/50'
                                        : performance.avgScore >= 70
                                          ? 'bg-warn/60 text-warn/20 border border-warn/50'
                                          : 'bg-royalPurple-danger/60 text-royalPurple-dangerTx border border-royalPurple-border/50'
                                  }`}
                                >
                                  Grade {performance.latestGrade}
                                </div>
                              </div>
                              <h3 className="text-royalPurple-text1 font-bold text-lg mb-2">
                                {performance.subject}
                              </h3>
                              <p className="text-royalPurple-text2 text-sm mb-4">
                                {performance.teacher}
                              </p>

                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-royalPurple-text2 text-sm">
                                    Average Score
                                  </span>
                                  <span
                                    className={`font-semibold ${percentTextClass(performance.avgScore)}`}
                                  >
                                    {Number(performance.avgScore) || 0}%
                                  </span>
                                </div>
                                <div className="w-full bg-royalPurple-muted/60 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      performance.avgScore >= 90
                                        ? 'bg-royalPurple-success'
                                        : performance.avgScore >= 80
                                          ? 'bg-royalPurple-accent'
                                          : performance.avgScore >= 70
                                            ? 'bg-warn/100'
                                            : 'bg-royalPurple-danger'
                                    }`}
                                    style={{ width: `${Math.min(performance.avgScore, 100)}%` }}
                                  ></div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-royalPurple-text2 text-sm">
                                    Assessments
                                  </span>
                                  <span className="text-royalPurple-text1 font-semibold">
                                    {performance.assessments}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-6">
                          <BookOpen className="h-10 w-10 text-royalPurple-text1" />
                        </div>
                        <h3 className="text-royalPurple-text1 font-bold text-xl mb-2">
                          No Subjects Registered
                        </h3>
                        <p className="text-royalPurple-text2 mb-4">
                          Contact administrator to get started
                        </p>
                        <Button className="bg-gradient-to-r from-accent to-ink hover:from-accent hover:to-g-800 text-royalPurple-text1">
                          Contact Administrator
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Student Subjects - Detailed View */}
              <StudentSubjects studentData={dashboardData} />

              {/* Recent Results */}
              <Card variant="glass">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-royalPurple-text1 flex items-center">
                    <BarChart3 className="h-6 w-6 mr-3 text-royalPurple-accentTx" />
                    Recent Results
                  </CardTitle>
                  <Link href="/dashboard/student/results">
                    <Button className="bg-gradient-to-r from-ink to-kpi-pass hover:from-g-800 hover:to-g-700 text-royalPurple-text1">
                      View All Results
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                    <div className="space-y-4">
                      {/* Recent Results Data */}
                      {(dashboardData?.recent_results || []).map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-colors duration-200"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-xl p-3">
                              <BookOpen className="h-6 w-6 text-royalPurple-text1" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-royalPurple-text1">
                                {result.subject?.name || 'Subject'}
                              </h4>
                              <p className="text-royalPurple-text2 text-sm">
                                {result.comments || 'Assessment'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-royalPurple-text1">
                              {result.score}/100
                            </div>
                            <div
                              className={`text-lg font-semibold ${percentTextClass(result.score)}`}
                            >
                              {Number(result.score) || 0}%
                            </div>
                            <div
                              className={`text-xs px-3 py-1 rounded-full font-medium flex items-center ${
                                result.grade === 'A+' || result.grade === 'A'
                                  ? 'bg-royalPurple-success/60 text-royalPurple-successTx border border-royalPurple-border/50'
                                  : result.grade === 'B+' || result.grade === 'B'
                                    ? 'bg-royalPurple-accent/60 text-royalPurple-accentTx border border-royalPurple-border2/50'
                                    : result.grade === 'C+' || result.grade === 'C'
                                      ? 'bg-warn/60 text-warn/20 border border-warn/50'
                                      : 'bg-royalPurple-danger/60 text-royalPurple-dangerTx border border-royalPurple-border/50'
                              }`}
                            >
                              Grade {result.grade}
                              {getAchievementIcon(result.grade) && (
                                <span className="ml-1">{getAchievementIcon(result.grade)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!dashboardData?.recent_results ||
                        dashboardData.recent_results.length === 0) && (
                        <div className="text-center py-8">
                          <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <BarChart3 className="h-8 w-8 text-royalPurple-text1" />
                          </div>
                          <p className="text-royalPurple-text2">No results available yet</p>
                          <p className="text-royalPurple-text3 text-sm mt-2">
                            Results will appear here after assessments are graded
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-royalPurple-text1 flex items-center">
                    <Target className="h-6 w-6 mr-3 text-royalPurple-pillTx" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                      <Link href="/dashboard/student/assessments">
                        <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                          <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                            <ClipboardList className="h-8 w-8 text-royalPurple-text1" />
                          </div>
                          <h3 className="text-royalPurple-text1 font-semibold text-center">
                            View Assessments
                          </h3>
                          <p className="text-royalPurple-text2 text-sm text-center mt-2">
                            Check upcoming tests
                          </p>
                        </div>
                      </Link>
                      <Link href="/dashboard/student/results">
                        <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                          <div className="backdrop-blur-md bg-royalPurple-success/60 border border-royalPurple-border/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                            <BarChart3 className="h-8 w-8 text-royalPurple-text1" />
                          </div>
                          <h3 className="text-royalPurple-text1 font-semibold text-center">
                            Check Results
                          </h3>
                          <p className="text-royalPurple-text2 text-sm text-center mt-2">
                            View your grades
                          </p>
                        </div>
                      </Link>
                      <Link href="/dashboard/student/goals">
                        <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                          <div className="backdrop-blur-md bg-warn/60 border border-warn/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Target className="h-8 w-8 text-royalPurple-text1" />
                          </div>
                          <h3 className="text-royalPurple-text1 font-semibold text-center">
                            My Goals
                          </h3>
                          <p className="text-royalPurple-text2 text-sm text-center mt-2">
                            Track progress
                          </p>
                        </div>
                      </Link>
                      <Link href="/dashboard/student/subjects">
                        <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                          <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                            <BookOpen className="h-8 w-8 text-royalPurple-text1" />
                          </div>
                          <h3 className="text-royalPurple-text1 font-semibold text-center">
                            My Subjects
                          </h3>
                          <p className="text-royalPurple-text2 text-sm text-center mt-2">
                            Subject details
                          </p>
                        </div>
                      </Link>
                      <Link href="/dashboard/sdg">
                        <div className="group p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                          <div className="backdrop-blur-md bg-gradient-to-r from-ink/60 to-kpi-pass/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Globe className="h-8 w-8 text-royalPurple-text1" />
                          </div>
                          <h3 className="text-royalPurple-text1 font-semibold text-center">
                            🇺🇳 UN SDGs
                          </h3>
                          <p className="text-royalPurple-text2 text-sm text-center mt-2">
                            Global Impact
                          </p>
                        </div>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Learning Library */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Study Materials */}
                <Card variant="glass">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-royalPurple-text1 flex items-center">
                      <Download className="h-6 w-6 mr-3 text-royalPurple-successTx" />
                      Study Materials
                    </CardTitle>
                    <Button className="bg-gradient-to-r from-kpi-pass to-kpi-pass hover:from-g-700 hover:to-g-700 text-royalPurple-text1">
                      View All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                      <div className="space-y-4">
                        {/* Study Materials List */}
                        {(dashboardData?.study_materials || []).map((material) => (
                          <div
                            key={material.id}
                            className="flex items-center p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-colors duration-200 cursor-pointer"
                          >
                            <div className="backdrop-blur-md bg-royalPurple-success/60 border border-royalPurple-border/50 rounded-xl p-3 mr-4">
                              <Download className="h-6 w-6 text-royalPurple-text1" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-royalPurple-text1">
                                {material.title}
                              </h4>
                              <p className="text-royalPurple-text2 text-sm">
                                {material.subject} • {material.type}
                              </p>
                              <p className="text-royalPurple-text3 text-xs">
                                {material.fileSize || 'N/A'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="bg-royalPurple-success/60 hover:bg-royalPurple-success/80 text-royalPurple-text1 border border-royalPurple-border/50"
                              asChild
                            >
                              <a href={material.fileUrl} target="_blank" rel="noopener noreferrer">
                                Download
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 text-center">
                        <p className="text-royalPurple-text2 text-sm">
                          {dashboardStats.recentMaterials} materials available
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Assessment Schedule Detail */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="text-royalPurple-text1 flex items-center">
                      <ClipboardList className="h-6 w-6 mr-3 text-accent/80" />
                      Assessment Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                      <div className="space-y-4">
                        {/* Upcoming Assessments List */}
                        {(dashboardData?.upcoming_assessments || []).map((assessment) => (
                          <div
                            key={assessment.id}
                            className="p-4 bg-gradient-to-r from-accent/20 to-accent/20 border border-accent/80/30 rounded-xl"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="backdrop-blur-md bg-accent/60 border border-accent/80/50 rounded-xl p-2">
                                  <ClipboardList className="h-5 w-5 text-royalPurple-text1" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-royalPurple-text1 text-sm">
                                    {assessment.title}
                                  </h4>
                                  <p className="text-accent/40 text-xs">{assessment.subject}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="px-2 py-1 bg-accent/60 text-accent/20 border border-accent/80/50 rounded-full text-xs font-medium">
                                  {assessment.type}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-accent/40">
                                Due: {new Date(assessment.start_date).toLocaleDateString()}
                              </span>
                              <span className="text-accent/40">
                                Duration: {assessment.duration_minutes} mins
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Emergency Contact Information */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-royalPurple-text1 flex items-center">
                    <Phone className="h-6 w-6 mr-3 text-royalPurple-dangerTx" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Emergency contact data from API */}
                      <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                        <div className="flex items-center mb-2">
                          <User className="h-4 w-4 text-royalPurple-dangerTx mr-2" />
                          <span className="text-royalPurple-text2 text-sm font-medium">
                            Full Name
                          </span>
                        </div>
                        <p className="text-royalPurple-text1 font-semibold">
                          {dashboardData?.student?.emergency_contact?.name || 'Not provided'}
                        </p>
                      </div>
                      <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                        <div className="flex items-center mb-2">
                          <User className="h-4 w-4 text-royalPurple-successTx mr-2" />
                          <span className="text-royalPurple-text2 text-sm font-medium">
                            Relationship
                          </span>
                        </div>
                        <p className="text-royalPurple-text1 font-semibold">
                          {dashboardData?.student?.emergency_contact?.relationship ||
                            'Not provided'}
                        </p>
                      </div>
                      <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                        <div className="flex items-center mb-2">
                          <Phone className="h-4 w-4 text-royalPurple-accentTx mr-2" />
                          <span className="text-royalPurple-text2 text-sm font-medium">
                            Phone Number
                          </span>
                        </div>
                        <p className="text-royalPurple-text1 font-semibold">
                          {dashboardData?.student?.emergency_contact?.phone || 'Not provided'}
                        </p>
                      </div>
                      <div className="p-4 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl">
                        <div className="flex items-center mb-2">
                          <Home className="h-4 w-4 text-royalPurple-pillTx mr-2" />
                          <span className="text-royalPurple-text2 text-sm font-medium">
                            Location
                          </span>
                        </div>
                        <p className="text-royalPurple-text1 font-semibold">
                          {dashboardData?.student?.emergency_contact?.address || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Creative Teaching & STEM Tab */}
          {activeTab === 'creative-teaching' && (
            <div className="space-y-6">
              <CreativeTeachingHub />
            </div>
          )}

          {/* Advanced Features Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-accent/5 to-ink/5 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-royalPurple-text1 flex items-center">
                      <Zap className="w-6 h-6 text-warn/100 mr-2" />
                      Advanced Educational Features
                    </h2>
                    <p className="text-royalPurple-text2 mt-1">
                      Digital Library • Learning Paths • Study Tools • Cultural Integration
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-royalPurple-card rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-bold text-royalPurple-text1 mb-4">
                  Advanced Educational Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-royalPurple-accent p-4 rounded-lg border border-royalPurple-border2">
                    <h4 className="font-semibold text-royalPurple-accentTx mb-2">
                      Digital Library
                    </h4>
                    <p className="text-royalPurple-accentTx text-sm">
                      Access thousands of books offline
                    </p>
                    <Link
                      href="/dashboard/student/materials"
                      className="mt-2 inline-block text-center bg-royalPurple-accent text-royalPurple-text1 px-3 py-1 rounded text-sm hover:bg-royalPurple-accent w-full transition-colors"
                    >
                      Open Library
                    </Link>
                  </div>
                  <div className="bg-royalPurple-success p-4 rounded-lg border border-royalPurple-border">
                    <h4 className="font-semibold text-royalPurple-successTx mb-2">Study Groups</h4>
                    <p className="text-royalPurple-successTx text-sm">Join peer learning groups</p>
                    <Link
                      href="/dashboard/student/study-groups"
                      className="mt-2 inline-block text-center bg-royalPurple-success text-royalPurple-text1 px-3 py-1 rounded text-sm hover:bg-royalPurple-success w-full transition-colors"
                    >
                      Find Groups
                    </Link>
                  </div>
                  <div className="bg-royalPurple-pill p-4 rounded-lg border border-royalPurple-border2">
                    <h4 className="font-semibold text-royalPurple-pillTx mb-2">Learning Paths</h4>
                    <p className="text-royalPurple-pillTx text-sm">Adaptive learning routes</p>
                    <button
                      onClick={() => setActiveTab('learning-path')}
                      className="mt-2 bg-royalPurple-pill text-royalPurple-text1 px-3 py-1 rounded text-sm hover:bg-royalPurple-pill w-full transition-colors"
                    >
                      Start Learning
                    </button>
                  </div>
                  <div className="bg-warn/10 p-4 rounded-lg border border-warn/40">
                    <h4 className="font-semibold text-g-900 mb-2">Goal Setting</h4>
                    <p className="text-g-700 text-sm">Track academic goals</p>
                    <Link
                      href="/dashboard/student/goals"
                      className="mt-2 inline-block text-center bg-warn text-royalPurple-text1 px-3 py-1 rounded text-sm hover:bg-g-700 w-full transition-colors"
                    >
                      Set Goals
                    </Link>
                  </div>
                  <div className="bg-royalPurple-danger p-4 rounded-lg border border-royalPurple-border">
                    <h4 className="font-semibold text-royalPurple-dangerTx mb-2">Study Tools</h4>
                    <p className="text-royalPurple-dangerTx text-sm">
                      Flashcards, notes, calculators
                    </p>
                    <Link
                      href="/dashboard/student/study-tools"
                      className="mt-2 inline-block text-center bg-royalPurple-danger text-royalPurple-text1 px-3 py-1 rounded text-sm hover:bg-royalPurple-danger w-full transition-colors"
                    >
                      Open Tools
                    </Link>
                  </div>
                  <div className="bg-royalPurple-pill p-4 rounded-lg border border-royalPurple-border2">
                    <h4 className="font-semibold text-royalPurple-pillTx mb-2">
                      Cultural Learning
                    </h4>
                    <p className="text-royalPurple-pillTx text-sm">Zambian history & languages</p>
                    <Link
                      href="/dashboard/student/cultural"
                      className="mt-2 inline-block text-center bg-royalPurple-pill text-royalPurple-text1 px-3 py-1 rounded text-sm hover:bg-royalPurple-pill w-full transition-colors"
                    >
                      Explore Culture
                    </Link>
                  </div>
                </div>

                <div className="mt-8 bg-gradient-to-r from-accent/5 to-ink/5 p-6 rounded-lg">
                  <h4 className="text-lg font-bold text-royalPurple-text1 mb-4">
                    Recently Implemented Features
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-royalPurple-card p-4 rounded-lg shadow-sm">
                      <h5 className="font-semibold text-royalPurple-text1 mb-2">
                        Advanced Student Features
                      </h5>
                      <ul className="text-sm text-royalPurple-text2 space-y-1">
                        <li>Digital Library System</li>
                        <li>Peer Study Groups</li>
                        <li>Learning Style Assessment</li>
                        <li>Academic Goal Setting</li>
                        <li>Homework Reminders</li>
                      </ul>
                    </div>
                    <div className="bg-royalPurple-card p-4 rounded-lg shadow-sm">
                      <h5 className="font-semibold text-royalPurple-text1 mb-2">
                        Learning Enhancement
                      </h5>
                      <ul className="text-sm text-royalPurple-text2 space-y-1">
                        <li>Adaptive Learning Paths</li>
                        <li>Concept Mapping Tools</li>
                        <li>Flashcard Creator</li>
                        <li>Practice Test Generator</li>
                        <li>Learning Analytics</li>
                      </ul>
                    </div>
                    <div className="bg-royalPurple-card p-4 rounded-lg shadow-sm">
                      <h5 className="font-semibold text-royalPurple-text1 mb-2">
                        Cultural Integration
                      </h5>
                      <ul className="text-sm text-royalPurple-text2 space-y-1">
                        <li>Local History Module</li>
                        <li>Traditional Knowledge Library</li>
                        <li>Community Heroes Database</li>
                        <li>Environmental Education</li>
                        <li>Language Learning Center</li>
                      </ul>
                    </div>
                    <div className="bg-royalPurple-card p-4 rounded-lg shadow-sm">
                      <h5 className="font-semibold text-royalPurple-text1 mb-2">
                        Progress Tracking
                      </h5>
                      <ul className="text-sm text-royalPurple-text2 space-y-1">
                        <li>Study Time Tracker</li>
                        <li>Subject Calculators</li>
                        <li>Digital Notebook System</li>
                        <li>Research Project Manager</li>
                        <li>Performance Analytics</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Smart Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-accent/5 to-ink/5 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-royalPurple-text1 flex items-center">
                      <Zap className="w-6 h-6 text-warn/100 mr-2" />
                      Smart Analytics Dashboard
                    </h2>
                    <p className="text-royalPurple-text2 mt-1">
                      AI-powered insights • Performance tracking • Predictive analytics
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => toast.success('Generating performance report...')}
                      className="btn-secondary btn-sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </div>

              <SmartDashboardIntegration
                userRole="student"
                userData={{
                  id: currentUser?.id || null,
                  name: dashboardData?.student?.name || currentUser?.name || 'Student',
                  studentId: String(studentProfile?.id || dashboardData?.student?.id || ''),
                  class: dashboardData?.student?.class || studentProfile?.class || '',
                  totalPoints: dashboardData?.stats?.points || 0,
                  level: dashboardData?.stats?.level || 1,
                  nextLevelPoints: dashboardData?.stats?.nextLevelXp,
                  attendance: [], // We could populate this if available
                  grades: dashboardData?.subject_performance || [],
                  assignments: [],
                  recentActivities: [],
                }}
                studentData={
                  dashboardData
                    ? [
                        {
                          ...dashboardData.student,
                          grades:
                            dashboardData.subject_performance?.map((s) => ({
                              subject: s.subject,
                              score: s.avgScore,
                              grade: s.latestGrade,
                              date: new Date().toISOString(), // Current status
                            })) || [],
                          attendance: dashboardData.student?.attendance_records || [],
                          assignments: dashboardData.student?.assignments_list || [],
                        },
                      ]
                    : []
                }
                classData={{
                  name: dashboardData?.student?.class || studentProfile?.class || '',
                  teacher: '',
                  studentCount: 0,
                  subjects: dashboardData?.student?.subjects || [],
                }}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            </div>
          )}

          {/* Games Tab */}
          {activeTab === 'games' && (
            <div className="space-y-6">
              <StudentGameDashboard currentUser={currentUser} onPlayGame={setCurrentGame} />
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <div className="content-section">
                <h2 className="text-2xl font-bold text-royalPurple-text1 mb-4">My Achievements</h2>
                <p className="text-royalPurple-text2 mb-6">Badges and rewards you've earned</p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {dashboardData?.achievements_list?.length > 0 ? (
                    dashboardData.achievements_list.map((achievement) => (
                      <div key={achievement.id} className="stats-card p-6 text-center">
                        <div className="flex justify-center mb-4">
                          <Trophy
                            className="h-10 w-10 text-royalPurple-accent"
                            aria-hidden="true"
                          />
                        </div>
                        <h3 className="font-bold text-lg text-royalPurple-text1">
                          {achievement.name}
                        </h3>
                        <p className="text-royalPurple-text2 text-sm">{achievement.description}</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-royalPurple-success text-royalPurple-successTx rounded-full text-xs">
                          Earned {new Date(achievement.awardedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-4 text-center py-12">
                      <div className="flex justify-center mb-4">
                        <Trophy className="h-14 w-14 text-royalPurple-accent" aria-hidden="true" />
                      </div>
                      <h3 className="text-xl font-bold text-royalPurple-text1">
                        No Achievements Yet
                      </h3>
                      <p className="text-royalPurple-text2 mt-2">
                        Play games and complete lessons to earn badges.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Subjects Tab */}
          {activeTab === 'subjects' && (
            <div className="space-y-8">
              {/* My Subjects Section */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-royalPurple-text1 flex items-center">
                    <BookOpen className="h-6 w-6 mr-3 text-royalPurple-pillTx" />
                    My Subjects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-6">
                    {(dashboardData?.subject_performance || []).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {dashboardData.subject_performance.map((performance, index) => {
                          return (
                            <div
                              key={index}
                              className="p-6 bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-xl hover:bg-royalPurple-muted/80 transition-all duration-300 hover:scale-105 cursor-pointer"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-3">
                                  <BookOpen className="h-8 w-8 text-royalPurple-text1" />
                                </div>
                                <div
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    performance.avgScore >= 90
                                      ? 'bg-royalPurple-success/60 text-royalPurple-successTx border border-royalPurple-border/50'
                                      : performance.avgScore >= 80
                                        ? 'bg-royalPurple-accent/60 text-royalPurple-accentTx border border-royalPurple-border2/50'
                                        : performance.avgScore >= 70
                                          ? 'bg-warn/60 text-warn/20 border border-warn/50'
                                          : 'bg-royalPurple-danger/60 text-royalPurple-dangerTx border border-royalPurple-border/50'
                                  }`}
                                >
                                  Grade {performance.latestGrade}
                                </div>
                              </div>
                              <h3 className="text-royalPurple-text1 font-bold text-lg mb-2">
                                {performance.subject}
                              </h3>
                              <p className="text-royalPurple-text2 text-sm mb-4">
                                {performance.teacher}
                              </p>

                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-royalPurple-text2 text-sm">
                                    Average Score
                                  </span>
                                  <span className="text-royalPurple-text1 font-semibold">
                                    {performance.avgScore}%
                                  </span>
                                </div>
                                <div className="w-full bg-royalPurple-muted/60 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      performance.avgScore >= 90
                                        ? 'bg-royalPurple-success'
                                        : performance.avgScore >= 80
                                          ? 'bg-royalPurple-accent'
                                          : performance.avgScore >= 70
                                            ? 'bg-warn/100'
                                            : 'bg-royalPurple-danger'
                                    }`}
                                    style={{ width: `${Math.min(performance.avgScore, 100)}%` }}
                                  ></div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-royalPurple-text2 text-sm">
                                    Assessments
                                  </span>
                                  <span className="text-royalPurple-text1 font-semibold">
                                    {performance.assessments}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-6">
                          <BookOpen className="h-10 w-10 text-royalPurple-text1" />
                        </div>
                        <h3 className="text-royalPurple-text1 font-bold text-xl mb-2">
                          No Subjects Registered
                        </h3>
                        <p className="text-royalPurple-text2 mb-4">
                          Contact administrator to get started
                        </p>
                        <Button className="bg-gradient-to-r from-accent to-ink hover:from-accent hover:to-g-800 text-royalPurple-text1">
                          Contact Administrator
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Student Subjects - Detailed View */}
              <StudentSubjects studentData={dashboardData} />
            </div>
          )}

          {/* Learning Path Tab */}
          {activeTab === 'learning-path' && (
            <div className="space-y-6">
              <LearningPathPage />
            </div>
          )}
        </div>
      </DashboardLayout>
    </div>
  )
}
