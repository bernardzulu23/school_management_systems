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
} from 'lucide-react'

export default function TeacherAssignments({ teacherData }) {
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedClass, setSelectedClass] = useState(null)

  // Assigned subjects - will be loaded from API
  const [assignedSubjects, setAssignedSubjects] = useState([])

  // Assigned classes - will be loaded from API
  const [assignedClasses, setAssignedClasses] = useState([])

  const getStatusColor = (status) => {
    switch (status) {
      case 'ahead':
        return 'text-royalPurple-successTx bg-royalPurple-success'
      case 'on-track':
        return 'text-royalPurple-accentTx bg-royalPurple-accent'
      case 'behind':
        return 'text-royalPurple-dangerTx bg-royalPurple-danger'
      default:
        return 'text-royalPurple-text2 bg-royalPurple-card2'
    }
  }

  const getGradeColor = (grade) => {
    if (grade >= 80) return 'text-royalPurple-successTx'
    if (grade >= 70) return 'text-royalPurple-accentTx'
    if (grade >= 60) return 'text-yellow-600'
    return 'text-royalPurple-dangerTx'
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-royalPurple-border2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-royalPurple-accentTx text-sm font-medium">Total Subjects</p>
                <p className="text-2xl font-bold text-royalPurple-accentTx">
                  {assignedSubjects.length}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-royalPurple-accentTx" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-royalPurple-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-royalPurple-successTx text-sm font-medium">Total Classes</p>
                <p className="text-2xl font-bold text-royalPurple-successTx">
                  {assignedClasses.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-royalPurple-successTx" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-royalPurple-border2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-royalPurple-pillTx text-sm font-medium">Total Students</p>
                <p className="text-2xl font-bold text-royalPurple-pillTx">
                  {assignedSubjects.reduce((sum, subject) => sum + subject.totalStudents, 0)}
                </p>
              </div>
              <Target className="h-8 w-8 text-royalPurple-pillTx" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Avg. Performance</p>
                <p className="text-2xl font-bold text-orange-800">
                  {Math.round(
                    assignedSubjects.reduce((sum, subject) => sum + subject.averageGrade, 0) /
                      assignedSubjects.length
                  )}
                  %
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            My Assigned Subjects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {assignedSubjects.map((subject) => (
              <div
                key={subject.id}
                className="border border-royalPurple-border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
                onClick={() => setSelectedSubject(subject)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-royalPurple-text1">{subject.name}</h3>
                    <p className="text-sm text-royalPurple-text2">Code: {subject.code}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(subject.status)}`}
                  >
                    {subject.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-royalPurple-text2">Classes:</span>
                    <span className="font-medium">{subject.classes.join(', ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-royalPurple-text2">Students:</span>
                    <span className="font-medium">{subject.totalStudents}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-royalPurple-text2">Average Grade:</span>
                    <span className={`font-medium ${getGradeColor(subject.averageGrade)}`}>
                      {subject.averageGrade}%
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-royalPurple-text2">Progress:</span>
                    <span className="font-medium">
                      {subject.completedLessons}/{subject.totalLessons} lessons
                    </span>
                  </div>
                  <div className="w-full bg-royalPurple-card2 rounded-full h-2">
                    <div
                      className="bg-royalPurple-accent h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(subject.completedLessons / subject.totalLessons) * 100}%`,
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

      {/* Assigned Classes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            My Assigned Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {assignedClasses.map((classItem) => (
              <div
                key={classItem.id}
                className="border border-royalPurple-border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
                onClick={() => setSelectedClass(classItem)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-royalPurple-text1">{classItem.name}</h3>
                  {classItem.classTeacher && (
                    <span className="px-2 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-800">
                      Class Teacher
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-royalPurple-text2">Students:</span>
                    <span className="font-medium">
                      {classItem.students}/{classItem.capacity}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-royalPurple-text2">Subjects:</span>
                    <span className="font-medium">{classItem.subjects.join(', ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-royalPurple-text2">Attendance:</span>
                    <span className={`font-medium ${getGradeColor(classItem.averageAttendance)}`}>
                      {classItem.averageAttendance}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-royalPurple-text2">Avg. Grade:</span>
                    <span className={`font-medium ${getGradeColor(classItem.averageGrade)}`}>
                      {classItem.averageGrade}%
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="w-full bg-royalPurple-card2 rounded-full h-2">
                    <div
                      className="bg-royalPurple-success h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(classItem.students / classItem.capacity) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-royalPurple-text3 mt-1">Class Capacity</p>
                </div>

                <div className="text-sm text-royalPurple-text2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Next: {classItem.nextPeriod}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
