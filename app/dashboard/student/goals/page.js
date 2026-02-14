'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { 
  Target, Plus, TrendingUp, Award, Calendar, CheckCircle, Clock,
  ArrowLeft, Search, Filter, Edit, Trash2, Star, Save, X, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast, Toaster } from 'react-hot-toast'

export default function StudentGoalsPage() {
  const [activeTab, setActiveTab] = useState('academic')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'academic',
    category: 'Academic Excellence',
    description: '',
    targetDate: '',
    status: 'in_progress',
    priority: 'medium',
    targetValue: '',
    currentValue: '',
    milestones: [] // { name: '', completed: false }
  })

  const queryClient = useQueryClient()

  const { data: goalsData, isLoading } = useQuery({
    queryKey: ['student-goals'],
    queryFn: async () => {
      try {
        const res = await api.getStudentGoals()
        return res.data.data
      } catch (error) {
        toast.error('Failed to load goals')
        return null
      }
    }
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => api.createStudentGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['student-goals'])
      setIsAddModalOpen(false)
      resetForm()
      toast.success('Goal created successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create goal')
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data) => api.updateStudentGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['student-goals'])
      setIsEditModalOpen(false)
      resetForm()
      toast.success('Goal updated successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update goal')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteStudentGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['student-goals'])
      setIsDeleteModalOpen(false)
      setSelectedGoal(null)
      toast.success('Goal deleted successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete goal')
    }
  })

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'academic',
      category: 'Academic Excellence',
      description: '',
      targetDate: '',
      status: 'in_progress',
      priority: 'medium',
      targetValue: '',
      currentValue: '',
      milestones: []
    })
    setSelectedGoal(null)
  }

  const handleEditClick = (goal) => {
    setSelectedGoal(goal)
    setFormData({
      title: goal.title,
      type: goal.type,
      category: goal.category,
      description: goal.description || '',
      targetDate: new Date(goal.targetDate).toISOString().split('T')[0],
      status: goal.status,
      priority: goal.priority,
      targetValue: goal.targetValue || '',
      currentValue: goal.currentValue || '',
      milestones: goal.milestones || []
    })
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (goal) => {
    setSelectedGoal(goal)
    setIsDeleteModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isEditModalOpen && selectedGoal) {
      updateMutation.mutate({ ...formData, id: selectedGoal.id })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleAddMilestone = () => {
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { name: '', completed: false }]
    })
  }

  const handleRemoveMilestone = (index) => {
    const newMilestones = [...formData.milestones]
    newMilestones.splice(index, 1)
    setFormData({ ...formData, milestones: newMilestones })
  }

  const handleMilestoneChange = (index, field, value) => {
    const newMilestones = [...formData.milestones]
    newMilestones[index][field] = value
    setFormData({ ...formData, milestones: newMilestones })
  }

  // Sample student goals data - fallback if loading or error
  const defaultGoals = {
    academic: [],
    personal: []
  }

  const studentGoals = goalsData || defaultGoals

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
                      <Button size="sm" variant="outline" onClick={() => handleEditClick(goal)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteClick(goal)}>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {goal.currentValue && (
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600">Current Status</p>
                        <p className="text-lg font-bold text-blue-800">{goal.currentValue}</p>
                      </div>
                    )}
                    {goal.targetValue && (
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600">Target Goal</p>
                        <p className="text-lg font-bold text-green-800">{goal.targetValue}</p>
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

        {/* Add/Edit Goal Modal */}
        <Modal
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={() => {
            setIsAddModalOpen(false)
            setIsEditModalOpen(false)
            resetForm()
          }}
          title={isEditModalOpen ? 'Edit Goal' : 'Set New Goal'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="academic">Academic</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Academic Excellence">Academic Excellence</option>
                  <option value="Practical Skills">Practical Skills</option>
                  <option value="Attendance">Attendance</option>
                  <option value="Personal Development">Personal Development</option>
                  <option value="Language Learning">Language Learning</option>
                  <option value="Leadership">Leadership</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Milestones</label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddMilestone}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.milestones.map((milestone, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={milestone.completed}
                      onChange={(e) => handleMilestoneChange(index, 'completed', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <input
                      type="text"
                      placeholder="Milestone name"
                      className="flex-1 px-2 py-1 border rounded-md text-sm"
                      value={milestone.name}
                      onChange={(e) => handleMilestoneChange(index, 'name', e.target.value)}
                    />
                    <button type="button" onClick={() => handleRemoveMilestone(index)} className="text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setIsAddModalOpen(false)
                setIsEditModalOpen(false)
                resetForm()
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save Goal'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Goal"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-red-600 bg-red-50 p-4 rounded-lg">
              <AlertTriangle className="h-6 w-6" />
              <p className="font-medium">Are you sure you want to delete this goal?</p>
            </div>
            <p className="text-sm text-gray-600">
              This action cannot be undone. This will permanently delete the goal "{selectedGoal?.title}" and all its milestones.
            </p>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteMutation.mutate(selectedGoal.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Goal'}
              </Button>
            </div>
          </div>
        </Modal>

        <Toaster position="top-right" />
      </div>
    </DashboardLayout>
  )
}
