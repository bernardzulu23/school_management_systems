'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
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

  const handleGenerateReport = () => {
    const selectedStudentData = students.filter(s => selectedStudents.includes(s.id))
    
    // Here you would implement the actual report generation
    console.log('Generating report:', {
      type: selectedReportType,
      format: reportFormat,
      students: selectedStudentData.map(s => s.name),
      includeRecommendations,
      includeParentContact
    })
    
    // Simulate report generation
    alert(`${selectedReportType} report generated for ${selectedStudents.length} student(s) in ${reportFormat.toUpperCase()} format!`)
    onClose()
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b bg-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-6 w-6 mr-3" />
              <div>
                <h2 className="text-xl font-bold">Generate Academic Performance Reports</h2>
                <p className="text-orange-100">Create detailed reports for students requiring attention</p>
              </div>
            </div>
            <Button variant="outline" onClick={onClose} className="text-white border-white hover:bg-white hover:text-orange-600">
              Close
            </Button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Report Type Selection */}
          <div>
            <h3 className="font-semibold mb-4">Select Report Type:</h3>
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
                >
                  <div className="flex items-center space-x-3">
                    <type.icon className={`h-6 w-6 ${
                      selectedReportType === type.id ? 'text-current' : 'text-gray-600'
                    }`} />
                    <div>
                      <h4 className="font-medium">{type.name}</h4>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Select Students for Report:</h3>
                <div className="space-x-2">
                  <Button size="sm" variant="outline" onClick={selectAllStudents}>
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {students.map((student) => (
                  <div key={student.id} className={`p-3 border rounded-lg ${
                    selectedStudents.includes(student.id) ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
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
                            <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                            <span>{student.subjects.filter(s => s.score < 40).length} failing</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-3 w-3 text-blue-500 mr-1" />
                            <span>{student.attendance_rate}% attendance</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report Configuration */}
            <div className="space-y-6">
              {/* Format Selection */}
              <div>
                <h3 className="font-semibold mb-3">Report Format:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {formats.map((format) => (
                    <Button
                      key={format.id}
                      variant={reportFormat === format.id ? 'default' : 'outline'}
                      onClick={() => setReportFormat(format.id)}
                      className="justify-start"
                    >
                      <format.icon className="h-4 w-4 mr-2" />
                      {format.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Report Options */}
              <div>
                <h3 className="font-semibold mb-3">Report Options:</h3>
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
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Report Preview */}
              <div className="p-4 bg-gray-50 border rounded-lg">
                <h4 className="font-medium mb-2">Report Preview:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• Report Type: {reportTypes.find(t => t.id === selectedReportType)?.name}</div>
                  <div>• Format: {formats.find(f => f.id === reportFormat)?.name}</div>
                  <div>• Students: {selectedStudents.length} selected</div>
                  <div>• Recommendations: {includeRecommendations ? 'Included' : 'Not included'}</div>
                  <div>• Parent Contact: {includeParentContact ? 'Included' : 'Not included'}</div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
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

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4 border-t">
            <Button 
              onClick={handleGenerateReport}
              disabled={selectedStudents.length === 0}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Generate Report ({selectedStudents.length} students)
            </Button>
            <Button variant="outline" onClick={onClose} className="px-8">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
