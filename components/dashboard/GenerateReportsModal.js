'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import { 
  FileText, Download, Printer, Mail, Calendar, BarChart3, 
  PieChart, TrendingDown, AlertTriangle, CheckCircle, Users
} from 'lucide-react'

export default function GenerateReportsModal({ students, onClose }) {
  const [selectedReportType, setSelectedReportType] = useState('individual')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [reportFormat, setReportFormat] = useState('pdf')
  const [includeRecommendations, setIncludeRecommendations] = useState(true)
  const [includeParentContact, setIncludeParentContact] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const reportTypes = [
    {
      id: 'individual',
      name: 'Individual Student Reports',
      description: 'Detailed performance report for each selected student',
      icon: FileText,
      color: 'blue'
    },
    {
      id: 'summary',
      name: 'Summary Report',
      description: 'Overview of all students requiring attention',
      icon: BarChart3,
      color: 'green'
    },
    {
      id: 'intervention',
      name: 'Intervention Plan Report',
      description: 'Recommended intervention strategies and action plans',
      icon: TrendingDown,
      color: 'orange'
    },
    {
      id: 'parent',
      name: 'Parent Communication Report',
      description: 'Report formatted for parent/guardian communication',
      icon: Mail,
      color: 'purple'
    }
  ]

  const formats = [
    { id: 'pdf', name: 'PDF Document', icon: FileText },
    { id: 'excel', name: 'Excel Spreadsheet', icon: BarChart3 },
    { id: 'word', name: 'Word Document', icon: FileText },
    { id: 'print', name: 'Print Ready', icon: Printer }
  ]

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const selectAllStudents = () => {
    setSelectedStudents(students.map(s => s.id))
  }

  const clearSelection = () => {
    setSelectedStudents([])
  }

  const handleGenerateReport = async () => {
    const selectedStudentData = students.filter(s => selectedStudents.includes(s.id))
    
    setIsGenerating(true)
    try {
      // Here you would implement the actual report generation
      console.log('Generating report:', {
        type: selectedReportType,
        format: reportFormat,
        students: selectedStudentData.map(s => s.name),
        includeRecommendations,
        includeParentContact
      })
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast.success(`${selectedReportType} report generated for ${selectedStudents.length} student(s) in ${reportFormat.toUpperCase()} format!`)
      onClose()
    } catch (error) {
      toast.error('Failed to generate report. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const getReportTypeColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200'
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="reports-modal-title">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="p-6 border-b bg-orange-600 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-6 w-6 mr-3" aria-hidden="true" />
              <div>
                <h2 id="reports-modal-title" className="text-xl font-bold">Generate Academic Performance Reports</h2>
                <p className="text-orange-100">Create detailed reports for students requiring attention</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="text-white border-white hover:bg-white hover:text-orange-600"
              aria-label="Close report generator"
            >
              Close
            </Button>
          </div>
        </header>
        
        <main className="p-6 space-y-6">
          {/* Report Type Selection */}
          <section aria-labelledby="report-type-title">
            <h3 id="report-type-title" className="font-semibold mb-4">Select Report Type:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setSelectedReportType(type.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedReportType === type.id
                      ? `${getReportTypeColor(type.color)} border-current`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  role="button"
                  aria-pressed={selectedReportType === type.id}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedReportType(type.id)}
                >
                  <div className="flex items-center space-x-3">
                    <type.icon className={`h-6 w-6 ${
                      selectedReportType === type.id ? 'text-current' : 'text-gray-600'
                    }`} aria-hidden="true" />
                    <div>
                      <h4 className="font-medium">{type.name}</h4>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student Selection */}
            <section aria-labelledby="student-selection-title">
              <div className="flex items-center justify-between mb-4">
                <h3 id="student-selection-title" className="font-semibold">Select Students for Report:</h3>
                <div className="space-x-2">
                  <Button size="sm" variant="outline" onClick={selectAllStudents} disabled={isGenerating}>
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearSelection} disabled={isGenerating}>
                    Clear
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {students.map((student) => (
                  <div key={student.id} className={`p-3 border rounded-lg transition-colors ${
                    selectedStudents.includes(student.id) ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`student-${student.id}`}
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        disabled={isGenerating}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`student-${student.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{student.name}</h4>
                            <p className="text-sm text-gray-600">{student.student_id} • {student.class}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-red-600">{student.overall_average}%</div>
                            <div className={`px-2 py-1 text-xs rounded-full ${
                              student.risk_level === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {student.risk_level.toUpperCase()}
                            </div>
                          </div>
                        </div>
                        
                        {/* Quick Stats */}
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center">
                            <TrendingDown className="h-3 w-3 text-red-500 mr-1" aria-hidden="true" />
                            <span>{student.subjects.filter(s => s.score < 40).length} failing</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-3 w-3 text-blue-500 mr-1" aria-hidden="true" />
                            <span>{student.attendance_rate}% attendance</span>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Report Configuration */}
            <div className="space-y-6">
              {/* Format Selection */}
              <section aria-labelledby="format-title">
                <h3 id="format-title" className="font-semibold mb-3">Report Format:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {formats.map((format) => (
                    <Button
                      key={format.id}
                      variant={reportFormat === format.id ? 'default' : 'outline'}
                      onClick={() => setReportFormat(format.id)}
                      disabled={isGenerating}
                      className="justify-start"
                      aria-pressed={reportFormat === format.id}
                    >
                      <format.icon className="h-4 w-4 mr-2" aria-hidden="true" />
                      {format.name}
                    </Button>
                  ))}
                </div>
              </section>

              {/* Report Options */}
              <section aria-labelledby="options-title">
                <h3 id="options-title" className="font-semibold mb-3">Report Options:</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Include Recommendations</h4>
                      <p className="text-sm text-gray-600">Add intervention strategies and action plans</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeRecommendations}
                        onChange={(e) => setIncludeRecommendations(e.target.checked)}
                        disabled={isGenerating}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Include Parent Contact Info</h4>
                      <p className="text-sm text-gray-600">Add parent/guardian contact details</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeParentContact}
                        onChange={(e) => setIncludeParentContact(e.target.checked)}
                        disabled={isGenerating}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                </div>
              </section>

              {/* Report Preview */}
              <section aria-label="Report summary preview" className="p-4 bg-gray-50 border rounded-lg">
                <h4 className="font-medium mb-2">Report Preview:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• Report Type: {reportTypes.find(t => t.id === selectedReportType)?.name}</div>
                  <div>• Format: {formats.find(f => f.id === reportFormat)?.name}</div>
                  <div>• Students: {selectedStudents.length} selected</div>
                  <div>• Recommendations: {includeRecommendations ? 'Included' : 'Not included'}</div>
                  <div>• Parent Contact: {includeParentContact ? 'Included' : 'Not included'}</div>
                </div>
              </section>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4" aria-label="Risk level summary">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                  <div className="text-lg font-bold text-red-600">
                    {students.filter(s => s.risk_level === 'critical').length}
                  </div>
                  <div className="text-sm text-red-600">Critical Risk</div>
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-center">
                  <div className="text-lg font-bold text-orange-600">
                    {students.filter(s => s.risk_level === 'high').length}
                  </div>
                  <div className="text-sm text-orange-600">High Risk</div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Action Buttons */}
        <footer className="flex space-x-4 p-6 border-t sticky bottom-0 bg-white">
          <Button 
            onClick={handleGenerateReport}
            disabled={selectedStudents.length === 0 || isGenerating}
            className="flex-1 bg-orange-600 hover:bg-orange-700 transition-all duration-200"
            aria-busy={isGenerating}
            aria-label={isGenerating ? "Generating report..." : `Generate report for ${selectedStudents.length} students`}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" color="white" className="mr-2" />
                <span>Generating Report...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>Generate Report ({selectedStudents.length} students)</span>
              </div>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="px-8 border-gray-300 hover:bg-gray-100" 
            disabled={isGenerating}
            aria-label="Cancel and close report generator"
          >
            Cancel
          </Button>
        </footer>
      </div>
    </div>
  )
}
