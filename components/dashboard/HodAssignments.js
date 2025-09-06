'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
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
  Building,
  UserCheck,
  GraduationCap
} from 'lucide-react'

export default function HodAssignments({ hodData }) {
  const [selectedDepartment, setSelectedDepartment] = useState(null)

  // Department data - will be loaded from API
  const [departmentData, setDepartmentData] = useState({
    name: '',
    code: '',
    totalTeachers: 0,
    totalStudents: 0,
    totalSubjects: 0,
    totalClasses: 0,
    averagePerformance: 0,
    departmentRanking: 0
  })

  // Department subjects - will be loaded from API
  const [departmentSubjects, setDepartmentSubjects] = useState([])

  // Department teachers - will be loaded from API
  const [departmentTeachers, setDepartmentTeachers] = useState([])

  const departmentClasses = [
    {
      id: 1,
      name: 'Form 1A',
      students: 28,
      capacity: 30,
      subjects: ['Mathematics'],
      classTeacher: 'Ms. Sarah Johnson',
      averageAttendance: 94,
      averageGrade: 76,
      performance: 'good'
    },
    {
      id: 2,
      name: 'Form 3A',
      students: 30,
      capacity: 30,
      subjects: ['Mathematics', 'Additional Mathematics'],
      classTeacher: 'Dr. Michael Brown',
      averageAttendance: 96,
      averageGrade: 82,
      performance: 'excellent'
    },
    {
      id: 3,
      name: 'Lower 6A',
      students: 25,
      capacity: 30,
      subjects: ['Additional Mathematics', 'Statistics'],
      classTeacher: 'Prof. James Wilson',
      averageAttendance: 98,
      averageGrade: 88,
      performance: 'outstanding'
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'outstanding': return 'text-purple-600 bg-purple-100'
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100'
      case 'needs-improvement': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getGradeColor = (grade) => {
    if (grade >= 85) return 'text-purple-600'
    if (grade >= 80) return 'text-green-600'
    if (grade >= 70) return 'text-blue-600'
    if (grade >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Department Overview */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-100 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center text-indigo-800">
            <Building className="h-6 w-6 mr-2" />
            {departmentData.name} Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-800">{departmentData.totalTeachers}</div>
              <div className="text-sm text-indigo-600">Teachers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-800">{departmentData.totalStudents}</div>
              <div className="text-sm text-indigo-600">Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-800">{departmentData.totalSubjects}</div>
              <div className="text-sm text-indigo-600">Subjects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-800">#{departmentData.departmentRanking}</div>
              <div className="text-sm text-indigo-600">Ranking</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Department Performance</span>
              <span className="text-lg font-bold text-indigo-800">{departmentData.averagePerformance}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-300" 
                style={{ width: `${departmentData.averagePerformance}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Department Subjects Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {departmentSubjects.map((subject) => (
              <div 
                key={subject.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
                    <p className="text-sm text-gray-600">Code: {subject.code}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(subject.status)}`}>
                    {subject.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Teachers:</span>
                    <span className="font-medium">{subject.teachers.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Classes:</span>
                    <span className="font-medium">{subject.classes.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Students:</span>
                    <span className="font-medium">{subject.totalStudents}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Average Grade:</span>
                    <span className={`font-medium ${getGradeColor(subject.averageGrade)}`}>
                      {subject.averageGrade}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pass Rate:</span>
                    <span className={`font-medium ${getGradeColor(subject.passRate)}`}>
                      {subject.passRate}%
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  <strong>Teachers:</strong> {subject.teachers.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department Teachers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="h-5 w-5 mr-2" />
            Department Teachers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {departmentTeachers.map((teacher) => (
              <div 
                key={teacher.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{teacher.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(teacher.performance)}`}>
                    {teacher.performance.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Experience:</span>
                    <span className="font-medium">{teacher.experience}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Students:</span>
                    <span className="font-medium">{teacher.totalStudents}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg. Grade:</span>
                    <span className={`font-medium ${getGradeColor(teacher.averageGrade)}`}>
                      {teacher.averageGrade}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Attendance:</span>
                    <span className={`font-medium ${getGradeColor(teacher.attendance)}`}>
                      {teacher.attendance}%
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Subjects:</strong> {teacher.subjects.join(', ')}</div>
                  <div><strong>Classes:</strong> {teacher.classes.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department Classes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GraduationCap className="h-5 w-5 mr-2" />
            Department Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {departmentClasses.map((classItem) => (
              <div 
                key={classItem.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(classItem.performance)}`}>
                    {classItem.performance.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Students:</span>
                    <span className="font-medium">{classItem.students}/{classItem.capacity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Class Teacher:</span>
                    <span className="font-medium text-xs">{classItem.classTeacher}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Attendance:</span>
                    <span className={`font-medium ${getGradeColor(classItem.averageAttendance)}`}>
                      {classItem.averageAttendance}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg. Grade:</span>
                    <span className={`font-medium ${getGradeColor(classItem.averageGrade)}`}>
                      {classItem.averageGrade}%
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(classItem.students / classItem.capacity) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Class Capacity</p>
                </div>

                <div className="text-xs text-gray-600">
                  <strong>Subjects:</strong> {classItem.subjects.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
