'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  ClipboardList,
  Plus,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'
import { Loader2, X } from 'lucide-react'

export default function TeacherAssessmentsPage() {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [assessmentsData, setAssessmentsData] = useState({ upcoming: [], completed: [] })
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    type: 'quiz',
    date: '',
    duration_minutes: 60,
    description: '',
  })

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId) || null

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const res = await fetch('/api/teaching-assignments')
        if (!res.ok) throw new Error('Failed')
        const json = await res.json()
        const data = Array.isArray(json?.data) ? json.data : []
        setAssignments(data)
        if (data.length > 0) setSelectedAssignmentId((prev) => prev || data[0].id)
      } catch {
        toast.error('Failed to load teaching assignments')
      }
    }
    loadAssignments()
  }, [])

  useEffect(() => {
    const loadAssessments = async () => {
      if (!selectedAssignment) return
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('class', selectedAssignment.className)
        params.set('subject', selectedAssignment.subjectName)
        params.set('limit', '50')
        const res = await fetch(`/api/assessments?${params.toString()}`)
        if (!res.ok) throw new Error('Failed')
        const json = await res.json()
        const data = Array.isArray(json?.data) ? json.data : []
        const now = new Date()
        const upcoming = data.filter((a) => new Date(a.date) >= now)
        const completed = data.filter((a) => new Date(a.date) < now)
        setAssessmentsData({ upcoming, completed })
      } catch {
        toast.error('Failed to load assessments')
        setAssessmentsData({ upcoming: [], completed: [] })
      } finally {
        setLoading(false)
      }
    }
    loadAssessments()
  }, [selectedAssignmentId])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-royalPurple-accentTx" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-royalPurple-successTx" />
      case 'draft':
        return <Edit className="h-4 w-4 text-yellow-500" />
      case 'grading':
        return <Clock className="h-4 w-4 text-orange-500" />
      default:
        return <ClipboardList className="h-4 w-4 text-royalPurple-text3" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
      case 'completed':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'grading':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'Test':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx'
      case 'Quiz':
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
      case 'Assignment':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      case 'Project':
        return 'bg-royalPurple-pill text-royalPurple-pillTx'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const assessmentStats = {
    totalAssessments: assessmentsData.upcoming.length + assessmentsData.completed.length,
    upcomingAssessments: assessmentsData.upcoming.length,
    completedAssessments: assessmentsData.completed.length,
    averagePassRate: Math.round(
      assessmentsData.completed.reduce((sum, assessment) => sum + (assessment.passRate || 0), 0) /
        assessmentsData.completed.length
    ),
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
              <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center">
                <ClipboardList className="h-6 w-6 mr-2" />
                Assessment Management
              </h1>
              <p className="text-royalPurple-text2">
                Create, manage, and analyze student assessments
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
            <Button onClick={() => setShowCreate(true)} disabled={!selectedAssignment}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assessment
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Rapid Subject Switcher</Label>
                <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class + Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.className} · {a.subjectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ClipboardList className="h-8 w-8 text-royalPurple-accentTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Assessments</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {assessmentStats.totalAssessments}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-royalPurple-successTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Upcoming</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {assessmentStats.upcomingAssessments}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-royalPurple-pillTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Completed</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {assessmentStats.completedAssessments}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Avg Pass Rate</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {assessmentStats.averagePassRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-royalPurple-deep/80">
            <div className="bg-royalPurple-card rounded-xl shadow-xl w-full max-w-xl">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-royalPurple-text1">Create Assessment</h3>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={createForm.title}
                    onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={createForm.type}
                      onValueChange={(v) => setCreateForm((p) => ({ ...p, type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="exam">Exam</SelectItem>
                        <SelectItem value="assignment">Assignment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="datetime-local"
                      value={createForm.date}
                      onChange={(e) => setCreateForm((p) => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="10"
                    max="240"
                    value={createForm.duration_minutes}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={createForm.description}
                    onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={async () => {
                      if (!selectedAssignment) return
                      setCreating(true)
                      try {
                        const res = await fetch('/api/assessments', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: createForm.title,
                            type: createForm.type,
                            date: createForm.date,
                            duration_minutes: createForm.duration_minutes,
                            description: createForm.description,
                            subject: selectedAssignment.subjectName,
                            class: selectedAssignment.className,
                          }),
                        })
                        if (!res.ok) throw new Error('Failed')
                        toast.success('Assessment created')
                        setShowCreate(false)
                        setCreateForm({
                          title: '',
                          type: 'quiz',
                          date: '',
                          duration_minutes: 60,
                          description: '',
                        })
                        const params = new URLSearchParams()
                        params.set('class', selectedAssignment.className)
                        params.set('subject', selectedAssignment.subjectName)
                        params.set('limit', '50')
                        const reload = await fetch(`/api/assessments?${params.toString()}`)
                        const json = reload.ok ? await reload.json() : { data: [] }
                        const data = Array.isArray(json?.data) ? json.data : []
                        const now = new Date()
                        setAssessmentsData({
                          upcoming: data.filter((a) => new Date(a.date) >= now),
                          completed: data.filter((a) => new Date(a.date) < now),
                        })
                      } catch {
                        toast.error('Failed to create assessment')
                      } finally {
                        setCreating(false)
                      }
                    }}
                    disabled={creating || !createForm.title || !createForm.date}
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create
                  </Button>
                </div>
              </div>
            </div>
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
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3" />
                  <input
                    type="text"
                    placeholder="Search assessments..."
                    className="pl-10 pr-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <div
                  key={assessment.id}
                  className="border border-royalPurple-border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-royalPurple-text1 mr-3">
                          {assessment.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getTypeColor(assessment.type)}`}
                        >
                          {assessment.type}
                        </span>
                        <div className="flex items-center ml-3">
                          {getStatusIcon(assessment.status)}
                          <span
                            className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(assessment.status)}`}
                          >
                            {assessment.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-royalPurple-text2 mb-3">{assessment.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-royalPurple-text2">
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
                      {assessment.status === 'completed' && <Button size="sm">View Results</Button>}
                    </div>
                  </div>

                  {assessment.status === 'completed' && (
                    <div className="border-t pt-3">
                      <h4 className="font-medium text-royalPurple-text1 mb-2">Results Summary:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-royalPurple-accent rounded-lg">
                          <p className="text-sm text-royalPurple-accentTx">Average Score</p>
                          <p className="text-lg font-bold text-royalPurple-accentTx">
                            {assessment.averageScore}/{assessment.totalMarks}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-royalPurple-success rounded-lg">
                          <p className="text-sm text-royalPurple-successTx">Highest Score</p>
                          <p className="text-lg font-bold text-royalPurple-successTx">
                            {assessment.highestScore}/{assessment.totalMarks}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-royalPurple-danger rounded-lg">
                          <p className="text-sm text-royalPurple-dangerTx">Lowest Score</p>
                          <p className="text-lg font-bold text-royalPurple-dangerTx">
                            {assessment.lowestScore}/{assessment.totalMarks}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-royalPurple-pill rounded-lg">
                          <p className="text-sm text-royalPurple-pillTx">Pass Rate</p>
                          <p className="text-lg font-bold text-royalPurple-pillTx">
                            {assessment.passRate}%
                          </p>
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
                <div className="p-3 bg-royalPurple-success border border-royalPurple-border rounded-lg">
                  <h4 className="font-medium text-royalPurple-successTx mb-1">
                    Assessment Completed
                  </h4>
                  <p className="text-sm text-royalPurple-successTx">
                    Statistics Test - Results uploaded
                  </p>
                  <p className="text-xs text-royalPurple-successTx mt-1">2 hours ago</p>
                </div>
                <div className="p-3 bg-royalPurple-accent border border-royalPurple-border2 rounded-lg">
                  <h4 className="font-medium text-royalPurple-accentTx mb-1">
                    Assessment Scheduled
                  </h4>
                  <p className="text-sm text-royalPurple-accentTx">
                    Algebra Mid-term Test - Jan 30, 10:00 AM
                  </p>
                  <p className="text-xs text-royalPurple-accentTx mt-1">1 day ago</p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-1">Draft Saved</h4>
                  <p className="text-sm text-yellow-700">
                    Trigonometry Assignment - Ready for review
                  </p>
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
              <div className="text-center p-4 bg-royalPurple-accent rounded-lg">
                <ClipboardList className="h-8 w-8 text-royalPurple-accentTx mx-auto mb-2" />
                <h4 className="font-medium text-royalPurple-accentTx">Total Assessments</h4>
                <p className="text-2xl font-bold text-royalPurple-accentTx">
                  {assessmentStats.totalAssessments}
                </p>
                <p className="text-sm text-royalPurple-accentTx">This semester</p>
              </div>
              <div className="text-center p-4 bg-royalPurple-success rounded-lg">
                <TrendingUp className="h-8 w-8 text-royalPurple-successTx mx-auto mb-2" />
                <h4 className="font-medium text-royalPurple-successTx">Average Performance</h4>
                <p className="text-2xl font-bold text-royalPurple-successTx">82%</p>
                <p className="text-sm text-royalPurple-successTx">Across all classes</p>
              </div>
              <div className="text-center p-4 bg-royalPurple-pill rounded-lg">
                <Users className="h-8 w-8 text-royalPurple-pillTx mx-auto mb-2" />
                <h4 className="font-medium text-royalPurple-pillTx">Students Assessed</h4>
                <p className="text-2xl font-bold text-royalPurple-pillTx">83</p>
                <p className="text-sm text-royalPurple-pillTx">Total participants</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
