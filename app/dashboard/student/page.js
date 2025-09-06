'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import StudentSubjects from '@/components/dashboard/StudentSubjects'
import StudentGameDashboard from '@/components/games/StudentGameDashboard'
import GamePlayer from '@/components/games/GamePlayer'
import AchievementSystem from '@/components/games/AchievementSystem'
import SmartDashboardIntegration from '@/components/dashboard/SmartDashboardIntegration'
import { api } from '@/lib/api'
import {
  BookOpen, ClipboardList, BarChart3, Calendar, Clock, Award,
  User, Phone, Mail, Home, TrendingUp, Target, Download,
  CheckCircle, Flag, Trophy, GamepadIcon, Zap, Crown, Rocket,
  TrendingUp as LearningPathIcon
} from 'lucide-react'
import Link from 'next/link'
import LearningPathPage from './learning-path/page'
import CreativeTeachingHub from '@/components/creative-teaching/CreativeTeachingHub'
import { SCHOOL_SUBJECTS, getSubjectsByIds } from '@/data/subjects'

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [currentGame, setCurrentGame] = useState(null)
  const [studentData, setStudentData] = useState({
    results: [],
    goals: [],
    studyMaterials: [],
    assessments: []
  })

  const [dashboardStats, setDashboardStats] = useState({
    totalSubjects: 0,
    totalResults: 0,
    averageGrade: 0,
    completedGoals: 0,
    totalGoals: 0,
    recentMaterials: 0
  })

  const [performanceData, setPerformanceData] = useState({
    labels: [],
    datasets: [{
      label: 'My Performance',
      data: [],
      backgroundColor: [],
      borderWidth: 1,
    }]
  })

  // Get current user data from auth context
  const { user: currentUser } = useAuth()

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats().then(res => res.data),
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => api.getStudentDashboard().then(res => res.data),
  })

  // Helper function to get achievement icon based on grade
  const getAchievementIcon = (grade) => {
    if (grade === 'A+' || grade === 'A' || grade === 'ONE' || grade === '1' || grade === '2') {
      return <Trophy className="h-4 w-4 text-yellow-500" />
    }
    return null
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
        <GamePlayer
          game={currentGame}
          onComplete={handleGameComplete}
          onExit={handleExitGame}
        />
      </DashboardLayout>
    )
  }

  return (
    <div className="dashboard-layout">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-blue-500/10 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-r from-blue-600/10 to-blue-700/10 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      <DashboardLayout title="Student Dashboard">
        <div className="space-y-8 relative z-10">
          {/* Enhanced Header */}
          <div className="content-section">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-4">
                  Welcome Back, {currentUser?.name?.split(' ')[0] || 'Student'}! 👋
                </h1>
                <p className="text-gray-600 text-lg">Track your academic progress and achievements</p>
              </div>
              {currentUser && (
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-4 text-center shadow-lg">
                    <div className="text-2xl font-bold">{new Date().getDate()}</div>
                    <div className="text-sm opacity-90">{new Date().toLocaleDateString('en-US', { month: 'short' })}</div>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {currentUser.name?.charAt(0) || 'S'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="tab-nav">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'creative-teaching', name: 'Creative Learning', icon: Rocket },
              { id: 'advanced', name: 'Advanced Features', icon: Zap },
              { id: 'analytics', name: 'Smart Analytics', icon: Zap },
              { id: 'games', name: 'Games & Learning', icon: GamepadIcon },
              { id: 'achievements', name: 'Achievements', icon: Trophy },
              { id: 'subjects', name: 'My Subjects', icon: BookOpen },
              { id: 'learning-path', name: 'Learning Path', icon: LearningPathIcon }
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Simplified Overview for Testing */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="stats-card p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Games</h3>
                  <p className="text-3xl font-bold text-blue-600">12</p>
                </div>
                <div className="stats-card p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
                  <p className="text-3xl font-bold text-green-600">8</p>
                </div>
                <div className="stats-card p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Level</h3>
                  <p className="text-3xl font-bold text-purple-600">5</p>
                </div>
                <div className="stats-card p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Points</h3>
                  <p className="text-3xl font-bold text-yellow-600">1250</p>
                </div>
              </div>

          {/* Student Information Card */}
          {currentUser && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center">
                  <User className="h-6 w-6 mr-3 text-blue-400" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                      <div className="flex items-center mb-2">
                        <User className="h-4 w-4 text-blue-400 mr-2" />
                        <span className="text-slate-300 text-sm font-medium">Full Name</span>
                      </div>
                      <p className="text-white font-semibold">{currentUser.name}</p>
                    </div>
                    <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                      <div className="flex items-center mb-2">
                        <Mail className="h-4 w-4 text-green-400 mr-2" />
                        <span className="text-slate-300 text-sm font-medium">Email Address</span>
                      </div>
                      <p className="text-white font-semibold">{currentUser.email || 'Not provided'}</p>
                    </div>
                    <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                      <div className="flex items-center mb-2">
                        <BookOpen className="h-4 w-4 text-purple-400 mr-2" />
                        <span className="text-slate-300 text-sm font-medium">Class</span>
                      </div>
                      <p className="text-white font-semibold">{currentUser.yearGroup || 'Not assigned'}</p>
                    </div>
                    <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                      <div className="flex items-center mb-2">
                        <Flag className="h-4 w-4 text-orange-400 mr-2" />
                        <span className="text-slate-300 text-sm font-medium">Exam Number</span>
                      </div>
                      <p className="text-white font-semibold">{currentUser.examNumber || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="My Subjects"
              value={dashboardStats.totalSubjects}
              icon={BookOpen}
              color="blue"
              description="Enrolled subjects"
              trend={{ isPositive: true, value: 2 }}
            />
            <StatsCard
              title="My Results"
              value={dashboardStats.totalResults}
              icon={BarChart3}
              color="green"
              description="Total results"
              trend={{ isPositive: true, value: 5 }}
            />
            <StatsCard
              title="Average Grade"
              value={`${dashboardStats.averageGrade.toFixed(1)}%`}
              icon={Award}
              color="purple"
              description="Overall performance"
              trend={{ isPositive: true, value: 3.2 }}
            />
            <StatsCard
              title="Goals Progress"
              value={`${dashboardStats.completedGoals}/${dashboardStats.totalGoals}`}
              icon={Target}
              color="yellow"
              description="Completed goals"
              trend={{ isPositive: true, value: 15 }}
            />
          </div>

          {/* Performance Overview Chart */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                <TrendingUp className="h-6 w-6 mr-3 text-green-400" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <Award className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="font-bold text-white text-lg">Overall Grade</h3>
                    <p className="text-3xl font-bold text-green-400 mt-2">B+</p>
                    <p className="text-slate-300 text-sm mt-1">Above Average</p>
                  </div>
                  <div className="text-center">
                    <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="font-bold text-white text-lg">Average Score</h3>
                    <p className="text-3xl font-bold text-blue-400 mt-2">{dashboardStats.averageGrade.toFixed(1)}%</p>
                    <p className="text-slate-300 text-sm mt-1">Last 5 assessments</p>
                  </div>
                  <div className="text-center">
                    <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="font-bold text-white text-lg">Attendance</h3>
                    <p className="text-3xl font-bold text-purple-400 mt-2">95%</p>
                    <p className="text-slate-300 text-sm mt-1">This semester</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* My Class Info */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center">
                  <BookOpen className="h-6 w-6 mr-3 text-blue-400" />
                  My Class Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  {dashboardData?.my_class ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-400/30 rounded-xl">
                        <h3 className="font-bold text-xl text-white">{dashboardData.my_class.name}</h3>
                        <p className="text-blue-200">Academic Year: {dashboardData.my_class.academic_year}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                          <span className="font-medium text-slate-300">Class ID:</span>
                          <p className="text-white font-semibold">{dashboardData.my_class.id}</p>
                        </div>
                        <div className="p-3 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                          <span className="font-medium text-slate-300">Status:</span>
                          <p className="text-green-400 font-semibold">Active</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-slate-300">No class assigned yet</p>
                      <p className="text-slate-400 text-sm mt-2">Contact your administrator</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Assessments */}
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                  <ClipboardList className="h-6 w-6 mr-3 text-green-400" />
                  Upcoming Assessments
                </CardTitle>
                <Link href="/dashboard/student/assessments">
                  <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {/* Mock upcoming assessments data */}
                    {[
                      { id: 1, title: 'Mathematics Mid-term', subject: 'Mathematics', type: 'exam', start_date: '2024-03-15', duration_minutes: 120 },
                      { id: 2, title: 'English Essay', subject: 'English', type: 'assignment', start_date: '2024-03-18', duration_minutes: 90 },
                      { id: 3, title: 'Science Lab Test', subject: 'Science', type: 'practical', start_date: '2024-03-20', duration_minutes: 60 }
                    ].map((assessment) => (
                      <div key={assessment.id} className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-colors duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-xl p-3">
                              <ClipboardList className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-white">{assessment.title}</h4>
                              <p className="text-slate-300 text-sm">{assessment.subject}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="px-3 py-1 text-xs rounded-full bg-blue-600/60 text-blue-100 border border-blue-400/50 capitalize font-medium">
                              {assessment.type}
                            </span>
                            <p className="text-slate-400 text-xs mt-1">
                              {new Date(assessment.start_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {assessment.duration_minutes && (
                          <div className="flex items-center mt-3 text-sm text-slate-300">
                            <Clock className="h-4 w-4 mr-2 text-blue-400" />
                            {assessment.duration_minutes} minutes
                          </div>
                        )}
                      </div>
                    ))}
                    {(!dashboardData?.upcoming_assessments || dashboardData.upcoming_assessments.length === 0) && (
                      <div className="text-center py-8">
                        <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <ClipboardList className="h-8 w-8 text-white" />
                        </div>
                        <p className="text-slate-300">No upcoming assessments</p>
                        <p className="text-slate-400 text-sm mt-2">Check back later for new assessments</p>
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
              <CardTitle className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent flex items-center">
                <Target className="h-6 w-6 mr-3 text-yellow-400" />
                My Goals Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Goals Overview */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-4">Academic Goals</h3>
                    {[
                      { id: 1, title: 'Improve Math Grade to A', progress: 75, status: 'in-progress' },
                      { id: 2, title: 'Complete Science Project', progress: 90, status: 'near-completion' },
                      { id: 3, title: 'Read 5 Books This Term', progress: 60, status: 'in-progress' },
                      { id: 4, title: 'Perfect Attendance', progress: 100, status: 'completed' }
                    ].map((goal) => (
                      <div key={goal.id} className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-white text-sm">{goal.title}</h4>
                          {goal.status === 'completed' && (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          )}
                        </div>
                        <div className="w-full bg-slate-600/60 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full ${
                              goal.progress === 100 ? 'bg-green-500' :
                              goal.progress >= 75 ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${goal.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-slate-300 text-xs">{goal.progress}% Complete</p>
                      </div>
                    ))}
                  </div>

                  {/* Goals Stats */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-4">Progress Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-400/30 rounded-xl text-center">
                        <div className="text-2xl font-bold text-green-400">{dashboardStats.completedGoals}</div>
                        <div className="text-slate-300 text-sm">Completed</div>
                      </div>
                      <div className="p-4 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-400/30 rounded-xl text-center">
                        <div className="text-2xl font-bold text-yellow-400">{dashboardStats.totalGoals - dashboardStats.completedGoals}</div>
                        <div className="text-slate-300 text-sm">In Progress</div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl text-center">
                      <div className="text-3xl font-bold text-white mb-2">
                        {Math.round((dashboardStats.completedGoals / dashboardStats.totalGoals) * 100)}%
                      </div>
                      <div className="text-slate-300">Overall Progress</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Subjects Section */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                <BookOpen className="h-6 w-6 mr-3 text-purple-400" />
                My Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                {(currentUser?.subjects || ['Mathematics', 'English', 'Science', 'History', 'Geography', 'Computer Science']).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(currentUser?.subjects || ['Mathematics', 'English', 'Science', 'History', 'Geography', 'Computer Science']).map((subject, index) => {
                      // Mock subject performance data
                      const subjectPerformance = {
                        'Mathematics': { avgScore: 85, assessments: 8, latestGrade: 'A', teacher: 'Mr. Johnson' },
                        'English': { avgScore: 78, assessments: 6, latestGrade: 'B+', teacher: 'Ms. Smith' },
                        'Science': { avgScore: 92, assessments: 7, latestGrade: 'A+', teacher: 'Dr. Brown' },
                        'History': { avgScore: 76, assessments: 5, latestGrade: 'B', teacher: 'Mr. Davis' },
                        'Geography': { avgScore: 88, assessments: 6, latestGrade: 'A', teacher: 'Ms. Wilson' },
                        'Computer Science': { avgScore: 94, assessments: 9, latestGrade: 'A+', teacher: 'Mr. Tech' }
                      }

                      const performance = subjectPerformance[subject] || { avgScore: 75, assessments: 5, latestGrade: 'B', teacher: 'Teacher' }

                      return (
                        <div key={index} className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                          <div className="flex items-center justify-between mb-4">
                            <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-3">
                              <BookOpen className="h-8 w-8 text-white" />
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              performance.avgScore >= 90 ? 'bg-green-600/60 text-green-100 border border-green-400/50' :
                              performance.avgScore >= 80 ? 'bg-blue-600/60 text-blue-100 border border-blue-400/50' :
                              performance.avgScore >= 70 ? 'bg-yellow-600/60 text-yellow-100 border border-yellow-400/50' :
                              'bg-red-600/60 text-red-100 border border-red-400/50'
                            }`}>
                              Grade {performance.latestGrade}
                            </div>
                          </div>
                          <h3 className="text-white font-bold text-lg mb-2">{subject}</h3>
                          <p className="text-slate-300 text-sm mb-4">{performance.teacher}</p>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300 text-sm">Average Score</span>
                              <span className="text-white font-semibold">{performance.avgScore}%</span>
                            </div>
                            <div className="w-full bg-slate-600/60 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  performance.avgScore >= 90 ? 'bg-green-500' :
                                  performance.avgScore >= 80 ? 'bg-blue-500' :
                                  performance.avgScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(performance.avgScore, 100)}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300 text-sm">Assessments</span>
                              <span className="text-white font-semibold">{performance.assessments}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-6">
                      <BookOpen className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-xl mb-2">No Subjects Registered</h3>
                    <p className="text-slate-300 mb-4">Contact administrator to get started</p>
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
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
              <CardTitle className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent flex items-center">
                <BarChart3 className="h-6 w-6 mr-3 text-blue-400" />
                Recent Results
              </CardTitle>
              <Link href="/dashboard/student/results">
                <Button className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white">
                  View All Results
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="space-y-4">
                  {/* Mock recent results data */}
                  {[
                    { id: 1, subject: 'Mathematics', assessment: 'Mid-term Exam', marks_obtained: 85, total_marks: 100, percentage: 85, grade: 'A' },
                    { id: 2, subject: 'English', assessment: 'Essay Assignment', marks_obtained: 78, total_marks: 100, percentage: 78, grade: 'B+' },
                    { id: 3, subject: 'Science', assessment: 'Lab Report', marks_obtained: 92, total_marks: 100, percentage: 92, grade: 'A+' },
                    { id: 4, subject: 'History', assessment: 'Research Project', marks_obtained: 76, total_marks: 100, percentage: 76, grade: 'B' },
                    { id: 5, subject: 'Geography', assessment: 'Map Analysis', marks_obtained: 88, total_marks: 100, percentage: 88, grade: 'A' }
                  ].map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-colors duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-xl p-3">
                          <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{result.subject}</h4>
                          <p className="text-slate-300 text-sm">{result.assessment}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">{result.marks_obtained}/{result.total_marks}</div>
                        <div className="text-lg font-semibold text-blue-400">{result.percentage}%</div>
                        <div className={`text-xs px-3 py-1 rounded-full font-medium flex items-center ${
                          result.grade === 'A+' || result.grade === 'A'
                            ? 'bg-green-600/60 text-green-100 border border-green-400/50'
                            : result.grade === 'B+' || result.grade === 'B'
                            ? 'bg-blue-600/60 text-blue-100 border border-blue-400/50'
                            : result.grade === 'C+' || result.grade === 'C'
                            ? 'bg-yellow-600/60 text-yellow-100 border border-yellow-400/50'
                            : 'bg-red-600/60 text-red-100 border border-red-400/50'
                        }`}>
                          Grade {result.grade}
                          {getAchievementIcon(result.grade) && (
                            <span className="ml-1">{getAchievementIcon(result.grade)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!dashboardData?.recent_results || dashboardData.recent_results.length === 0) && (
                    <div className="text-center py-8">
                      <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-slate-300">No results available yet</p>
                      <p className="text-slate-400 text-sm mt-2">Results will appear here after assessments are graded</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center">
                <Target className="h-6 w-6 mr-3 text-purple-400" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Link href="/dashboard/student/assessments">
                    <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <ClipboardList className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold text-center">View Assessments</h3>
                      <p className="text-slate-300 text-sm text-center mt-2">Check upcoming tests</p>
                    </div>
                  </Link>
                  <Link href="/dashboard/student/results">
                    <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <BarChart3 className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold text-center">Check Results</h3>
                      <p className="text-slate-300 text-sm text-center mt-2">View your grades</p>
                    </div>
                  </Link>
                  <Link href="/dashboard/student/goals">
                    <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-yellow-600/60 border border-yellow-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Target className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold text-center">My Goals</h3>
                      <p className="text-slate-300 text-sm text-center mt-2">Track progress</p>
                    </div>
                  </Link>
                  <Link href="/dashboard/student/subjects">
                    <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold text-center">My Subjects</h3>
                      <p className="text-slate-300 text-sm text-center mt-2">Subject details</p>
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
                <CardTitle className="bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent flex items-center">
                  <Download className="h-6 w-6 mr-3 text-green-400" />
                  Study Materials
                </CardTitle>
                <Button className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white">
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {/* Mock study materials */}
                    {[
                      { id: 1, title: 'Algebra Fundamentals', subject: 'Mathematics', type: 'PDF', size: '2.5 MB' },
                      { id: 2, title: 'Shakespeare Analysis', subject: 'English', type: 'Document', size: '1.8 MB' },
                      { id: 3, title: 'Chemistry Lab Manual', subject: 'Science', type: 'PDF', size: '4.2 MB' },
                      { id: 4, title: 'World War II Timeline', subject: 'History', type: 'Presentation', size: '3.1 MB' }
                    ].map((material) => (
                      <div key={material.id} className="flex items-center p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-colors duration-200 cursor-pointer">
                        <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-xl p-3 mr-4">
                          <Download className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{material.title}</h4>
                          <p className="text-slate-300 text-sm">{material.subject} • {material.type}</p>
                          <p className="text-slate-400 text-xs">{material.size}</p>
                        </div>
                        <Button size="sm" className="bg-green-600/60 hover:bg-green-600/80 text-white border border-green-400/50">
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 text-center">
                    <p className="text-slate-300 text-sm">{dashboardStats.recentMaterials} materials available</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assessment Schedule Detail */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent flex items-center">
                  <ClipboardList className="h-6 w-6 mr-3 text-orange-400" />
                  Assessment Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {/* Mock upcoming assessments */}
                    {[
                      { id: 1, title: 'Mathematics Final Exam', subject: 'Mathematics', dueDate: '2024-03-25', type: 'Exam', duration: '2 hours' },
                      { id: 2, title: 'English Essay Submission', subject: 'English', dueDate: '2024-03-22', type: 'Assignment', duration: '1 week' },
                      { id: 3, title: 'Science Lab Practical', subject: 'Science', dueDate: '2024-03-28', type: 'Practical', duration: '1.5 hours' },
                      { id: 4, title: 'History Research Project', subject: 'History', dueDate: '2024-03-30', type: 'Project', duration: '2 weeks' }
                    ].map((assessment) => (
                      <div key={assessment.id} className="p-4 bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-400/30 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-xl p-2">
                              <ClipboardList className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-white text-sm">{assessment.title}</h4>
                              <p className="text-orange-200 text-xs">{assessment.subject}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="px-2 py-1 bg-orange-600/60 text-orange-100 border border-orange-400/50 rounded-full text-xs font-medium">
                              {assessment.type}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-orange-200">Due: {new Date(assessment.dueDate).toLocaleDateString()}</span>
                          <span className="text-orange-200">Duration: {assessment.duration}</span>
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
              <CardTitle className="bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent flex items-center">
                <Phone className="h-6 w-6 mr-3 text-red-400" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Mock emergency contact data */}
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <User className="h-4 w-4 text-red-400 mr-2" />
                      <span className="text-slate-300 text-sm font-medium">Full Name</span>
                    </div>
                    <p className="text-white font-semibold">Mrs. Jane Smith</p>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <User className="h-4 w-4 text-green-400 mr-2" />
                      <span className="text-slate-300 text-sm font-medium">Relationship</span>
                    </div>
                    <p className="text-white font-semibold">Mother</p>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Phone className="h-4 w-4 text-blue-400 mr-2" />
                      <span className="text-slate-300 text-sm font-medium">Phone Number</span>
                    </div>
                    <p className="text-white font-semibold">+1 (555) 123-4567</p>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Home className="h-4 w-4 text-purple-400 mr-2" />
                      <span className="text-slate-300 text-sm font-medium">Location</span>
                    </div>
                    <p className="text-white font-semibold">Downtown, City Center</p>
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
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      <Zap className="w-6 h-6 text-yellow-500 mr-2" />
                      Advanced Educational Features
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Digital Library • Learning Paths • Study Tools • Cultural Integration
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4">🎓 Advanced Educational Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">📚 Digital Library</h4>
                    <p className="text-blue-700 text-sm">Access thousands of books offline</p>
                    <button className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                      Open Library
                    </button>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2">👥 Study Groups</h4>
                    <p className="text-green-700 text-sm">Join peer learning groups</p>
                    <button className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                      Find Groups
                    </button>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-2">🧠 Learning Paths</h4>
                    <p className="text-purple-700 text-sm">Adaptive learning routes</p>
                    <button className="mt-2 bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700">
                      Start Learning
                    </button>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-900 mb-2">🎯 Goal Setting</h4>
                    <p className="text-yellow-700 text-sm">Track academic goals</p>
                    <button className="mt-2 bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700">
                      Set Goals
                    </button>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-900 mb-2">📝 Study Tools</h4>
                    <p className="text-red-700 text-sm">Flashcards, notes, calculators</p>
                    <button className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                      Open Tools
                    </button>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h4 className="font-semibold text-indigo-900 mb-2">🌍 Cultural Learning</h4>
                    <p className="text-indigo-700 text-sm">Zambian history & languages</p>
                    <button className="mt-2 bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700">
                      Explore Culture
                    </button>
                  </div>
                </div>

                <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">✨ Recently Implemented Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h5 className="font-semibold text-gray-900 mb-2">🎓 Advanced Student Features</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>✅ Digital Library System</li>
                        <li>✅ Peer Study Groups</li>
                        <li>✅ Learning Style Assessment</li>
                        <li>✅ Academic Goal Setting</li>
                        <li>✅ Homework Reminders</li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h5 className="font-semibold text-gray-900 mb-2">🧠 Learning Enhancement</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>✅ Adaptive Learning Paths</li>
                        <li>✅ Concept Mapping Tools</li>
                        <li>✅ Flashcard Creator</li>
                        <li>✅ Practice Test Generator</li>
                        <li>✅ Learning Analytics</li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h5 className="font-semibold text-gray-900 mb-2">🌍 Cultural Integration</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>✅ Local History Module</li>
                        <li>✅ Traditional Knowledge Library</li>
                        <li>✅ Community Heroes Database</li>
                        <li>✅ Environmental Education</li>
                        <li>✅ Language Learning Center</li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h5 className="font-semibold text-gray-900 mb-2">📊 Progress Tracking</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>✅ Study Time Tracker</li>
                        <li>✅ Subject Calculators</li>
                        <li>✅ Digital Notebook System</li>
                        <li>✅ Research Project Manager</li>
                        <li>✅ Performance Analytics</li>
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
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      <Zap className="w-6 h-6 text-yellow-500 mr-2" />
                      Smart Analytics Dashboard
                    </h2>
                    <p className="text-gray-600 mt-1">
                      AI-powered insights • Performance tracking • Predictive analytics
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => window.open('/test-pwa.html', '_blank')}
                      className="btn-secondary btn-sm"
                    >
                      <Crown className="w-4 h-4 mr-1" />
                      Test PWA
                    </Button>
                    <Button
                      onClick={() => window.open('/test-reports.html', '_blank')}
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
                  name: currentUser?.name || 'Student',
                  studentId: currentUser?.studentId || '',
                  class: currentUser?.yearGroup || '',
                  totalPoints: 0,
                  attendance: [],
                  grades: [],
                  assignments: [],
                  recentActivities: []
                }}
                studentData={[]} // Will be populated from API
                classData={{
                  name: currentUser?.yearGroup || '',
                  teacher: '',
                  studentCount: 0,
                  subjects: []
                }}
              />
            </div>
          )}

          {/* Games Tab */}
          {activeTab === 'games' && (
            <div className="space-y-6">
              <div className="content-section">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">🎮 Educational Games</h2>
                <p className="text-gray-600 mb-6">Play interactive games to learn and earn points!</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="stats-card p-6 text-center">
                    <div className="text-4xl mb-4">❓</div>
                    <h3 className="font-bold text-lg text-gray-900">Math Quiz</h3>
                    <p className="text-gray-600 text-sm mb-4">Test your algebra skills</p>
                    <button className="btn-primary w-full">Play Now</button>
                  </div>

                  <div className="stats-card p-6 text-center">
                    <div className="text-4xl mb-4">📚</div>
                    <h3 className="font-bold text-lg text-gray-900">English Flashcards</h3>
                    <p className="text-gray-600 text-sm mb-4">Learn new vocabulary</p>
                    <button className="btn-primary w-full">Play Now</button>
                  </div>

                  <div className="stats-card p-6 text-center">
                    <div className="text-4xl mb-4">🔗</div>
                    <h3 className="font-bold text-lg text-gray-900">Science Matching</h3>
                    <p className="text-gray-600 text-sm mb-4">Match elements and symbols</p>
                    <button className="btn-primary w-full">Play Now</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <div className="content-section">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">🏆 My Achievements</h2>
                <p className="text-gray-600 mb-6">Badges and rewards you've earned</p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="stats-card p-6 text-center">
                    <div className="text-4xl mb-4">🎯</div>
                    <h3 className="font-bold text-lg text-gray-900">First Steps</h3>
                    <p className="text-gray-600 text-sm">Complete your first game</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">Earned</span>
                  </div>

                  <div className="stats-card p-6 text-center">
                    <div className="text-4xl mb-4">⭐</div>
                    <h3 className="font-bold text-lg text-gray-900">Perfect Score</h3>
                    <p className="text-gray-600 text-sm">Get 100% on any game</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">Earned</span>
                  </div>

                  <div className="stats-card p-6 text-center opacity-50">
                    <div className="text-4xl mb-4">👑</div>
                    <h3 className="font-bold text-lg text-gray-900">Game Master</h3>
                    <p className="text-gray-600 text-sm">Play 50 games</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">23/50</span>
                  </div>

                  <div className="stats-card p-6 text-center opacity-50">
                    <div className="text-4xl mb-4">🔥</div>
                    <h3 className="font-bold text-lg text-gray-900">Streak Master</h3>
                    <p className="text-gray-600 text-sm">10-day streak</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">5/10</span>
                  </div>
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
                  <CardTitle className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                    <BookOpen className="h-6 w-6 mr-3 text-purple-400" />
                    My Subjects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                    {currentUser.subjects && currentUser.subjects.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentUser.subjects.map((subject, index) => {
                          // Mock subject performance data
                          const subjectPerformance = {
                            'Mathematics': { avgScore: 85, assessments: 8, latestGrade: 'A', teacher: 'Mr. Johnson' },
                            'English': { avgScore: 78, assessments: 6, latestGrade: 'B+', teacher: 'Ms. Smith' },
                            'Science': { avgScore: 92, assessments: 7, latestGrade: 'A+', teacher: 'Dr. Brown' },
                            'History': { avgScore: 76, assessments: 5, latestGrade: 'B', teacher: 'Mr. Davis' },
                            'Geography': { avgScore: 88, assessments: 6, latestGrade: 'A', teacher: 'Ms. Wilson' },
                            'Computer Science': { avgScore: 94, assessments: 9, latestGrade: 'A+', teacher: 'Mr. Tech' }
                          }

                          const performance = subjectPerformance[subject] || { avgScore: 75, assessments: 5, latestGrade: 'B', teacher: 'Teacher' }

                          return (
                            <div key={index} className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                              <div className="flex items-center justify-between mb-4">
                                <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-3">
                                  <BookOpen className="h-8 w-8 text-white" />
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  performance.avgScore >= 90 ? 'bg-green-600/60 text-green-100 border border-green-400/50' :
                                  performance.avgScore >= 80 ? 'bg-blue-600/60 text-blue-100 border border-blue-400/50' :
                                  performance.avgScore >= 70 ? 'bg-yellow-600/60 text-yellow-100 border border-yellow-400/50' :
                                  'bg-red-600/60 text-red-100 border border-red-400/50'
                                }`}>
                                  Grade {performance.latestGrade}
                                </div>
                              </div>
                              <h3 className="text-white font-bold text-lg mb-2">{subject}</h3>
                              <p className="text-slate-300 text-sm mb-4">{performance.teacher}</p>

                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300 text-sm">Average Score</span>
                                  <span className="text-white font-semibold">{performance.avgScore}%</span>
                                </div>
                                <div className="w-full bg-slate-600/60 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      performance.avgScore >= 90 ? 'bg-green-500' :
                                      performance.avgScore >= 80 ? 'bg-blue-500' :
                                      performance.avgScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(performance.avgScore, 100)}%` }}
                                  ></div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300 text-sm">Assessments</span>
                                  <span className="text-white font-semibold">{performance.assessments}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-6">
                          <BookOpen className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2">No Subjects Registered</h3>
                        <p className="text-slate-300 mb-4">Contact administrator to get started</p>
                        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
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
