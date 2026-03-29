'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  Clock,
  Plus,
  CheckCircle,
  AlertCircle,
  Calendar,
  Users,
  ArrowLeft,
  Filter,
  Download,
  Edit,
  Trash2,
  Play,
  Pause,
} from 'lucide-react'
import Link from 'next/link'

export default function DailyRoutinePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('today')

  // Sample daily routine data
  const routineData = {
    today: [
      {
        id: 1,
        time: '08:00',
        task: 'Department Morning Briefing',
        description: 'Review daily objectives and priorities with department staff',
        priority: 'high',
        status: 'completed',
        duration: '30 minutes',
        assignedTo: 'All Department Staff',
        category: 'Management',
      },
      {
        id: 2,
        time: '08:30',
        task: 'Class Observation - Mathematics',
        description: 'Observe Year 9 Mathematics class for quality assurance',
        priority: 'high',
        status: 'in-progress',
        duration: '45 minutes',
        assignedTo: 'HOD',
        category: 'Academic',
      },
      {
        id: 3,
        time: '09:30',
        task: 'Student Progress Review',
        description: 'Review at-risk students with subject teachers',
        priority: 'medium',
        status: 'pending',
        duration: '60 minutes',
        assignedTo: 'Subject Teachers',
        category: 'Student Support',
      },
      {
        id: 4,
        time: '11:00',
        task: 'Resource Allocation Meeting',
        description: 'Discuss equipment and material distribution',
        priority: 'medium',
        status: 'pending',
        duration: '45 minutes',
        assignedTo: 'Department Heads',
        category: 'Resources',
      },
      {
        id: 5,
        time: '14:00',
        task: 'Teacher Performance Review',
        description: 'One-on-one performance discussion with junior teachers',
        priority: 'high',
        status: 'pending',
        duration: '90 minutes',
        assignedTo: 'HOD',
        category: 'Staff Development',
      },
      {
        id: 6,
        time: '16:00',
        task: 'Department Documentation',
        description: 'Update department files and administrative records',
        priority: 'low',
        status: 'pending',
        duration: '60 minutes',
        assignedTo: 'HOD',
        category: 'Administration',
      },
    ],
    weekly: [
      {
        day: 'Monday',
        tasks: ['Department Planning', 'Staff Meetings', 'Class Observations'],
        focus: 'Planning & Coordination',
      },
      {
        day: 'Tuesday',
        tasks: ['Student Assessments', 'Teacher Evaluations', 'Curriculum Review'],
        focus: 'Academic Quality',
      },
      {
        day: 'Wednesday',
        tasks: ['Resource Management', 'Budget Review', 'Equipment Checks'],
        focus: 'Resource Management',
      },
      {
        day: 'Thursday',
        tasks: ['Professional Development', 'Training Sessions', 'Skill Building'],
        focus: 'Staff Development',
      },
      {
        day: 'Friday',
        tasks: ['Week Review', 'Progress Reports', 'Next Week Planning'],
        focus: 'Review & Planning',
      },
    ],
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-royalPurple-successTx" />
      case 'in-progress':
        return <Play className="h-4 w-4 text-royalPurple-accentTx" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-royalPurple-dangerTx" />
      default:
        return <Clock className="h-4 w-4 text-royalPurple-text3" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      case 'in-progress':
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx border-royalPurple-border'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-royalPurple-success text-royalPurple-successTx border-royalPurple-border'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1 border-royalPurple-border'
    }
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Management':
        return 'bg-royalPurple-pill text-royalPurple-pillTx'
      case 'Academic':
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
      case 'Student Support':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      case 'Resources':
        return 'bg-orange-100 text-orange-800'
      case 'Staff Development':
        return 'bg-royalPurple-pill text-royalPurple-pillTx'
      case 'Administration':
        return 'bg-royalPurple-card2 text-royalPurple-text1'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const routineStats = {
    totalTasks: routineData.today.length,
    completedTasks: routineData.today.filter((task) => task.status === 'completed').length,
    inProgressTasks: routineData.today.filter((task) => task.status === 'in-progress').length,
    pendingTasks: routineData.today.filter((task) => task.status === 'pending').length,
  }

  const completionRate = Math.round((routineStats.completedTasks / routineStats.totalTasks) * 100)

  return (
    <DashboardLayout title="Daily Routine">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/hod">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center">
                <Clock className="h-6 w-6 mr-2" />
                Daily Routine Management
              </h1>
              <p className="text-royalPurple-text2">
                Day-to-day operational tasks and responsibilities
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Schedule
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-royalPurple-accentTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Tasks</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {routineStats.totalTasks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-royalPurple-successTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Completed</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {routineStats.completedTasks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Play className="h-8 w-8 text-royalPurple-accentTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">In Progress</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {routineStats.inProgressTasks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Pending</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {routineStats.pendingTasks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-royalPurple-pillTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Completion Rate</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">{completionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Daily Progress</h3>
              <span className="text-sm text-royalPurple-text2">
                {new Date(selectedDate).toLocaleDateString()}
              </span>
            </div>
            <div className="w-full bg-royalPurple-card2 rounded-full h-4">
              <div
                className="bg-royalPurple-success h-4 rounded-full transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-royalPurple-text2 mt-2">
              <span>
                {routineStats.completedTasks} of {routineStats.totalTasks} tasks completed
              </span>
              <span>{completionRate}% complete</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="border-b border-royalPurple-border">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('today')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'today'
                  ? 'border-royalPurple-border2 text-royalPurple-accentTx'
                  : 'border-transparent text-royalPurple-text3 hover:text-royalPurple-text2 hover:border-royalPurple-border'
              }`}
            >
              Today's Tasks
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'weekly'
                  ? 'border-royalPurple-border2 text-royalPurple-accentTx'
                  : 'border-transparent text-royalPurple-text3 hover:text-royalPurple-text2 hover:border-royalPurple-border'
              }`}
            >
              Weekly Overview
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'today' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today's Tasks</CardTitle>
                <select
                  className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routineData.today.map((task) => (
                  <div
                    key={task.id}
                    className="border border-royalPurple-border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-sm font-medium text-royalPurple-accentTx mr-3">
                            {task.time}
                          </span>
                          <h3 className="text-lg font-semibold text-royalPurple-text1 mr-3">
                            {task.task}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded border ${getPriorityColor(task.priority)}`}
                          >
                            {task.priority} priority
                          </span>
                        </div>
                        <p className="text-royalPurple-text2 mb-3">{task.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-royalPurple-text3">
                          <span>Duration: {task.duration}</span>
                          <span>Assigned to: {task.assignedTo}</span>
                          <span
                            className={`px-2 py-1 text-xs rounded ${getCategoryColor(task.category)}`}
                          >
                            {task.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center mr-4">
                          {getStatusIcon(task.status)}
                          <span
                            className={`ml-2 px-2 py-1 text-xs rounded ${getStatusColor(task.status)}`}
                          >
                            {task.status}
                          </span>
                        </div>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          {task.status === 'pending' ? (
                            <Play className="h-4 w-4" />
                          ) : (
                            <Pause className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'weekly' && (
          <Card>
            <CardHeader>
              <CardTitle>Weekly Routine Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {routineData.weekly.map((day, index) => (
                  <div key={index} className="border border-royalPurple-border rounded-lg p-4">
                    <h3 className="font-semibold text-royalPurple-text1 mb-2">{day.day}</h3>
                    <p className="text-sm text-royalPurple-accentTx mb-3 font-medium">
                      {day.focus}
                    </p>
                    <div className="space-y-2">
                      {day.tasks.map((task, taskIndex) => (
                        <div
                          key={taskIndex}
                          className="text-sm text-royalPurple-text2 p-2 bg-royalPurple-page rounded"
                        >
                          {task}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Task
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Weekly Schedule
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Set Reminders
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Daily Report
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Priorities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {routineData.today
                  .filter((task) => task.priority === 'high')
                  .map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-royalPurple-danger border border-royalPurple-border rounded-lg"
                    >
                      <h4 className="font-medium text-royalPurple-dangerTx">{task.task}</h4>
                      <p className="text-sm text-royalPurple-dangerTx">
                        {task.time} - {task.duration}
                      </p>
                      <div className="flex items-center mt-2">
                        {getStatusIcon(task.status)}
                        <span
                          className={`ml-2 px-2 py-1 text-xs rounded ${getStatusColor(task.status)}`}
                        >
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
