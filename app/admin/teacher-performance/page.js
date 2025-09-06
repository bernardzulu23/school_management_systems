'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import TeacherObservationForm from '@/components/admin/TeacherObservationForm'
import TeacherPerformanceDashboard from '@/components/admin/TeacherPerformanceDashboard'
import TeacherPerformanceAnalysis from '@/components/admin/TeacherPerformanceAnalysis'
import { 
  Users, 
  Plus, 
  Eye, 
  BarChart3, 
  FileText,
  Search,
  Filter,
  Download,
  Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function TeacherPerformancePage() {
  const [activeView, setActiveView] = useState('overview')
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [showObservationForm, setShowObservationForm] = useState(false)
  const [teachers, setTeachers] = useState([])
  const [observationTools, setObservationTools] = useState([])
  const [performanceData, setPerformanceData] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('all')

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Load teachers
      const teachersResponse = await fetch('/api/v1/users?role=teacher')
      if (teachersResponse.ok) {
        const teachersData = await teachersResponse.json()
        setTeachers(teachersData.data || [])
      }

      // Load observation tools
      const toolsResponse = await fetch('/api/v1/teacher-performance/observation-tools')
      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.json()
        setObservationTools(toolsData.data || [])
      }

    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const loadTeacherPerformanceData = async (teacherId) => {
    try {
      setLoading(true)
      
      // Load comprehensive performance data
      const response = await fetch(`/api/v1/teacher-performance/teachers/${teacherId}/detailed-analysis`)
      if (response.ok) {
        const data = await response.json()
        setPerformanceData(data.data || {})
      }

      // Load basic summary
      const summaryResponse = await fetch(`/api/v1/teacher-performance/teachers/${teacherId}/summary`)
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        setPerformanceData(prev => ({ ...prev, ...summaryData.data }))
      }

    } catch (error) {
      console.error('Error loading teacher performance data:', error)
      toast.error('Error loading performance data')
    } finally {
      setLoading(false)
    }
  }

  const handleTeacherSelect = (teacher) => {
    setSelectedTeacher(teacher)
    setActiveView('dashboard')
    loadTeacherPerformanceData(teacher.id)
  }

  const handleNewObservation = () => {
    setShowObservationForm(true)
  }

  const handleObservationSubmit = async (observationData) => {
    try {
      const response = await fetch('/api/v1/teacher-performance/observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(observationData)
      })

      if (response.ok) {
        toast.success('Observation saved successfully')
        setShowObservationForm(false)
        if (selectedTeacher) {
          loadTeacherPerformanceData(selectedTeacher.id)
        }
      } else {
        throw new Error('Failed to save observation')
      }
    } catch (error) {
      console.error('Error saving observation:', error)
      toast.error('Error saving observation')
    }
  }

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = filterDepartment === 'all' || teacher.department === filterDepartment
    return matchesSearch && matchesDepartment
  })

  const departments = [...new Set(teachers.map(t => t.department).filter(Boolean))]

  if (loading && !selectedTeacher) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading teacher performance system...</p>
        </div>
      </div>
    )
  }

  if (showObservationForm) {
    return (
      <div className="container mx-auto px-4 py-6">
        <TeacherObservationForm
          teachers={teachers}
          observationTools={observationTools}
          onSubmit={handleObservationSubmit}
          onCancel={() => setShowObservationForm(false)}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-8 h-8" />
              Teacher Performance Evaluation System
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive teacher assessment linking observations with student performance across Terms 1, 2, and 3
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleNewObservation}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Observation
            </Button>
            
            {selectedTeacher && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTeacher(null)
                  setActiveView('overview')
                }}
              >
                Back to Overview
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      {selectedTeacher && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', name: 'Performance Dashboard', icon: BarChart3 },
              { id: 'analysis', name: 'Detailed Analysis', icon: FileText },
              { id: 'observations', name: 'Observations', icon: Eye }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Content */}
      {!selectedTeacher ? (
        /* Teacher Selection Overview */
        <div className="space-y-6">
          {/* Search and Filter */}
          <Card className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search teachers by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Report
                </Button>
              </div>
            </div>
          </Card>

          {/* Teachers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeachers.map((teacher) => (
              <Card key={teacher.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                      <p className="text-sm text-gray-600">{teacher.department}</p>
                      <p className="text-xs text-gray-500">{teacher.email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Employee ID:</span>
                    <span className="font-medium">{teacher.employee_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Experience:</span>
                    <span className="font-medium">{teacher.experience_years || 'N/A'} years</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Qualifications:</span>
                    <span className="font-medium text-right">{teacher.qualifications || 'N/A'}</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleTeacherSelect(teacher)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Performance
                </Button>
              </Card>
            ))}
          </div>

          {filteredTeachers.length === 0 && (
            <Card className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Teachers Found</h3>
              <p className="text-gray-600">
                {searchTerm || filterDepartment !== 'all' 
                  ? 'Try adjusting your search criteria or filters.'
                  : 'No teachers are available in the system.'}
              </p>
            </Card>
          )}
        </div>
      ) : (
        /* Selected Teacher Views */
        <div>
          {activeView === 'dashboard' && (
            <TeacherPerformanceDashboard
              teacherId={selectedTeacher.id}
              teacherData={selectedTeacher}
              performanceData={performanceData}
              onNewObservation={handleNewObservation}
              onViewDetails={(observation) => {
                console.log('View observation details:', observation)
              }}
            />
          )}

          {activeView === 'analysis' && (
            <TeacherPerformanceAnalysis
              teacherId={selectedTeacher.id}
              teacherData={selectedTeacher}
              performanceData={performanceData}
            />
          )}

          {activeView === 'observations' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Observation History for {selectedTeacher.name}
              </h3>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Detailed observation history will be displayed here</p>
                <Button className="mt-4" onClick={handleNewObservation}>
                  Create New Observation
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
