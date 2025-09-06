'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  AlertTriangle, Users, TrendingDown, Calendar, Phone, Mail,
  FileText, Target, Clock, BookOpen, User, GraduationCap,
  AlertCircle, XCircle, CheckCircle, Eye, MessageSquare
} from 'lucide-react'
import ContactParentsModal from './ContactParentsModal'
import GenerateReportsModal from './GenerateReportsModal'
import CreateSupportPlansModal from './CreateSupportPlansModal'
import ScheduleMeetingsModal from './ScheduleMeetingsModal'

export default function StudentAttentionSystem({ studentsData, performanceSummary }) {
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [filterRisk, setFilterRisk] = useState('all')
  const [activeModal, setActiveModal] = useState(null)
  const [selectedStudents, setSelectedStudents] = useState([])

  // Grading system functions
  const getGradeInfo = (score, gradeLevel) => {
    if (score === null || score === undefined) return { grade: 'X', status: 'ABSENT', color: 'gray' }
    
    // For Forms 1, 2 and Grade 9
    if (['form1', 'form2', 'grade9'].includes(gradeLevel)) {
      if (score >= 75) return { grade: 'ONE', status: 'DISTINCTION', color: 'green' }
      if (score >= 60) return { grade: 'TWO', status: 'MERIT', color: 'blue' }
      if (score >= 50) return { grade: 'THREE', status: 'CREDIT', color: 'purple' }
      if (score >= 40) return { grade: 'FOUR', status: 'PASS', color: 'yellow' }
      return { grade: 'F', status: 'FAIL', color: 'red' }
    }
    
    // For Forms 3, 4 and Grades 10, 11, 12
    if (['form3', 'form4', 'grade10', 'grade11', 'grade12'].includes(gradeLevel)) {
      if (score >= 75) return { grade: '1', status: 'DISTINCTION', color: 'green' }
      if (score >= 70) return { grade: '2', status: 'DISTINCTION', color: 'green' }
      if (score >= 65) return { grade: '3', status: 'MERIT', color: 'blue' }
      if (score >= 60) return { grade: '4', status: 'MERIT', color: 'blue' }
      if (score >= 55) return { grade: '5', status: 'CREDIT', color: 'purple' }
      if (score >= 50) return { grade: '6', status: 'CREDIT', color: 'purple' }
      if (score >= 45) return { grade: '7', status: 'SATISFACTORY', color: 'yellow' }
      if (score >= 40) return { grade: '8', status: 'SATISFACTORY', color: 'yellow' }
      return { grade: '9', status: 'UNSATISFACTORILY', color: 'red' }
    }
    
    return { grade: 'F', status: 'FAIL', color: 'red' }
  }

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getGradeColor = (color) => {
    const colors = {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800'
    }
    return colors[color] || 'bg-gray-100 text-gray-800'
  }

  const filteredStudents = studentsData?.filter(student => {
    if (filterRisk === 'all') return true
    return student.risk_level === filterRisk
  }) || []

  const handleContactParents = () => {
    setActiveModal('contact-parents')
  }

  const handleGenerateReports = () => {
    setActiveModal('generate-reports')
  }

  const handleCreateSupportPlans = () => {
    setActiveModal('create-support-plans')
  }

  const handleScheduleMeetings = () => {
    setActiveModal('schedule-meetings')
  }

  return (
    <div className="space-y-8">
      {/* Performance Summary */}
      <div className="backdrop-blur-lg bg-slate-800/60 border border-red-500/40 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-center mb-6">
          <div className="backdrop-blur-md bg-red-600/60 border border-red-400/50 rounded-2xl p-3 mr-4">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Students Requiring Immediate Attention
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="backdrop-blur-lg bg-slate-700/60 border border-red-500/40 rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300">
            <div className="text-3xl font-bold text-white mb-2">
              {performanceSummary?.students_requiring_attention || 0}
            </div>
            <div className="text-red-300 font-medium">Students Below 40%</div>
          </div>
          <div className="backdrop-blur-lg bg-slate-700/60 border border-red-600/40 rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300">
            <div className="text-3xl font-bold text-white mb-2">
              {performanceSummary?.critical_risk_students || 0}
            </div>
            <div className="text-red-300 font-medium">Critical Risk</div>
          </div>
          <div className="backdrop-blur-lg bg-slate-700/60 border border-orange-500/40 rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300">
            <div className="text-3xl font-bold text-white mb-2">
              {performanceSummary?.high_risk_students || 0}
            </div>
            <div className="text-orange-300 font-medium">High Risk</div>
          </div>
          <div className="backdrop-blur-lg bg-slate-700/60 border border-blue-500/40 rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300">
            <div className="text-3xl font-bold text-white mb-2">
              {performanceSummary?.average_school_performance || 0}%
            </div>
            <div className="text-blue-300 font-medium">School Average</div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Filter by Risk Level:</span>
            <div className="flex space-x-2">
              {['all', 'critical', 'high', 'medium'].map((risk) => (
                <Button
                  key={risk}
                  variant={filterRisk === risk ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterRisk(risk)}
                  className="capitalize"
                >
                  {risk === 'all' ? 'All Students' : `${risk} Risk`}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredStudents.map((student) => (
          <Card key={student.id} className={`border-l-4 ${
            student.risk_level === 'critical' ? 'border-l-red-500' : 
            student.risk_level === 'high' ? 'border-l-orange-500' : 'border-l-yellow-500'
          }`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{student.name}</h3>
                    <p className="text-sm text-gray-600">{student.student_id} • {student.class}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full border ${getRiskLevelColor(student.risk_level)}`}>
                  {student.risk_level.toUpperCase()} RISK
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Overall Performance */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Average</span>
                    <span className="text-lg font-bold text-red-600">{student.overall_average}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Grade</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getGradeColor('red')}`}>
                      {student.overall_grade} - {student.overall_status}
                    </span>
                  </div>
                </div>

                {/* Subject Performance */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Subject Performance</h4>
                  <div className="space-y-2">
                    {student.subjects.map((subject, index) => {
                      const gradeInfo = getGradeInfo(subject.score, student.grade_level)
                      return (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{subject.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{subject.score}%</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getGradeColor(gradeInfo.color)}`}>
                              {subject.grade}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span>Attendance: {student.attendance_rate}%</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span>Last Test: {new Date(student.last_assessment).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Contact Parent
                  </Button>
                  <Button size="sm" className="flex-1">
                    <Target className="h-4 w-4 mr-1" />
                    Create Plan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Challenging Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Most Challenging Subjects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {performanceSummary?.subjects_most_challenging?.map((subject, index) => (
              <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-red-800">{subject}</span>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <p className="text-sm text-red-600 mt-1">Requires immediate intervention</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Classes Needing Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GraduationCap className="h-5 w-5 mr-2" />
            Classes Needing Support
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {performanceSummary?.classes_needing_support?.map((className, index) => (
              <div key={index} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-orange-800">{className}</span>
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-sm text-orange-600 mt-1">Multiple students below 40%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="backdrop-blur-lg bg-slate-800/60 border border-orange-500/40 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-center mb-6">
          <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-2xl p-3 mr-4">
            <AlertCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
            Immediate Actions Required
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <button
            onClick={handleContactParents}
            className="backdrop-blur-lg bg-slate-700/60 border border-red-500/40 rounded-2xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 group"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="backdrop-blur-md bg-red-600/60 border border-red-400/50 rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <span className="font-bold text-white text-lg">Contact Parents</span>
            </div>
          </button>

          <button
            onClick={handleGenerateReports}
            className="backdrop-blur-lg bg-slate-700/60 border border-orange-500/40 rounded-2xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 group"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <span className="font-bold text-white text-lg">Generate Reports</span>
            </div>
          </button>

          <button
            onClick={handleCreateSupportPlans}
            className="backdrop-blur-lg bg-slate-700/60 border border-blue-500/40 rounded-2xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 group"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="backdrop-blur-md bg-blue-600/60 border border-blue-400/50 rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
                <Target className="h-8 w-8 text-white" />
              </div>
              <span className="font-bold text-white text-lg">Create Support Plans</span>
            </div>
          </button>

          <button
            onClick={handleScheduleMeetings}
            className="backdrop-blur-lg bg-slate-700/60 border border-purple-500/40 rounded-2xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 group"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="backdrop-blur-md bg-purple-600/60 border border-purple-400/50 rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <span className="font-bold text-white text-lg">Schedule Meetings</span>
            </div>
          </button>
        </div>
      </div>

      {/* Modal Components */}
      {activeModal === 'contact-parents' && (
        <ContactParentsModal
          students={filteredStudents}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'generate-reports' && (
        <GenerateReportsModal
          students={filteredStudents}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'create-support-plans' && (
        <CreateSupportPlansModal
          students={filteredStudents}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'schedule-meetings' && (
        <ScheduleMeetingsModal
          students={filteredStudents}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  )
}
