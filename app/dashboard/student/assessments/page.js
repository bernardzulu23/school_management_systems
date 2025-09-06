'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  ClipboardList, Calendar, TrendingUp, Award, Clock, CheckCircle,
  ArrowLeft, Search, Filter, Eye, BookOpen, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function StudentAssessmentsPage() {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')

  // Clean assessments data - no sample data
  const assessmentsData = {
    upcoming: [],
    completed: []
  }

  // Performance data for charts
  const performanceData = assessmentsData.completed.map(assessment => ({
    assessment: assessment.title.split(' - ')[0],
    myScore: assessment.percentage,
    classAverage: (assessment.classAverage / assessment.totalMarks) * 100
  }))

  const gradeProgressData = [
    { month: 'Sep', grade: 82 },
    { month: 'Oct', grade: 85 },
    { month: 'Nov', grade: 87 },
    { month: 'Dec', grade: 86 },
    { month: 'Jan', grade: 88 }
  ]

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return <Calendar className="h-4 w-4 text-blue-500" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <ClipboardList className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'Test': return 'bg-red-100 text-red-800'
      case 'Quiz': return 'bg-blue-100 text-blue-800'
      case 'Assignment': return 'bg-green-100 text-green-800'
      case 'Practical': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getGradeColor = (grade) => {
    if (grade && grade.startsWith('A')) return 'bg-green-100 text-green-800'
    if (grade && grade.startsWith('B')) return 'bg-blue-100 text-blue-800'
    if (grade && grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getDaysLeftColor = (days) => {
    if (days <= 2) return 'text-red-600'
    if (days <= 5) return 'text-yellow-600'
    return 'text-green-600'
  }

  const currentAssessments = assessmentsData[activeTab]

  const assessmentStats = {
    totalAssessments: assessmentsData.upcoming.length + assessmentsData.completed.length,
    upcomingAssessments: assessmentsData.upcoming.length,
    completedAssessments: assessmentsData.completed.length,
    averageGrade: Math.round(assessmentsData.completed.reduce((sum, assessment) => sum + assessment.percentage, 0) / assessmentsData.completed.length)
  }

  return (
    <DashboardLayout title="My Assessments">
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
                <ClipboardList className="h-6 w-6 mr-2" />
                Assessment Preparation & Results
              </h1>
              <p className="text-gray-600">Prepare for upcoming assessments and view your results</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              Study Guide
            </Button>
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Assessment Calendar
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
                  <p className="text-sm font-medium text-gray-600">Average Grade</p>
                  <p className="text-2xl font-bold text-gray-900">{assessmentStats.averageGrade}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Charts */}
        {activeTab === 'completed' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance vs Class Average</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="assessment" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="myScore" fill="#3B82F6" name="My Score" />
                    <Bar dataKey="classAverage" fill="#94A3B8" name="Class Average" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grade Progress Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={gradeProgressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[70, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="grade" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

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
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                >
                  <option value="all">All Subjects</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="History">History</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentAssessments.map((assessment) => (
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
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(assessment.date).toLocaleDateString()} at {assessment.time}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          Duration: {assessment.duration}
                        </div>
                        <div className="flex items-center">
                          <ClipboardList className="h-4 w-4 mr-2" />
                          {assessment.totalMarks} marks
                        </div>
                        <div className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-2" />
                          {assessment.subject}
                        </div>
                      </div>
                      
                      {activeTab === 'upcoming' && assessment.daysLeft && (
                        <div className="mb-3">
                          <span className={`text-sm font-medium ${getDaysLeftColor(assessment.daysLeft)}`}>
                            {assessment.daysLeft} days remaining
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {activeTab === 'upcoming' && (
                        <Button size="sm">
                          Prepare
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {activeTab === 'upcoming' && (
                    <div className="border-t pt-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Topics to Study:</h4>
                          <div className="flex flex-wrap gap-2">
                            {assessment.topics.map((topic, index) => (
                              <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Preparation Materials:</h4>
                          <div className="flex flex-wrap gap-2">
                            {assessment.preparationMaterials.map((material, index) => (
                              <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                {material}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'completed' && (
                    <div className="border-t pt-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-600">My Score</p>
                          <p className="text-lg font-bold text-blue-800">{assessment.myScore}/{assessment.totalMarks}</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-600">Percentage</p>
                          <p className="text-lg font-bold text-green-800">{assessment.percentage}%</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm text-purple-600">Grade</p>
                          <p className={`text-lg font-bold px-2 py-1 rounded ${getGradeColor(assessment.grade)}`}>
                            {assessment.grade}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <p className="text-sm text-orange-600">Class Rank</p>
                          <p className="text-lg font-bold text-orange-800">#{assessment.rank}</p>
                        </div>
                      </div>
                      {assessment.feedback && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-1">Teacher Feedback:</h4>
                          <p className="text-sm text-gray-700">{assessment.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
