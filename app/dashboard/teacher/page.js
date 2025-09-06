'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
// import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
// import TeacherAssignments from '@/components/dashboard/TeacherAssignments'
import { api } from '@/lib/api'
import {
  Users, BookOpen, ClipboardList, Calendar, Plus,
  TrendingUp, Target, Award, CheckCircle, AlertTriangle,
  BarChart3, User, School, Flag, Edit, Delete,
  FileText, GraduationCap, Menu, Library, Zap,
  Map, Layers, UserCheck, MessageSquare, Clock,
  PenTool, Eye, Brain, Heart, Users as HandshakeIcon, Rocket
} from 'lucide-react'
import Link from 'next/link'
import { SCHOOL_SUBJECTS, getSubjectsByIds } from '@/data/subjects'
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

export default function TeacherDashboard() {
  // Get current user data from auth context
  const { user: currentUser, isAuthenticated } = useAuth()

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
  }, [isAuthenticated])

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
  const [activeAdvancedTab, setActiveAdvancedTab] = useState('creative-teaching')

  // Enhanced dashboard statistics
  const [dashboardStats, setDashboardStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalAssessments: 0,
    totalResults: 0,
    totalGoals: 0,
    completedGoals: 0,
    averagePerformance: 0,
    attendanceRate: 0
  })



  // Performance data for charts - will be populated from API
  const [termPerformanceData, setTermPerformanceData] = useState({
    labels: [],
    datasets: []
  })

  const [subjectPerformanceData, setSubjectPerformanceData] = useState({
    labels: ['Mathematics', 'Physics', 'Computer Science'],
    datasets: [
      {
        label: 'Average Score',
        data: [82, 76, 88],
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(168, 85, 247, 0.7)',
        ],
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
      setTeachingSubjects(subjectObjects.map(subject => subject.name))
    } else {
      setTeachingSubjects([])
    }

    // Initialize with empty arrays - data will come from API
    setResults([])
    setHasResults(false)
    setTeacherClasses([])
    setTeacherGoals([])
  }, [currentUser])

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats().then(res => res.data),
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => api.getTeacherDashboard().then(res => res.data),
  })

  // Helper function to calculate grade color
  const getGradeColor = (grade) => {
    if (grade === 'A+' || grade === 'A') return 'text-green-600 bg-green-100'
    if (grade === 'B+' || grade === 'B') return 'text-blue-600 bg-blue-100'
    if (grade === 'C+' || grade === 'C') return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  // Placeholder functions for remaining features
  const renderAssessmentBuilder = () => (
    <div className="text-center py-12">
      <PenTool className="h-12 w-12 mx-auto text-purple-400 mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">Assessment Builder</h3>
      <p className="text-slate-300">Create comprehensive assessments with multiple question types and automated grading.</p>
    </div>
  )

  const renderLearningObjectives = () => (
    <div className="text-center py-12">
      <Target className="h-12 w-12 mx-auto text-purple-400 mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">Learning Objectives Tracker</h3>
      <p className="text-slate-300">Track curriculum objectives and standards alignment across all lessons.</p>
    </div>
  )

  const renderBehaviorManagement = () => (
    <div className="text-center py-12">
      <Eye className="h-12 w-12 mx-auto text-purple-400 mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">Behavior Management</h3>
      <p className="text-slate-300">Monitor student behavior patterns and implement intervention strategies.</p>
    </div>
  )

  const renderProfessionalCommunity = () => (
    <div className="text-center py-12">
      <Heart className="h-12 w-12 mx-auto text-purple-400 mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">Professional Learning Community</h3>
      <p className="text-slate-300">Connect with colleagues, share resources, and participate in professional development.</p>
    </div>
  )

  const renderMentorshipProgram = () => (
    <div className="text-center py-12">
      <HandshakeIcon className="h-12 w-12 mx-auto text-purple-400 mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">Mentorship Program</h3>
      <p className="text-slate-300">Manage mentoring relationships and track professional growth initiatives.</p>
    </div>
  )

  // Render Advanced Teacher Features based on active tab
  const renderAdvancedTeacherFeatures = () => {
    switch (activeAdvancedTab) {
      case 'creative-teaching':
        return <div className="p-4 text-white">Creative Teaching Hub - Coming Soon</div>
      case 'curriculum-mapping':
        return <div className="p-4 text-white">Curriculum Mapping - Coming Soon</div>
      case 'differentiated-instruction':
        return <div className="p-4 text-white">Differentiated Instruction - Coming Soon</div>
      case 'student-portfolios':
        return <div className="p-4 text-white">Student Portfolios - Coming Soon</div>
      case 'lesson-planning':
        return <div className="p-4 text-white">Lesson Planning - Coming Soon</div>
      case 'parent-conferences':
        return <div className="p-4 text-white">Parent Conferences - Coming Soon</div>
      case 'assessment-builder':
        return renderAssessmentBuilder()
      case 'learning-objectives':
        return renderLearningObjectives()
      case 'behavior-management':
        return renderBehaviorManagement()
      case 'professional-community':
        return renderProfessionalCommunity()
      case 'mentorship':
        return renderMentorshipProgram()
      default:
        return <div className="p-4 text-white">Advanced Features - Coming Soon</div>
    }
  }

  // Show loading if not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      <div className="p-6">
        <div className="space-y-8 relative z-10">
          {/* Enhanced Header */}
          <div className="backdrop-blur-lg bg-slate-800/60 border border-purple-500/40 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
                  Teacher Dashboard
                </h1>
                <p className="text-slate-300 text-lg">Manage your classes and track student progress</p>
                <p className="text-slate-400 text-sm mt-2">Welcome back, {currentUser?.name || 'Teacher'}!</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{new Date().getDate()}</div>
                  <div className="text-sm text-purple-200">{new Date().toLocaleDateString('en-US', { month: 'short' })}</div>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                  {currentUser?.name?.charAt(0) || 'T'}
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Information Card */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                <User className="h-6 w-6 mr-3 text-purple-400" />
                Teacher Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <User className="h-4 w-4 text-purple-400 mr-2" />
                      <span className="text-slate-300 text-sm font-medium">Full Name</span>
                    </div>
                    <p className="text-white font-semibold">{currentUser?.name}</p>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <BookOpen className="h-4 w-4 text-blue-400 mr-2" />
                      <span className="text-slate-300 text-sm font-medium">Teaching Subjects</span>
                    </div>
                    <p className="text-white font-semibold">{currentUser?.subjects?.length || 0} Subjects</p>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Users className="h-4 w-4 text-green-400 mr-2" />
                      <span className="text-slate-300 text-sm font-medium">Assigned Classes</span>
                    </div>
                    <p className="text-white font-semibold">{dashboardStats.totalClasses} Classes</p>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <School className="h-4 w-4 text-orange-400 mr-2" />
                      <span className="text-slate-300 text-sm font-medium">Total Students</span>
                    </div>
                    <p className="text-white font-semibold">{dashboardStats.totalStudents} Students</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="My Classes"
              value={dashboardStats.totalClasses}
              icon={Users}
              color="blue"
              description="Classes assigned to you"
              trend={{ isPositive: true, value: 2 }}
            />
            <StatsCard
              title="Total Students"
              value={dashboardStats.totalStudents}
              icon={School}
              color="green"
              description="Students under your guidance"
              trend={{ isPositive: true, value: 15 }}
            />
            <StatsCard
              title="My Assessments"
              value={dashboardStats.totalAssessments}
              icon={ClipboardList}
              color="yellow"
              description="Assessments created"
              trend={{ isPositive: true, value: 3 }}
            />
            <StatsCard
              title="Average Performance"
              value={`${dashboardStats.averagePerformance}%`}
              icon={TrendingUp}
              color="purple"
              description="Class average score"
              trend={{ isPositive: true, value: 2.5 }}
            />
          </div>

          {/* Advanced Teacher Features */}
          <div className="bg-red-500 p-4 text-white font-bold text-center mb-4">
            🚨 ADVANCED FEATURES TEST - IF YOU SEE THIS, THE SECTION IS RENDERING 🚨
          </div>
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                <Zap className="h-6 w-6 mr-3 text-yellow-400" />
                Advanced Teaching Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {/* Creative Teaching Tools */}
                  <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-400/30 rounded-xl p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-purple-500/30 rounded-lg flex items-center justify-center mr-3">
                        <BookOpen className="h-5 w-5 text-purple-300" />
                      </div>
                      <h4 className="font-semibold text-white">Creative Teaching Tools</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li>🎨 Interactive Lesson Builder</li>
                      <li>🔬 Virtual Lab Simulations</li>
                      <li>📊 Real-time Assessment Tools</li>
                      <li>🎯 Adaptive Content Delivery</li>
                    </ul>
                    <Button className="w-full mt-3 bg-purple-600/60 hover:bg-purple-600/80 text-white border border-purple-400/50">
                      Explore Tools
                    </Button>
                  </div>

                  {/* Student Analytics */}
                  <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-400/30 rounded-xl p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center mr-3">
                        <BarChart3 className="h-5 w-5 text-blue-300" />
                      </div>
                      <h4 className="font-semibold text-white">Student Analytics</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li>📈 Performance Tracking</li>
                      <li>🎯 Learning Gap Analysis</li>
                      <li>📊 Engagement Metrics</li>
                      <li>🔍 Predictive Insights</li>
                    </ul>
                    <Button className="w-full mt-3 bg-blue-600/60 hover:bg-blue-600/80 text-white border border-blue-400/50">
                      View Analytics
                    </Button>
                  </div>

                  {/* Collaboration Hub */}
                  <div className="bg-gradient-to-br from-green-600/20 to-teal-600/20 border border-green-400/30 rounded-xl p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-green-500/30 rounded-lg flex items-center justify-center mr-3">
                        <Users className="h-5 w-5 text-green-300" />
                      </div>
                      <h4 className="font-semibold text-white">Collaboration Hub</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li>👥 Teacher Communities</li>
                      <li>📚 Resource Sharing</li>
                      <li>💬 Parent Communication</li>
                      <li>🤝 Peer Mentoring</li>
                    </ul>
                    <Button className="w-full mt-3 bg-green-600/60 hover:bg-green-600/80 text-white border border-green-400/50">
                      Join Community
                    </Button>
                  </div>
                </div>

                {/* Implementation Status */}
                <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-400/30 rounded-xl p-4">
                  <h4 className="font-semibold text-white mb-3 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-orange-300" />
                    Advanced Features Implementation Status
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-300">Teacher Dashboard Features</span>
                        <span className="font-semibold text-orange-300">In Progress</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full" style={{width: '60%'}}></div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>✅ Student Features Complete</div>
                      <div>✅ Learning Enhancement Complete</div>
                      <div>✅ Cultural Integration Complete</div>
                      <div>🔄 Teacher Features (60% Complete)</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                <TrendingUp className="h-6 w-6 mr-3 text-green-400" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <Award className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="font-bold text-white text-lg">Class Average</h3>
                    <p className="text-3xl font-bold text-blue-400 mt-2">{dashboardStats.averagePerformance}%</p>
                    <p className="text-slate-300 text-sm mt-1">Above school average</p>
                  </div>
                  <div className="text-center">
                    <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="font-bold text-white text-lg">Attendance Rate</h3>
                    <p className="text-3xl font-bold text-green-400 mt-2">{dashboardStats.attendanceRate}%</p>
                    <p className="text-slate-300 text-sm mt-1">Excellent attendance</p>
                  </div>
                  <div className="text-center">
                    <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <Target className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="font-bold text-white text-lg">Goals Progress</h3>
                    <p className="text-3xl font-bold text-purple-400 mt-2">{dashboardStats.completedGoals}/{dashboardStats.totalGoals}</p>
                    <p className="text-slate-300 text-sm mt-1">Goals completed</p>
                  </div>
                  <div className="text-center">
                    <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="font-bold text-white text-lg">Total Results</h3>
                    <p className="text-3xl font-bold text-orange-400 mt-2">{dashboardStats.totalResults}</p>
                    <p className="text-slate-300 text-sm mt-1">Results recorded</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teaching Subjects */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center">
                <BookOpen className="h-6 w-6 mr-3 text-blue-400" />
                My Teaching Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                {(currentUser?.subjects || []).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(currentUser?.subjects || []).map((subject, index) => {
                      // Subject performance data will come from API
                      const data = { students: 0, avgScore: 0, assessments: 0, trend: '0%' }

                      return (
                        <div key={index} className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                          <div className="flex items-center justify-between mb-4">
                            <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-3">
                              <BookOpen className="h-8 w-8 text-white" />
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              data.avgScore >= 85 ? 'bg-green-600/60 text-green-100 border border-green-400/50' :
                              data.avgScore >= 75 ? 'bg-blue-600/60 text-blue-100 border border-blue-400/50' :
                              'bg-yellow-600/60 text-yellow-100 border border-yellow-400/50'
                            }`}>
                              {data.avgScore}% Avg
                            </div>
                          </div>
                          <h3 className="text-white font-bold text-lg mb-2">{subject}</h3>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300 text-sm">Students</span>
                              <span className="text-white font-semibold">{data.students}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300 text-sm">Assessments</span>
                              <span className="text-white font-semibold">{data.assessments}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300 text-sm">Trend</span>
                              <span className="text-green-400 font-semibold">{data.trend}</span>
                            </div>
                            <div className="w-full bg-slate-600/60 rounded-full h-2 mt-3">
                              <div
                                className={`h-2 rounded-full ${
                                  data.avgScore >= 85 ? 'bg-green-500' :
                                  data.avgScore >= 75 ? 'bg-blue-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${Math.min(data.avgScore, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-6">
                      <BookOpen className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-xl mb-2">No Subjects Assigned</h3>
                    <p className="text-slate-300 mb-4">Contact administrator to get teaching assignments</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* My Classes */}
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent flex items-center">
                  <Users className="h-6 w-6 mr-3 text-blue-400" />
                  My Classes
                </CardTitle>
                <Link href="/dashboard/teacher/classes">
                  <Button className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {teacherClasses.map((classItem) => (
                      <div key={classItem.id} className="flex items-center justify-between p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-colors duration-200">
                        <div className="flex items-center space-x-4">
                          <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-xl p-3">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{classItem.name}</h4>
                            <p className="text-slate-300 text-sm">{classItem.students} students • {classItem.subject}</p>
                            <p className="text-slate-400 text-xs">Attendance: {classItem.attendance}%</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{classItem.students}</div>
                          <div className="text-sm text-slate-300">Students</div>
                          <div className="w-20 bg-slate-600/60 rounded-full h-2 mt-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${classItem.attendance}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {teacherClasses.length === 0 && (
                      <div className="text-center py-8">
                        <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-white" />
                        </div>
                        <p className="text-slate-300">No classes assigned yet</p>
                        <p className="text-slate-400 text-sm mt-2">Contact administrator for class assignments</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                  <BarChart3 className="h-6 w-6 mr-3 text-green-400" />
                  Recent Results
                </CardTitle>
                <Link href="/dashboard/teacher/results">
                  <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {results.slice(0, 5).map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-colors duration-200">
                        <div className="flex items-center space-x-4">
                          <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-xl p-3">
                            <BarChart3 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{result.student}</h4>
                            <p className="text-slate-300 text-sm">{result.subject} - {result.assessment}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">{result.marks}/{result.totalMarks}</div>
                          <div className="text-lg font-semibold text-green-400">{Math.round((result.marks / result.totalMarks) * 100)}%</div>
                          <div className={`text-xs px-3 py-1 rounded-full font-medium ${getGradeColor(result.grade)}`}>
                            Grade {result.grade}
                          </div>
                        </div>
                      </div>
                    ))}
                    {results.length === 0 && (
                      <div className="text-center py-8">
                        <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <BarChart3 className="h-8 w-8 text-white" />
                        </div>
                        <p className="text-slate-300">No recent results</p>
                        <p className="text-slate-400 text-sm mt-2">Results will appear here after grading</p>
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
                Teaching Goals Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Goals List */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-4">Current Goals</h3>
                    {teacherGoals.map((goal) => (
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

          {/* Quick Actions */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center">
                <Plus className="h-6 w-6 mr-3 text-purple-400" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Link href="/dashboard/teacher/assessments/create">
                    <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Plus className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold text-center">Create Assessment</h3>
                      <p className="text-slate-300 text-sm text-center mt-2">Add new test or assignment</p>
                    </div>
                  </Link>
                  <Link href="/dashboard/teacher/results">
                    <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <BarChart3 className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold text-center">Grade Results</h3>
                      <p className="text-slate-300 text-sm text-center mt-2">Mark student work</p>
                    </div>
                  </Link>
                  <Link href="/dashboard/teacher/attendance">
                    <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-yellow-600/60 border border-yellow-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold text-center">Take Attendance</h3>
                      <p className="text-slate-300 text-sm text-center mt-2">Mark student presence</p>
                    </div>
                  </Link>
                  <Link href="/dashboard/teacher/reports">
                    <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <FileText className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold text-center">View Reports</h3>
                      <p className="text-slate-300 text-sm text-center mt-2">Performance analytics</p>
                    </div>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Recent Assessments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Assessments</CardTitle>
            <Link href="/dashboard/assessments/create">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Assessment
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Title</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Subject</th>
                    <th className="text-left py-2">Class</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Start Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData?.recent_assessments?.map((assessment) => (
                    <tr key={assessment.id} className="border-b">
                      <td className="py-2 font-medium">{assessment.title}</td>
                      <td className="py-2">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 capitalize">
                          {assessment.type}
                        </span>
                      </td>
                      <td className="py-2">{assessment.subject}</td>
                      <td className="py-2">{assessment.class}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                          assessment.status === 'published' 
                            ? 'bg-green-100 text-green-800'
                            : assessment.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {assessment.status}
                        </span>
                      </td>
                      <td className="py-2 text-sm text-gray-500">
                        {new Date(assessment.start_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!dashboardData?.recent_assessments || dashboardData.recent_assessments.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No assessments created yet</p>
                  <Link href="/dashboard/assessments/create">
                    <Button className="mt-2">Create Your First Assessment</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

          {/* Enhanced Teacher Information */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent flex items-center">
                <User className="h-6 w-6 mr-3 text-blue-400" />
                Teacher Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <User className="h-4 w-4 text-blue-400 mr-2" />
                      <span className="text-slate-300 text-sm font-medium">Name</span>
                    </div>
                    <p className="text-white font-semibold">{currentUser?.name}</p>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <School className="h-4 w-4 text-green-400 mr-2" />
                      <span className="text-slate-300 text-sm font-medium">Department</span>
                    </div>
                    <p className="text-white font-semibold">{currentUser?.department || 'Not assigned'}</p>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Flag className="h-4 w-4 text-purple-400 mr-2" />
                      <span className="text-slate-300 text-sm font-medium">TS Number</span>
                    </div>
                    <p className="text-white font-semibold">{currentUser?.tsNumber || 'Not assigned'}</p>
                  </div>
                  <div className="p-4 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center mb-2">
                      <User className="h-4 w-4 text-orange-400 mr-2" />
                      <span className="text-slate-300 text-sm font-medium">Contact</span>
                    </div>
                    <p className="text-white font-semibold">{currentUser?.contactNumber || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Teacher Dashboard Features */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center">
                <Brain className="h-6 w-6 mr-3 text-purple-400" />
                Advanced Teaching Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                {/* Advanced Features Navigation */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {[
                    { id: 'creative-teaching', label: 'Creative Teaching & STEM', icon: Rocket },
                    { id: 'curriculum-mapping', label: 'Curriculum Mapping', icon: Map },
                    { id: 'differentiated-instruction', label: 'Differentiated Instruction', icon: Layers },
                    { id: 'student-portfolios', label: 'Student Portfolios', icon: UserCheck },
                    { id: 'lesson-planning', label: 'Collaborative Lesson Planning', icon: Users },
                    { id: 'parent-conferences', label: 'Parent-Teacher Conferences', icon: MessageSquare },
                    { id: 'assessment-builder', label: 'Assessment Builder', icon: PenTool },
                    { id: 'learning-objectives', label: 'Learning Objectives', icon: Target },
                    { id: 'behavior-management', label: 'Behavior Management', icon: Eye },
                    { id: 'professional-community', label: 'Professional Community', icon: Heart },
                    { id: 'mentorship', label: 'Mentorship Program', icon: HandshakeIcon }
                  ].map((tab) => (
                    <Button
                      key={tab.id}
                      variant={activeAdvancedTab === tab.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveAdvancedTab(tab.id)}
                      className={`${
                        activeAdvancedTab === tab.id
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'text-slate-300 border-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      <tab.icon className="h-4 w-4 mr-2" />
                      {tab.label}
                    </Button>
                  ))}
                </div>

                {/* Advanced Features Content */}
                {renderAdvancedTeacherFeatures()}
              </div>
            </CardContent>
          </Card>

          {/* Teaching Management Overview */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                <Users className="h-6 w-6 mr-3 text-green-400" />
                My Teaching Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* My Classes Management */}
                  <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-bold text-lg flex items-center">
                        <Users className="h-5 w-5 mr-2 text-blue-400" />
                        My Classes
                      </h3>
                      <span className="text-slate-300 text-sm">{teacherClasses.length} classes</span>
                    </div>
                    <div className="space-y-3">
                      {teacherClasses.slice(0, 3).map((cls, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-600/40 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-lg p-2">
                              <Users className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-semibold text-sm">{cls.name}</p>
                              <p className="text-slate-300 text-xs">{cls.students} students</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 text-sm font-semibold">{cls.attendance}%</p>
                            <p className="text-slate-400 text-xs">attendance</p>
                          </div>
                        </div>
                      ))}
                      {teacherClasses.length > 3 && (
                        <p className="text-slate-300 text-sm text-center">+{teacherClasses.length - 3} more classes</p>
                      )}
                    </div>
                    <Button className="w-full mt-4 bg-blue-600/60 hover:bg-blue-600/80 text-white border border-blue-400/50">
                      View All Classes
                    </Button>
                  </div>

                  {/* Subject Management */}
                  <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-bold text-lg flex items-center">
                        <BookOpen className="h-5 w-5 mr-2 text-green-400" />
                        Subject Management
                      </h3>
                      <span className="text-slate-300 text-sm">{(currentUser?.subjects || ['Mathematics', 'Physics', 'Computer Science']).length} subjects</span>
                    </div>
                    <div className="space-y-3">
                      {(currentUser?.subjects || ['Mathematics', 'Physics', 'Computer Science']).slice(0, 3).map((subject, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-600/40 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-lg p-2">
                              <BookOpen className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-semibold text-sm">{subject}</p>
                              <p className="text-slate-300 text-xs">Active subject</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 text-sm font-semibold">Active</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full mt-4 bg-green-600/60 hover:bg-green-600/80 text-white border border-green-400/50">
                      Manage Subjects
                    </Button>
                  </div>

                  {/* Academic Goals */}
                  <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-bold text-lg flex items-center">
                        <Target className="h-5 w-5 mr-2 text-yellow-400" />
                        Academic Goals
                      </h3>
                      <span className="text-slate-300 text-sm">{dashboardStats.completedGoals}/{dashboardStats.totalGoals}</span>
                    </div>
                    <div className="space-y-3">
                      {teacherGoals.slice(0, 3).map((goal, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-600/40 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`backdrop-blur-md border rounded-lg p-2 ${
                              goal.status === 'completed'
                                ? 'bg-green-600/60 border-green-400/50'
                                : 'bg-yellow-600/60 border-yellow-400/50'
                            }`}>
                              {goal.status === 'completed' ? (
                                <CheckCircle className="h-4 w-4 text-white" />
                              ) : (
                                <Target className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div>
                              <p className="text-white font-semibold text-sm">{goal.title}</p>
                              <p className="text-slate-300 text-xs">{goal.progress}% complete</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              goal.status === 'completed'
                                ? 'bg-green-600/60 text-green-100 border border-green-400/50'
                                : 'bg-yellow-600/60 text-yellow-100 border border-yellow-400/50'
                            }`}>
                              {goal.status === 'completed' ? 'Done' : 'In Progress'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full mt-4 bg-yellow-600/60 hover:bg-yellow-600/80 text-white border border-yellow-400/50">
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
                <CardTitle className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent flex items-center">
                  <ClipboardList className="h-6 w-6 mr-3 text-orange-400" />
                  Upcoming Assessments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {/* No upcoming assessments */}
                    <div className="text-center py-8">
                      <ClipboardList className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No Upcoming Assessments</h3>
                      <p className="text-slate-300">Create your first assessment to get started</p>
                    </div>
                  </div>
                  <Button className="w-full mt-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">
                    Create Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Marking Progress */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center">
                  <BarChart3 className="h-6 w-6 mr-3 text-blue-400" />
                  Marking Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="space-y-4">
                    {/* No marking progress */}
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No Marking in Progress</h3>
                      <p className="text-slate-300">Create assessments to start marking student work</p>
                    </div>
                  </div>
                  <Button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                    Continue Marking
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Analytics */}
          {hasResults && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                  <TrendingUp className="h-6 w-6 mr-3 text-green-400" />
                  Teacher Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Performance Trends */}
                    <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                      <h3 className="text-white font-bold text-lg mb-4 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                        Performance Trends by Term
                      </h3>
                      <div className="h-64 flex items-center justify-center bg-slate-800/60 border border-slate-600/40 rounded-lg">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <p className="text-slate-300">Performance Chart</p>
                          <p className="text-slate-400 text-sm">Term comparison visualization</p>
                        </div>
                      </div>
                    </div>

                    {/* Subject Performance */}
                    <div className="p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl">
                      <h3 className="text-white font-bold text-lg mb-4 flex items-center">
                        <Award className="h-5 w-5 mr-2 text-blue-400" />
                        Subject Performance
                      </h3>
                      <div className="space-y-4">
                        {(currentUser?.subjects || ['Mathematics', 'Physics', 'Computer Science']).map((subject, index) => {
                          const performance = [82, 76, 88][index] || 75
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

          {/* Teaching Tools */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center">
                <Library className="h-6 w-6 mr-3 text-purple-400" />
                Teaching Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="backdrop-blur-sm bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Link href="/dashboard/teacher/assessments">
                    <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <ClipboardList className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold text-center">Manage Assessments</h3>
                      <p className="text-slate-300 text-sm text-center mt-2">Create and schedule assessments</p>
                    </div>
                  </Link>
                  <Link href="/dashboard/teacher/lesson-plans">
                    <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-green-600/60 border border-green-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold text-center">Lesson Planning</h3>
                      <p className="text-slate-300 text-sm text-center mt-2">Curriculum delivery</p>
                    </div>
                  </Link>
                  <Link href="/dashboard/teacher/results">
                    <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <BarChart3 className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold text-center">Record Results</h3>
                      <p className="text-slate-300 text-sm text-center mt-2">Enter assessment results</p>
                    </div>
                  </Link>
                  <Link href="/dashboard/teacher/schemes">
                    <div className="group p-6 bg-slate-700/60 border border-slate-600/40 rounded-xl hover:bg-slate-700/80 transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold text-center">Scheme of Work</h3>
                      <p className="text-slate-300 text-sm text-center mt-2">Curriculum planning</p>
                    </div>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teacher Assignments - Detailed View */}
          {/* <TeacherAssignments teacherData={dashboardData} /> */}
          <div className="p-4 bg-slate-800/60 rounded-lg text-white">
            Teacher Assignments - Coming Soon
          </div>

        </div>
      </div>
    </div>
  )
}
