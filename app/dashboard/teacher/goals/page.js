'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  Target, Plus, TrendingUp, Award, Calendar, CheckCircle,
  ArrowLeft, Search, Filter, Edit, Trash2, Clock
} from 'lucide-react'
import Link from 'next/link'

export default function TeacherGoalsPage() {
  const [activeTab, setActiveTab] = useState('professional')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Sample professional development goals
  const professionalGoals = [
    {
      id: 1,
      title: 'Complete Advanced Mathematics Pedagogy Course',
      category: 'Professional Development',
      description: 'Enroll in and complete the advanced mathematics teaching methodology course',
      targetDate: '2024-06-30',
      progress: 65,
      status: 'in_progress',
      priority: 'high',
      activities: [
        { name: 'Module 1: Modern Teaching Methods', completed: true },
        { name: 'Module 2: Technology Integration', completed: true },
        { name: 'Module 3: Assessment Strategies', completed: false },
        { name: 'Module 4: Differentiated Learning', completed: false }
      ]
    },
    {
      id: 2,
      title: 'Improve Student Engagement by 20%',
      category: 'Teaching Excellence',
      description: 'Implement interactive teaching methods to increase student participation',
      targetDate: '2024-05-15',
      progress: 80,
      status: 'in_progress',
      priority: 'high',
      activities: [
        { name: 'Research interactive methods', completed: true },
        { name: 'Implement gamification', completed: true },
        { name: 'Measure engagement metrics', completed: true },
        { name: 'Analyze and adjust strategies', completed: false }
      ]
    },
    {
      id: 3,
      title: 'Obtain Digital Teaching Certification',
      category: 'Certification',
      description: 'Complete certification in digital teaching tools and online pedagogy',
      targetDate: '2024-08-31',
      progress: 30,
      status: 'in_progress',
      priority: 'medium',
      activities: [
        { name: 'Register for certification program', completed: true },
        { name: 'Complete online modules', completed: false },
        { name: 'Practical assessment', completed: false },
        { name: 'Final examination', completed: false }
      ]
    }
  ]

  // Sample student goals
  const studentGoals = [
    {
      id: 4,
      title: 'Increase Class 9A Average to 85%',
      category: 'Student Achievement',
      description: 'Improve overall class performance through targeted interventions',
      targetDate: '2024-04-30',
      progress: 70,
      status: 'in_progress',
      priority: 'high',
      currentAverage: 82,
      targetAverage: 85,
      studentsImproved: 18,
      totalStudents: 28
    },
    {
      id: 5,
      title: 'Reduce Failing Students to Zero',
      category: 'Student Support',
      description: 'Provide additional support to struggling students',
      targetDate: '2024-03-31',
      progress: 90,
      status: 'in_progress',
      priority: 'high',
      currentFailing: 1,
      targetFailing: 0,
      interventions: 15,
      successRate: 93
    },
    {
      id: 6,
      title: 'Improve Homework Completion Rate',
      category: 'Student Engagement',
      description: 'Increase homework submission rate across all classes',
      targetDate: '2024-05-31',
      progress: 45,
      status: 'in_progress',
      priority: 'medium',
      currentRate: 78,
      targetRate: 90,
      strategies: 5,
      classesImproved: 2
    }
  ]

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />
      case 'pending': return <Target className="h-4 w-4 text-yellow-500" />
      case 'overdue': return <Target className="h-4 w-4 text-red-500" />
      default: return <Target className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Professional Development': return 'bg-purple-100 text-purple-800'
      case 'Teaching Excellence': return 'bg-blue-100 text-blue-800'
      case 'Certification': return 'bg-green-100 text-green-800'
      case 'Student Achievement': return 'bg-orange-100 text-orange-800'
      case 'Student Support': return 'bg-red-100 text-red-800'
      case 'Student Engagement': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const currentGoals = activeTab === 'professional' ? professionalGoals : studentGoals

  const goalStats = {
    totalGoals: professionalGoals.length + studentGoals.length,
    completedGoals: [...professionalGoals, ...studentGoals].filter(goal => goal.status === 'completed').length,
    inProgressGoals: [...professionalGoals, ...studentGoals].filter(goal => goal.status === 'in_progress').length,
    averageProgress: Math.round([...professionalGoals, ...studentGoals].reduce((sum, goal) => sum + goal.progress, 0) / (professionalGoals.length + studentGoals.length))
  }

  return (
    <DashboardLayout title="Professional Development & Goals">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/teacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Target className="h-6 w-6 mr-2" />
                Professional Development & Goals
              </h1>
              <p className="text-gray-600">Track your professional growth and student achievement goals</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Progress Report
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Set New Goal
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Goals</p>
                  <p className="text-2xl font-bold text-gray-900">{goalStats.totalGoals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{goalStats.completedGoals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{goalStats.inProgressGoals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{goalStats.averageProgress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                <Button
                  variant={activeTab === 'professional' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('professional')}
                >
                  <Award className="h-4 w-4 mr-2" />
                  Professional Goals ({professionalGoals.length})
                </Button>
                <Button
                  variant={activeTab === 'student' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('student')}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Student Goals ({studentGoals.length})
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search goals..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {currentGoals.map((goal) => (
                <div key={goal.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 mr-3">{goal.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(goal.category)}`}>
                          {goal.category}
                        </span>
                        <span className={`ml-2 px-2 py-1 text-xs rounded border ${getPriorityColor(goal.priority)}`}>
                          {goal.priority} priority
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{goal.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          {getStatusIcon(goal.status)}
                          <span className={`ml-2 px-2 py-1 text-xs rounded ${getStatusColor(goal.status)}`}>
                            {goal.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm font-bold text-blue-600">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-500 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Goal-specific content */}
                  {activeTab === 'professional' && goal.activities && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Activities:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {goal.activities.map((activity, index) => (
                          <div key={index} className={`flex items-center p-2 rounded ${
                            activity.completed ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-700'
                          }`}>
                            {activity.completed ? 
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> :
                              <Clock className="h-4 w-4 mr-2 text-gray-400" />
                            }
                            <span className="text-sm">{activity.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'student' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Metrics:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {goal.currentAverage && (
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-600">Current Average</p>
                            <p className="text-lg font-bold text-blue-800">{goal.currentAverage}%</p>
                          </div>
                        )}
                        {goal.targetAverage && (
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-600">Target Average</p>
                            <p className="text-lg font-bold text-green-800">{goal.targetAverage}%</p>
                          </div>
                        )}
                        {goal.studentsImproved && (
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <p className="text-sm text-purple-600">Students Improved</p>
                            <p className="text-lg font-bold text-purple-800">{goal.studentsImproved}/{goal.totalStudents}</p>
                          </div>
                        )}
                        {goal.successRate && (
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <p className="text-sm text-orange-600">Success Rate</p>
                            <p className="text-lg font-bold text-orange-800">{goal.successRate}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Goal Management Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Goal Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Set New Goal
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Target className="h-4 w-4 mr-2" />
                  Goal Templates
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Progress Analytics
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Goal Calendar
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Award className="h-4 w-4 mr-2" />
                  Achievement History
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-1">Goal Milestone Reached</h4>
                  <p className="text-sm text-green-700">Student Engagement improved by 15%</p>
                  <p className="text-xs text-green-600 mt-1">3 days ago</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-1">Course Module Completed</h4>
                  <p className="text-sm text-blue-700">Advanced Mathematics Pedagogy - Module 2</p>
                  <p className="text-xs text-blue-600 mt-1">1 week ago</p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-1">Student Achievement</h4>
                  <p className="text-sm text-purple-700">Class 9A average increased to 82%</p>
                  <p className="text-xs text-purple-600 mt-1">2 weeks ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
