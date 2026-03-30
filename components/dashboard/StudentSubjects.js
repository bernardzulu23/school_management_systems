'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  BookOpen,
  Users,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  ChevronRight,
  Star,
  Award,
  CheckCircle,
  AlertCircle,
  BarChart3,
  User,
  FileText,
  Trophy,
} from 'lucide-react'

export default function StudentSubjects({ studentData }) {
  const [selectedSubject, setSelectedSubject] = useState(null)

  const student = studentData?.student || {}
  const stats = studentData?.stats || {}

  const enrolledSubjects = studentData?.enrolled_subjects || []

  const studentInfo = {
    name: student.name || 'Student',
    studentId: student.examNumber || 'N/A',
    yearGroup: student.class ? student.class.replace(/[A-Z]$/, '') : 'N/A', // "Form 3A" -> "Form 3" (approx)
    class: student.class || 'N/A',
    overallGrade: Math.round(stats.average_grade || 0),
    ranking: 'N/A',
    totalSubjects: enrolledSubjects.length,
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent':
        return 'text-royalPurple-successTx bg-royalPurple-success'
      case 'good':
        return 'text-royalPurple-accentTx bg-royalPurple-accent'
      case 'needs-improvement':
        return 'text-royalPurple-dangerTx bg-royalPurple-danger'
      default:
        return 'text-royalPurple-text2 bg-royalPurple-card2'
    }
  }

  const getGradeColor = (grade) => {
    if (grade >= 85) return 'text-royalPurple-successTx'
    if (grade >= 75) return 'text-royalPurple-accentTx'
    if (grade >= 65) return 'text-royalPurple-accentTx'
    return 'text-royalPurple-dangerTx'
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-royalPurple-successTx" />
      case 'declining':
        return <TrendingUp className="h-4 w-4 text-royalPurple-dangerTx transform rotate-180" />
      default:
        return <Target className="h-4 w-4 text-royalPurple-accentTx" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Student Overview */}
      <Card className="bg-royalPurple-card border border-royalPurple-border2">
        <CardHeader>
          <CardTitle className="flex items-center text-royalPurple-accentTx">
            <User className="h-6 w-6 mr-2" />
            Academic Overview - {studentInfo.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-royalPurple-accentTx">
                {studentInfo.yearGroup}
              </div>
              <div className="text-sm text-royalPurple-accentTx">Year Group</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-royalPurple-accentTx">
                {studentInfo.class}
              </div>
              <div className="text-sm text-royalPurple-accentTx">Class</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-royalPurple-accentTx">
                {studentInfo.totalSubjects}
              </div>
              <div className="text-sm text-royalPurple-accentTx">Subjects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-royalPurple-accentTx">
                #{studentInfo.ranking}
              </div>
              <div className="text-sm text-royalPurple-accentTx">Class Rank</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-royalPurple-card rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-royalPurple-text2">
                Overall Performance
              </span>
              <span className="text-lg font-bold text-royalPurple-accentTx">
                {studentInfo.overallGrade}%
              </span>
            </div>
            <div className="w-full bg-royalPurple-card2 rounded-full h-3 mt-2">
              <div
                className="bg-royalPurple-accent h-3 rounded-full transition-all duration-300"
                style={{ width: `${studentInfo.overallGrade}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-royalPurple-card border border-royalPurple-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-royalPurple-successTx text-sm font-medium">Excellent</p>
                <p className="text-2xl font-bold text-royalPurple-successTx">
                  {enrolledSubjects.filter((s) => s.status === 'excellent').length}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-royalPurple-successTx" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-royalPurple-card border border-royalPurple-border2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-royalPurple-accentTx text-sm font-medium">Good</p>
                <p className="text-2xl font-bold text-royalPurple-accentTx">
                  {enrolledSubjects.filter((s) => s.status === 'good').length}
                </p>
              </div>
              <Star className="h-8 w-8 text-royalPurple-accentTx" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-royalPurple-card border border-royalPurple-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-royalPurple-dangerTx text-sm font-medium">Needs Work</p>
                <p className="text-2xl font-bold text-royalPurple-dangerTx">
                  {enrolledSubjects.filter((s) => s.status === 'needs-improvement').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-royalPurple-dangerTx" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-royalPurple-card border border-royalPurple-border2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-royalPurple-pillTx text-sm font-medium">Avg. Grade</p>
                <p className="text-2xl font-bold text-royalPurple-pillTx">
                  {Math.round(
                    enrolledSubjects.reduce((sum, subject) => sum + subject.currentGrade, 0) /
                      enrolledSubjects.length
                  )}
                  %
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-royalPurple-pillTx" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            My Enrolled Subjects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {enrolledSubjects.map((subject) => (
              <div
                key={subject.id}
                className="border border-royalPurple-border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-royalPurple-card"
                onClick={() => setSelectedSubject(subject)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-royalPurple-text1">{subject.name}</h3>
                    <p className="text-sm text-royalPurple-text2">Teacher: {subject.teacher}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(subject.trend)}
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(subject.status)}`}
                    >
                      {subject.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-royalPurple-text2">Current Grade:</span>
                    <span className={`font-bold text-lg ${getGradeColor(subject.currentGrade)}`}>
                      {subject.currentGrade}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-royalPurple-text2">Assignments:</span>
                    <span className="font-medium">
                      {subject.completedAssignments}/{subject.assignments}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-royalPurple-text2">Attendance:</span>
                    <span className={`font-medium ${getGradeColor(subject.attendance)}`}>
                      {subject.attendance}%
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-royalPurple-text2">Progress:</span>
                    <span className="font-medium">
                      {subject.completedAssignments}/{subject.assignments} completed
                    </span>
                  </div>
                  <div className="w-full bg-royalPurple-card2 rounded-full h-2">
                    <div
                      className="bg-royalPurple-accent h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(subject.completedAssignments / subject.assignments) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-royalPurple-text2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Next Assessment: {new Date(subject.nextAssessment).toLocaleDateString()}
                  </div>
                  <ChevronRight className="h-4 w-4 text-royalPurple-text3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Upcoming Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {enrolledSubjects
              .filter((s) => s.nextAssessment)
              .sort((a, b) => new Date(a.nextAssessment) - new Date(b.nextAssessment))
              .slice(0, 3)
              .map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-gray-50 to-white"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-royalPurple-accent flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-royalPurple-accentTx" />
                    </div>
                    <div>
                      <h4 className="font-medium text-royalPurple-text1">{subject.name}</h4>
                      <p className="text-sm text-royalPurple-text2">Teacher: {subject.teacher}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-royalPurple-text1">
                      {new Date(subject.nextAssessment).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-royalPurple-text3">
                      {Math.ceil(
                        (new Date(subject.nextAssessment) - new Date()) / (1000 * 60 * 60 * 24)
                      )}{' '}
                      days left
                    </div>
                  </div>
                </div>
              ))}
            {enrolledSubjects.filter((s) => s.nextAssessment).length === 0 && (
              <div className="text-center py-4 text-royalPurple-text3 text-sm">
                No upcoming assessments
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
