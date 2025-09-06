'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  ClipboardList, Plus, Calendar, Clock, Users, TrendingUp,
  ArrowLeft, Search, Filter, Download, Eye, Edit, CheckCircle
} from 'lucide-react'
import Link from 'next/link'

export default function TeacherAssessmentsPage() {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  // Clean assessments data - no sample data
  const assessmentsData = {
    upcoming: [],
    completed: []
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return <Calendar className="h-4 w-4 text-blue-500" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'draft': return <Edit className="h-4 w-4 text-yellow-500" />
      case 'grading': return <Clock className="h-4 w-4 text-orange-500" />
      default: return <ClipboardList className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'grading': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'Test': return 'bg-red-100 text-red-800'
      case 'Quiz': return 'bg-blue-100 text-blue-800'
      case 'Assignment': return 'bg-green-100 text-green-800'
      case 'Project': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const assessmentStats = {
    totalAssessments: assessmentsData.upcoming.length + assessmentsData.completed.length,
    upcomingAssessments: assessmentsData.upcoming.length,
    completedAssessments: assessmentsData.completed.length,
    averagePassRate: Math.round(
      assessmentsData.completed.reduce((sum, assessment) => sum + (assessment.passRate || 0), 0) / 
      assessmentsData.completed.length
    )
  }

  return (
    <DashboardLayout title="Assessment Management">
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
                <ClipboardList className="h-6 w-6 mr-2" />
                Assessment Management
              </h1>
              <p className="text-gray-600">Create, manage, and analyze student assessments</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Assessment
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ClipboardList className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                  <p className="text-2xl font-bold text-gray-900">{assessmentStats.totalAssessments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">{assessmentStats.upcomingAssessments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{assessmentStats.completedAssessments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Pass Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{assessmentStats.averagePassRate}%</p>
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
                  variant={activeTab === 'upcoming' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('upcoming')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Upcoming ({assessmentsData.upcoming.length})
                </Button>
                <Button
                  variant={activeTab === 'completed' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('completed')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completed ({assessmentsData.completed.length})
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search assessments..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="Test">Tests</option>
                  <option value="Quiz">Quizzes</option>
                  <option value="Assignment">Assignments</option>
                  <option value="Project">Projects</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assessmentsData[activeTab].map((assessment) => (
                <div key={assessment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 mr-3">{assessment.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(assessment.type)}`}>
                          {assessment.type}
                        </span>
                        <div className="flex items-center ml-3">
                          {getStatusIcon(assessment.status)}
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(assessment.status)}`}>
                            {assessment.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-3">{assessment.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(assessment.date).toLocaleDateString()} at {assessment.time}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          Duration: {assessment.duration}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          {assessment.students} students
                        </div>
                        <div className="flex items-center">
                          <ClipboardList className="h-4 w-4 mr-2" />
                          {assessment.totalMarks} marks
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {assessment.status === 'completed' && (
                        <Button size="sm">
                          View Results
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {assessment.status === 'completed' && (
                    <div className="border-t pt-3">
                      <h4 className="font-medium text-gray-900 mb-2">Results Summary:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-600">Average Score</p>
                          <p className="text-lg font-bold text-blue-800">{assessment.averageScore}/{assessment.totalMarks}</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-600">Highest Score</p>
                          <p className="text-lg font-bold text-green-800">{assessment.highestScore}/{assessment.totalMarks}</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-600">Lowest Score</p>
                          <p className="text-lg font-bold text-red-800">{assessment.lowestScore}/{assessment.totalMarks}</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm text-purple-600">Pass Rate</p>
                          <p className="text-lg font-bold text-purple-800">{assessment.passRate}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Assessment Tools and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Assessment
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Question Bank
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Assessment Calendar
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analytics Dashboard
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Templates
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-1">Assessment Completed</h4>
                  <p className="text-sm text-green-700">Statistics Test - Results uploaded</p>
                  <p className="text-xs text-green-600 mt-1">2 hours ago</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-1">Assessment Scheduled</h4>
                  <p className="text-sm text-blue-700">Algebra Mid-term Test - Jan 30, 10:00 AM</p>
                  <p className="text-xs text-blue-600 mt-1">1 day ago</p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-1">Draft Saved</h4>
                  <p className="text-sm text-yellow-700">Trigonometry Assignment - Ready for review</p>
                  <p className="text-xs text-yellow-600 mt-1">3 days ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assessment Analytics Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <ClipboardList className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium text-blue-800">Total Assessments</h4>
                <p className="text-2xl font-bold text-blue-600">{assessmentStats.totalAssessments}</p>
                <p className="text-sm text-blue-600">This semester</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium text-green-800">Average Performance</h4>
                <p className="text-2xl font-bold text-green-600">82%</p>
                <p className="text-sm text-green-600">Across all classes</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-medium text-purple-800">Students Assessed</h4>
                <p className="text-2xl font-bold text-purple-600">83</p>
                <p className="text-sm text-purple-600">Total participants</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
