'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useHeadteacher } from '@/lib/context/HeadteacherContext'
import { currentTermLabel } from '@/lib/academic/currentTerm'
import {
  AlertTriangle,
  Users,
  TrendingDown,
  Calendar,
  Phone,
  Mail,
  FileText,
  Target,
  Clock,
  BookOpen,
  User,
  GraduationCap,
  AlertCircle,
  XCircle,
  CheckCircle,
  Eye,
  MessageSquare,
} from 'lucide-react'
import ContactParentsModal from './ContactParentsModal'
import GenerateReportsModal from './GenerateReportsModal'
import CreateSupportPlansModal from './CreateSupportPlansModal'
import ScheduleMeetingsModal from './ScheduleMeetingsModal'
import { percentTextClass } from '@/lib/utils/percentColor'
import { calculateGrade } from '@/lib/gradingSystem'

function formatLastAssessment(value) {
  if (!value) return 'No assessment yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No assessment yet'
  return date.toLocaleDateString()
}

function formatAttendanceRate(value) {
  if (value === null || value === undefined) return 'No records'
  const n = Number(value)
  if (!Number.isFinite(n)) return 'No records'
  return `${n}%`
}

export default function StudentAttentionSystem({ studentsData, performanceSummary }) {
  const { selectedTerm, setSelectedTerm } = useHeadteacher()
  const activeTerm =
    performanceSummary?.term && performanceSummary.term !== 'All Terms'
      ? performanceSummary.term
      : selectedTerm && selectedTerm !== 'All Terms'
        ? selectedTerm
        : currentTermLabel()
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [filterRisk, setFilterRisk] = useState('all')
  const [activeModal, setActiveModal] = useState(null)
  const [selectedStudents, setSelectedStudents] = useState([])

  const getGradeInfo = (score, gradeLevel) => calculateGrade(score, gradeLevel)

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx border-royalPurple-border'
      case 'high':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx border-royalPurple-border'
      case 'medium':
        return 'bg-royalPurple-accentBg text-royalPurple-accentTx border-royalPurple-border2'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1 border-royalPurple-border'
    }
  }

  const getGradeColor = (color) => {
    const colors = {
      green: 'bg-royalPurple-success text-royalPurple-successTx',
      blue: 'bg-royalPurple-accent text-royalPurple-accentTx',
      purple: 'bg-royalPurple-pill text-royalPurple-pillTx',
      yellow: 'bg-royalPurple-accentBg text-royalPurple-accentTx',
      red: 'bg-royalPurple-danger text-royalPurple-dangerTx',
      gray: 'bg-royalPurple-card2 text-royalPurple-text1',
    }
    return colors[color] || 'bg-royalPurple-card2 text-royalPurple-text1'
  }

  const filteredStudents =
    studentsData?.filter((student) => {
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
      <div className="backdrop-blur-lg bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-center mb-6">
          <div className="backdrop-blur-md bg-royalPurple-danger/60 border border-royalPurple-border/50 rounded-2xl p-3 mr-4">
            <AlertTriangle className="h-8 w-8 text-royalPurple-text1" />
          </div>
          <h2 className="text-3xl font-bold text-royalPurple-text1">
            Students Requiring Immediate Attention
          </h2>
        </div>

        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <p className="text-royalPurple-text2 text-sm text-center md:text-left">
            Showing students with subject scores below 40% for{' '}
            <span className="font-semibold text-royalPurple-text1">{activeTerm}</span>.
          </p>
          <label className="flex flex-col gap-1 text-xs text-royalPurple-text2 self-center md:self-auto">
            Academic term
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-royalPurple-card border border-royalPurple-border rounded-lg px-3 py-2 text-sm text-royalPurple-text1 min-w-[140px]"
            >
              <option value="All Terms">All terms</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="backdrop-blur-lg bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300">
            <div className="text-3xl font-bold text-royalPurple-text1 mb-2">
              {performanceSummary?.students_requiring_attention || 0}
            </div>
            <div className="text-royalPurple-dangerTx font-medium">
              Students Below 40% ({activeTerm})
            </div>
          </div>
          <div className="backdrop-blur-lg bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300">
            <div className="text-3xl font-bold text-royalPurple-text1 mb-2">
              {performanceSummary?.critical_risk_students || 0}
            </div>
            <div className="text-royalPurple-dangerTx font-medium">Critical Risk</div>
          </div>
          <div className="backdrop-blur-lg bg-royalPurple-muted/60 border border-royalPurple-border2/40 rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300">
            <div className="text-3xl font-bold text-royalPurple-text1 mb-2">
              {performanceSummary?.high_risk_students || 0}
            </div>
            <div className="text-royalPurple-text2 font-medium">High Risk</div>
          </div>
          <div className="backdrop-blur-lg bg-royalPurple-muted/60 border border-royalPurple-border2/40 rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300">
            <div className="text-3xl font-bold text-royalPurple-text1 mb-2">
              <span className={percentTextClass(performanceSummary?.average_school_performance)}>
                {Number(performanceSummary?.average_school_performance) || 0}%
              </span>
            </div>
            <div className="text-royalPurple-accentTx font-medium">School Average</div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-royalPurple-text2">
              Filter by Risk Level:
            </span>
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
          <Card
            key={student.id}
            className={`border-l-4 ${
              student.risk_level === 'critical'
                ? 'border-l-red-500'
                : student.risk_level === 'high'
                  ? 'border-l-royalPurple-accent'
                  : 'border-l-royalPurple-border2'
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-royalPurple-card2 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-royalPurple-text2" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-royalPurple-text1">{student.name}</h3>
                    <p className="text-sm text-royalPurple-text2">
                      {student.student_id ? `Exam ${student.student_id}` : 'No exam number'}
                      {student.class ? ` • ${student.class}` : ''}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full border ${getRiskLevelColor(student.risk_level)}`}
                >
                  {student.risk_level.toUpperCase()} RISK
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Overall Performance */}
                <div className="bg-royalPurple-page p-3 rounded-lg text-royalPurple-text1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-royalPurple-text1">
                      Overall Average
                    </span>
                    <span
                      className={`text-lg font-bold ${percentTextClass(student.overall_average)}`}
                    >
                      {Number(student.overall_average) || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-royalPurple-text2">Grade</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getGradeColor('red')}`}>
                      {student.overall_grade} - {student.overall_status}
                    </span>
                  </div>
                </div>

                {/* Subject Performance */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-royalPurple-text1">
                    Subject Performance
                  </h4>
                  <div className="space-y-2">
                    {student.subjects.map((subject, index) => {
                      const gradeInfo = getGradeInfo(subject.score, student.grade_level)
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-royalPurple-page rounded text-royalPurple-text1"
                        >
                          <span className="text-sm text-royalPurple-text1">{subject.name}</span>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-sm font-medium ${percentTextClass(subject.score)}`}
                            >
                              {Number(subject.score) || 0}%
                            </span>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${getGradeColor(gradeInfo.color)}`}
                            >
                              {subject.grade}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 text-sm text-royalPurple-text1">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-royalPurple-text3" />
                    <span>
                      Attendance:{' '}
                      <span className={percentTextClass(student.attendance_rate)}>
                        {formatAttendanceRate(student.attendance_rate)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-royalPurple-text3" />
                    <span>Last Test: {formatLastAssessment(student.last_assessment)}</span>
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

      {filteredStudents.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-royalPurple-text2">
            No students scored below 40% in {activeTerm}. Try another term or check that results
            have been entered.
          </CardContent>
        </Card>
      )}

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
              <div
                key={index}
                className="p-4 bg-royalPurple-danger border border-royalPurple-border rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-royalPurple-dangerTx">{subject}</span>
                  <AlertCircle className="h-5 w-5 text-royalPurple-dangerTx" />
                </div>
                <p className="text-sm text-royalPurple-dangerTx mt-1">
                  Requires immediate intervention
                </p>
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
      <div className="backdrop-blur-lg bg-royalPurple-card/60 border border-orange-500/40 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-center mb-6">
          <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-2xl p-3 mr-4">
            <AlertCircle className="h-8 w-8 text-royalPurple-text1" />
          </div>
          <h2 className="text-3xl font-bold text-royalPurple-text1">Immediate Actions Required</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <button
            onClick={handleContactParents}
            className="backdrop-blur-lg bg-royalPurple-muted/60 border border-royalPurple-border/40 rounded-2xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 group"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="backdrop-blur-md bg-royalPurple-danger/60 border border-royalPurple-border/50 rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
                <Phone className="h-8 w-8 text-royalPurple-text1" />
              </div>
              <span className="font-bold text-royalPurple-text1 text-lg">Contact Parents</span>
            </div>
          </button>

          <button
            onClick={handleGenerateReports}
            className="backdrop-blur-lg bg-royalPurple-muted/60 border border-orange-500/40 rounded-2xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 group"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="backdrop-blur-md bg-orange-600/60 border border-orange-400/50 rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-8 w-8 text-royalPurple-text1" />
              </div>
              <span className="font-bold text-royalPurple-text1 text-lg">Generate Reports</span>
            </div>
          </button>

          <button
            onClick={handleCreateSupportPlans}
            className="backdrop-blur-lg bg-royalPurple-muted/60 border border-royalPurple-border2/40 rounded-2xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 group"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="backdrop-blur-md bg-royalPurple-accent/60 border border-royalPurple-border2/50 rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
                <Target className="h-8 w-8 text-royalPurple-text1" />
              </div>
              <span className="font-bold text-royalPurple-text1 text-lg">Create Support Plans</span>
            </div>
          </button>

          <button
            onClick={handleScheduleMeetings}
            className="backdrop-blur-lg bg-royalPurple-muted/60 border border-royalPurple-border2/40 rounded-2xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 group"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="backdrop-blur-md bg-royalPurple-pill/60 border border-royalPurple-border2/50 rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-royalPurple-text1" />
              </div>
              <span className="font-bold text-royalPurple-text1 text-lg">Schedule Meetings</span>
            </div>
          </button>
        </div>
      </div>

      {/* Modal Components */}
      {activeModal === 'contact-parents' && (
        <ContactParentsModal students={filteredStudents} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'generate-reports' && (
        <GenerateReportsModal students={filteredStudents} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'create-support-plans' && (
        <CreateSupportPlansModal students={filteredStudents} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'schedule-meetings' && (
        <ScheduleMeetingsModal students={filteredStudents} onClose={() => setActiveModal(null)} />
      )}
    </div>
  )
}
