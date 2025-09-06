'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Target, Plus, TrendingUp, Award, Calendar, CheckCircle, Clock,
  ArrowLeft, Search, Filter, Edit, Trash2, Star
} from 'lucide-react'
import Link from 'next/link'

export default function StudentGoalsPage() {
  const [activeTab, setActiveTab] = useState('academic')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Sample student goals data
  const studentGoals = {
    academic: [
      {
        id: 1,
        title: 'Achieve A Grade in Mathematics',
        category: 'Academic Excellence',
        description: 'Improve mathematics performance to achieve an A grade by end of term',
        targetDate: '2024-03-31',
        progress: 75,
        status: 'in_progress',
        priority: 'high',
        currentGrade: 'B+',
        targetGrade: 'A',
        milestones: [
          { name: 'Complete algebra practice', completed: true },
          { name: 'Score 90% on next test', completed: true },
          { name: 'Master trigonometry', completed: false },
          { name: 'Final exam preparation', completed: false }
        ]
      },
      {
        id: 2,
        title: 'Improve Science Lab Skills',
        category: 'Practical Skills',
        description: 'Enhance laboratory techniques and experimental procedures',
        targetDate: '2024-04-15',
        progress: 60,
        status: 'in_progress',
        priority: 'medium',
        currentLevel: 'Intermediate',
        targetLevel: 'Advanced',
        milestones: [
          { name: 'Complete safety training', completed: true },
          { name: 'Master basic procedures', completed: true },
          { name: 'Advanced experiment techniques', completed: false },
          { name: 'Independent project', completed: false }
        ]
      },
      {
        id: 3,
        title: 'Perfect Attendance Record',
        category: 'Attendance',
        description: 'Maintain 100% attendance for the entire semester',
        targetDate: '2024-05-31',
        progress: 95,
        status: 'in_progress',
        priority: 'medium',
        currentAttendance: 98,
        targetAttendance: 100,
        milestones: [
          { name: 'First month perfect attendance', completed: true },
          { name: 'Second month perfect attendance', completed: true },
          { name: 'Third month perfect attendance', completed: true },
          { name: 'Complete semester', completed: false }
        ]
      }
    ],
    personal: [
      {
        id: 4,
        title: 'Read 20 Books This Year',
        category: 'Personal Development',
        description: 'Expand knowledge and improve reading comprehension',
        targetDate: '2024-12-31',
        progress: 40,
        status: 'in_progress',
        priority: 'medium',
        currentCount: 8,
        targetCount: 20,
        milestones: [
          { name: 'Read 5 books', completed: true },
          { name: 'Read 10 books', completed: false },
          { name: 'Read 15 books', completed: false },
          { name: 'Read 20 books', completed: false }
        ]
      },
      {
        id: 5,
        title: 'Learn Spanish Basics',
        category: 'Language Learning',
        description: 'Master basic Spanish conversation and vocabulary',
        targetDate: '2024-06-30',
        progress: 30,
        status: 'in_progress',
        priority: 'low',
        currentLevel: 'Beginner',
        targetLevel: 'Intermediate',
        milestones: [
          { name: 'Learn basic vocabulary', completed: true },
          { name: 'Master present tense', completed: false },
          { name: 'Hold basic conversation', completed: false },
          { name: 'Pass proficiency test', completed: false }
        ]
      },
      {
        id: 6,
        title: 'Join Student Council',
        category: 'Leadership',
        description: 'Develop leadership skills through student government participation',
        targetDate: '2024-02-15',
        progress: 90,
        status: 'in_progress',
        priority: 'high',
        milestones: [
          { name: 'Submit application', completed: true },
          { name: 'Prepare campaign speech', completed: true },
          { name: 'Campaign for votes', completed: true },
          { name: 'Election results', completed: false }
        ]
      }
    ]
  }

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
      case 'Academic Excellence': return 'bg-blue-100 text-blue-800'
      case 'Practical Skills': return 'bg-purple-100 text-purple-800'
      case 'Attendance': return 'bg-green-100 text-green-800'
      case 'Personal Development': return 'bg-orange-100 text-orange-800'
      case 'Language Learning': return 'bg-indigo-100 text-indigo-800'
      case 'Leadership': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const currentGoals = studentGoals[activeTab]

  const goalStats = {
    totalGoals: [...studentGoals.academic, ...studentGoals.personal].length,
    completedGoals: [...studentGoals.academic, ...studentGoals.personal].filter(goal => goal.status === 'completed').length,
    inProgressGoals: [...studentGoals.academic, ...studentGoals.personal].filter(goal => goal.status === 'in_progress').length,
    averageProgress: Math.round([...studentGoals.academic, ...studentGoals.personal].reduce((sum, goal) => sum + goal.progress, 0) / [...studentGoals.academic, ...studentGoals.personal].length)
  }

  return (
    <DashboardLayout title="My Goals">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/student">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Target className="h-6 w-6 mr-2" />
                Goal Setting & Achievement Tracking
              </h1>
              <p className="text-gray-600">Set, track, and achieve your academic and personal goals</p>
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

        {/* Progress Overview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Overall Goal Progress</h3>
              <span className="text-sm text-gray-600">
                {goalStats.inProgressGoals} active goals • {goalStats.averageProgress}% average progress
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-500 h-4 rounded-full transition-all duration-300" 
                style={{ width: `${goalStats.averageProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>{goalStats.completedGoals} completed</span>
              <span>{goalStats.averageProgress}% complete</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                <Button
                  variant={activeTab === 'academic' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('academic')}
                >
                  <Award className="h-4 w-4 mr-2" />
                  Academic Goals ({studentGoals.academic.length})
                </Button>
                <Button
                  variant={activeTab === 'personal' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('personal')}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Personal Goals ({studentGoals.personal.length})
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

                  {/* Goal-specific metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {goal.currentGrade && (
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600">Current Grade</p>
                        <p className="text-lg font-bold text-blue-800">{goal.currentGrade}</p>
                      </div>
                    )}
                    {goal.targetGrade && (
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600">Target Grade</p>
                        <p className="text-lg font-bold text-green-800">{goal.targetGrade}</p>
                      </div>
                    )}
                    {goal.currentCount !== undefined && (
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600">Progress</p>
                        <p className="text-lg font-bold text-purple-800">{goal.currentCount}/{goal.targetCount}</p>
                      </div>
                    )}
                    {goal.currentAttendance && (
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-600">Current Attendance</p>
                        <p className="text-lg font-bold text-orange-800">{goal.currentAttendance}%</p>
                      </div>
                    )}
                    {goal.currentLevel && (
                      <div className="text-center p-3 bg-indigo-50 rounded-lg">
                        <p className="text-sm text-indigo-600">Current Level</p>
                        <p className="text-lg font-bold text-indigo-800">{goal.currentLevel}</p>
                      </div>
                    )}
                  </div>

                  {/* Milestones */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Milestones:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {goal.milestones.map((milestone, index) => (
                        <div key={index} className={`flex items-center p-2 rounded ${
                          milestone.completed ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-700'
                        }`}>
                          {milestone.completed ? 
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> :
                            <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          }
                          <span className="text-sm">{milestone.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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
                  <p className="text-sm text-green-700">Scored 90% on Mathematics test</p>
                  <p className="text-xs text-green-600 mt-1">3 days ago</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-1">Perfect Attendance</h4>
                  <p className="text-sm text-blue-700">Third consecutive month achieved</p>
                  <p className="text-xs text-blue-600 mt-1">1 week ago</p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-1">Reading Progress</h4>
                  <p className="text-sm text-purple-700">Completed 8th book of the year</p>
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
