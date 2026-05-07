'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
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
  Calendar,
  RefreshCcw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import SkeletonLoader from '@/components/SkeletonLoader'

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
      const response = await fetch(
        `/api/v1/teacher-performance/teachers/${teacherId}/detailed-analysis`
      )
      if (response.ok) {
        const data = await response.json()
        setPerformanceData(data.data || {})
      }

      // Load basic summary
      const summaryResponse = await fetch(
        `/api/v1/teacher-performance/teachers/${teacherId}/summary`
      )
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        setPerformanceData((prev) => ({ ...prev, ...summaryData.data }))
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
        body: JSON.stringify(observationData),
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

  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = filterDepartment === 'all' || teacher.department === filterDepartment
    return matchesSearch && matchesDepartment
  })

  const departments = [...new Set(teachers.map((t) => t.department).filter(Boolean))]

  if (loading && !selectedTeacher) {
    return (
      <main
        className="container mx-auto px-4 py-6"
        role="main"
        aria-busy="true"
        aria-label="Loading teacher performance system"
      >
        <div className="mb-6">
          <SkeletonLoader className="h-10 w-1/2 mb-2" />
          <SkeletonLoader className="h-5 w-3/4" />
        </div>

        <Card className="p-6 mb-6">
          <div className="flex gap-4">
            <SkeletonLoader className="h-10 flex-1 rounded-lg" />
            <SkeletonLoader className="h-10 w-32 rounded-lg" />
            <SkeletonLoader className="h-10 w-32 rounded-lg" />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <SkeletonLoader className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <SkeletonLoader className="h-5 w-2/3 mb-2" />
                  <SkeletonLoader className="h-4 w-1/2" />
                </div>
              </div>
              <div className="space-y-3 mb-4">
                <SkeletonLoader className="h-4 w-full" />
                <SkeletonLoader className="h-4 w-full" />
                <SkeletonLoader className="h-4 w-full" />
              </div>
              <SkeletonLoader className="h-10 w-full rounded-lg" />
            </Card>
          ))}
        </div>
      </main>
    )
  }

  if (showObservationForm) {
    return (
      <main className="container mx-auto px-4 py-6" role="main">
        <TeacherObservationForm
          teachers={teachers}
          observationTools={observationTools}
          onSubmit={handleObservationSubmit}
          onCancel={() => setShowObservationForm(false)}
        />
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-6" role="main">
      {/* Header */}
      <header className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-royalPurple-text1 flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-royalPurple-accentTx" aria-hidden="true" />
              Teacher Performance Evaluation System
            </h1>
            <p className="text-royalPurple-text2 mt-2">
              Comprehensive teacher assessment linking observations with student performance across
              Terms 1, 2, and 3
            </p>
          </div>

          <nav className="flex gap-3" aria-label="Page actions">
            <Button
              onClick={handleNewObservation}
              className="flex items-center gap-2"
              aria-label="Create new observation"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              New Observation
            </Button>

            {selectedTeacher && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTeacher(null)
                  setActiveView('overview')
                }}
                aria-label="Return to teacher overview"
              >
                Back to Overview
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Navigation Tabs */}
      {selectedTeacher && (
        <div className="border-b border-royalPurple-border mb-6">
          <nav
            className="-mb-px flex space-x-8"
            role="tablist"
            aria-label="Teacher performance sections"
          >
            {[
              { id: 'dashboard', name: 'Performance Dashboard', icon: BarChart3 },
              { id: 'analysis', name: 'Detailed Analysis', icon: FileText },
              { id: 'observations', name: 'Observations', icon: Eye },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeView === tab.id}
                aria-controls={`${tab.id}-panel`}
                id={`${tab.id}-tab`}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-g-500 ${
                  activeView === tab.id
                    ? 'border-royalPurple-border2 text-royalPurple-accentTx'
                    : 'border-transparent text-royalPurple-text3 hover:text-royalPurple-text2 hover:border-royalPurple-border'
                }`}
              >
                <tab.icon className="w-4 h-4" aria-hidden="true" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Content */}
      <section aria-label="Performance content">
        {!selectedTeacher ? (
          /* Teacher Selection Overview */
          <div className="space-y-6">
            {/* Search and Filter */}
            <Card className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3 w-4 h-4"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      placeholder="Search teachers by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search teachers"
                      className="w-full pl-10 pr-4 py-2 border border-royalPurple-border rounded-lg focus:ring-2 focus:ring-g-500 focus:border-royalPurple-border2 focus:outline-none focus-visible:ring-2 focus-visible:ring-g-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    aria-label="Filter by department"
                    className="px-3 py-2 border border-royalPurple-border rounded-lg focus:ring-2 focus:ring-g-500 focus:border-royalPurple-border2 focus:outline-none focus-visible:ring-2 focus-visible:ring-g-500"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    aria-label="Export performance report"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Export Report
                  </Button>
                </div>
              </div>
            </Card>

            {/* Teachers Grid */}
            <ul
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              role="list"
              aria-label="Teachers list"
            >
              {filteredTeachers.map((teacher) => (
                <li key={teacher.id} role="listitem">
                  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group focus-within:ring-2 focus-within:ring-g-500">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 bg-royalPurple-accent rounded-full flex items-center justify-center"
                          aria-hidden="true"
                        >
                          <Users className="w-6 h-6 text-royalPurple-accentTx" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-royalPurple-text1 group-hover:text-royalPurple-accentTx transition-colors">
                            {teacher.name}
                          </h3>
                          <p className="text-sm text-royalPurple-text2">{teacher.department}</p>
                          <p className="text-xs text-royalPurple-text3">{teacher.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-royalPurple-text2">Employee ID:</span>
                        <span className="font-medium">{teacher.employee_id || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-royalPurple-text2">Experience:</span>
                        <span className="font-medium">
                          {teacher.experience_years || 'N/A'} years
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-royalPurple-text2">Qualifications:</span>
                        <span className="font-medium text-right">
                          {teacher.qualifications || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleTeacherSelect(teacher)}
                      className="w-full flex items-center justify-center gap-2"
                      aria-label={`View performance for ${teacher.name}`}
                    >
                      <Eye className="w-4 h-4" aria-hidden="true" />
                      View Performance
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>

            {filteredTeachers.length === 0 && (
              <Card className="p-12 text-center" role="status">
                <Users
                  className="w-12 h-12 text-royalPurple-text3 mx-auto mb-4"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-medium text-royalPurple-text1 mb-2">
                  No Teachers Found
                </h3>
                <p className="text-royalPurple-text2">
                  {searchTerm || filterDepartment !== 'all'
                    ? 'Try adjusting your search criteria or filters.'
                    : 'No teachers are available in the system.'}
                </p>
                {(searchTerm || filterDepartment !== 'all') && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchTerm('')
                      setFilterDepartment('all')
                    }}
                    className="mt-2"
                  >
                    Clear all filters
                  </Button>
                )}
              </Card>
            )}
          </div>
        ) : (
          /* Selected Teacher Views */
          <div id={`${activeView}-panel`} role="tabpanel" aria-labelledby={`${activeView}-tab`}>
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
                <h3 className="text-lg font-semibold text-royalPurple-text1 mb-4">
                  Observation History for {selectedTeacher.name}
                </h3>
                <div className="text-center py-8">
                  <FileText
                    className="w-12 h-12 text-royalPurple-text3 mx-auto mb-4"
                    aria-hidden="true"
                  />
                  <p className="text-royalPurple-text3">
                    Detailed observation history will be displayed here
                  </p>
                  <Button
                    className="mt-4"
                    onClick={handleNewObservation}
                    aria-label="Create new observation"
                  >
                    Create New Observation
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
