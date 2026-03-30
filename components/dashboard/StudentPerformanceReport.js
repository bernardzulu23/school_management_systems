'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  User,
  GraduationCap,
  BookOpen,
  TrendingDown,
  Calendar,
  Phone,
  Mail,
  FileText,
  Target,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
} from 'lucide-react'
import { calculateGrade, getGradeColorClasses, getPerformanceInsights } from '@/lib/gradingSystem'

export default function StudentPerformanceReport({ student, onClose }) {
  if (!student) return null

  const insights = getPerformanceInsights(student)

  const getAttendanceColor = (rate) => {
    if (rate >= 90) return 'text-royalPurple-successTx'
    if (rate >= 75) return 'text-royalPurple-text2'
    return 'text-royalPurple-dangerTx'
  }

  return (
    <div className="fixed inset-0 bg-royalPurple-deep bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-royalPurple-card border border-royalPurple-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-royalPurple-card2 border-b border-royalPurple-border px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-royalPurple-card border border-royalPurple-border rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-royalPurple-text2" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{student.name}</h2>
                <p className="text-royalPurple-text2">
                  {student.student_id} • {student.class} • {student.grade_level.toUpperCase()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              className="text-royalPurple-text2 hover:text-royalPurple-text1"
            >
              Close
            </Button>
          </div>
        </div>

        <div className="bg-royalPurple-card px-6 py-4 space-y-6">
          {/* Critical Alert */}
          <Card className="border-l-4 border-l-red-500 bg-royalPurple-danger">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 text-royalPurple-dangerTx mr-3" />
                <div>
                  <h3 className="font-semibold text-royalPurple-dangerTx">
                    Immediate Attention Required
                  </h3>
                  <p className="text-sm text-royalPurple-dangerTx">
                    Student is performing below the 40% minimum standard and requires urgent
                    academic intervention.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-royalPurple-dangerTx">
                  {student.overall_average}%
                </div>
                <div className="text-sm text-royalPurple-text2">Overall Average</div>
                <div
                  className={`mt-2 px-2 py-1 text-xs rounded-full ${getGradeColorClasses('red')}`}
                >
                  {student.overall_grade} - {student.overall_status}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div
                  className={`text-2xl font-bold ${getAttendanceColor(student.attendance_rate)}`}
                >
                  {student.attendance_rate}%
                </div>
                <div className="text-sm text-royalPurple-text2">Attendance Rate</div>
                <div className="text-xs text-royalPurple-text3 mt-1">
                  {student.attendance_rate < 75
                    ? 'Poor'
                    : student.attendance_rate < 90
                      ? 'Fair'
                      : 'Good'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-royalPurple-text2">
                  {student.subjects.filter((s) => s.score < 40).length}
                </div>
                <div className="text-sm text-royalPurple-text2">Failing Subjects</div>
                <div className="text-xs text-royalPurple-text3 mt-1">
                  Out of {student.subjects.length} subjects
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div
                  className={`text-2xl font-bold ${
                    student.risk_level === 'critical'
                      ? 'text-royalPurple-dangerTx'
                      : student.risk_level === 'high'
                        ? 'text-royalPurple-dangerTx'
                        : 'text-royalPurple-accentTx'
                  }`}
                >
                  {student.risk_level.toUpperCase()}
                </div>
                <div className="text-sm text-royalPurple-text2">Risk Level</div>
                <div className="text-xs text-royalPurple-text3 mt-1">Academic Risk</div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Performance Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Subject Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {student.subjects.map((subject, index) => {
                  const gradeInfo = calculateGrade(subject.score, student.grade_level)
                  const isFailure = subject.score < 40

                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${isFailure ? 'bg-royalPurple-danger border-royalPurple-border' : 'bg-royalPurple-page border-royalPurple-border'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {isFailure ? (
                            <XCircle className="h-5 w-5 text-royalPurple-dangerTx" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-royalPurple-successTx" />
                          )}
                          <div>
                            <h4 className="font-medium">{subject.name}</h4>
                            <p className="text-sm text-royalPurple-text2">
                              {isFailure
                                ? 'Requires immediate attention'
                                : 'Meeting minimum standards'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{subject.score}%</div>
                          <div
                            className={`px-2 py-1 text-xs rounded-full ${getGradeColorClasses(gradeInfo.color)}`}
                          >
                            {gradeInfo.grade} - {gradeInfo.status}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-royalPurple-card2 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${isFailure ? 'bg-royalPurple-danger' : 'bg-royalPurple-success'}`}
                            style={{ width: `${Math.min(subject.score, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-royalPurple-text3 mt-1">
                          <span>0%</span>
                          <span className="font-medium">Pass: 40%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths and Weaknesses */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights.strengths.length > 0 && (
                  <div>
                    <h4 className="font-medium text-royalPurple-successTx mb-2">Strengths</h4>
                    <ul className="space-y-1">
                      {insights.strengths.map((strength, index) => (
                        <li
                          key={index}
                          className="text-sm text-royalPurple-successTx flex items-start"
                        >
                          <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.weaknesses.length > 0 && (
                  <div>
                    <h4 className="font-medium text-royalPurple-dangerTx mb-2">Areas of Concern</h4>
                    <ul className="space-y-1">
                      {insights.weaknesses.map((weakness, index) => (
                        <li
                          key={index}
                          className="text-sm text-royalPurple-dangerTx flex items-start"
                        >
                          <XCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.riskFactors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-royalPurple-text2 mb-2">Risk Factors</h4>
                    <ul className="space-y-1">
                      {insights.riskFactors.map((risk, index) => (
                        <li key={index} className="text-sm text-royalPurple-text2 flex items-start">
                          <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-royalPurple-dangerTx" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.recommendations.map((recommendation, index) => (
                    <div
                      key={index}
                      className="p-3 bg-royalPurple-accent border border-royalPurple-border2 rounded-lg"
                    >
                      <div className="flex items-start">
                        <Target className="h-4 w-4 text-royalPurple-accentTx mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-royalPurple-accentTx">{recommendation}</span>
                      </div>
                    </div>
                  ))}

                  {/* Standard recommendations for failing students */}
                  <div className="p-3 bg-royalPurple-danger border border-royalPurple-border rounded-lg">
                    <div className="flex items-start">
                      <Phone className="h-4 w-4 text-royalPurple-dangerTx mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-royalPurple-dangerTx">
                        Schedule immediate parent/guardian conference
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-royalPurple-card2 border border-royalPurple-border rounded-lg">
                    <div className="flex items-start">
                      <FileText className="h-4 w-4 text-royalPurple-text2 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-royalPurple-text1">
                        Develop individualized academic support plan
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline and Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Assessment Timeline & Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-royalPurple-page rounded-lg">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-royalPurple-text2 mr-2" />
                    <span className="text-sm">Last Assessment</span>
                  </div>
                  <span className="text-sm font-medium">
                    {new Date(student.last_assessment).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-royalPurple-danger border border-royalPurple-border rounded-lg text-center">
                    <div className="text-sm font-medium text-royalPurple-dangerTx">
                      Immediate (1-3 days)
                    </div>
                    <div className="text-xs text-royalPurple-dangerTx mt-1">
                      Contact parents, create support plan
                    </div>
                  </div>

                  <div className="p-3 bg-royalPurple-card2 border border-royalPurple-border rounded-lg text-center">
                    <div className="text-sm font-medium text-royalPurple-text1">
                      Short-term (1-2 weeks)
                    </div>
                    <div className="text-xs text-royalPurple-text2 mt-1">
                      Begin tutoring, monitor progress
                    </div>
                  </div>

                  <div className="p-3 bg-royalPurple-accent border border-royalPurple-border2 rounded-lg text-center">
                    <div className="text-sm font-medium text-royalPurple-accentTx">
                      Medium-term (1 month)
                    </div>
                    <div className="text-xs text-royalPurple-accentTx mt-1">
                      Reassess performance, adjust plan
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button className="flex-1 bg-royalPurple-danger hover:bg-royalPurple-danger">
              <Phone className="h-4 w-4 mr-2" />
              Contact Parent/Guardian
            </Button>
            <Button className="flex-1 bg-royalPurple-accent hover:opacity-90 text-royalPurple-deep">
              <FileText className="h-4 w-4 mr-2" />
              Create Support Plan
            </Button>
            <Button className="flex-1 bg-royalPurple-accent hover:bg-royalPurple-accent">
              <Target className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
            <Button variant="outline" className="flex-1">
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
