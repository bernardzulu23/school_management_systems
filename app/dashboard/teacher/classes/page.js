'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Users, UserCheck, TrendingUp, AlertCircle, Calendar, 
  ArrowLeft, Search, Filter, Download, Eye, Edit, MessageCircle
} from 'lucide-react'
import Link from 'next/link'

export default function TeacherClassesPage() {
  const [selectedClass, setSelectedClass] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')

  // Sample teacher's classes data
  const teacherClasses = [
    {
      id: 1,
      name: 'Class 9A - Mathematics',
      subject: 'Mathematics',
      yearGroup: 'Year 9',
      totalStudents: 28,
      presentToday: 26,
      averagePerformance: 85,
      attendanceRate: 94,
      nextLesson: '2024-01-25 10:00',
      recentAssessment: 'Algebra Test - 88% average',
      classTeacher: 'Ms. Sarah Johnson'
    },
    {
      id: 2,
      name: 'Class 10B - Mathematics',
      subject: 'Mathematics',
      yearGroup: 'Year 10',
      totalStudents: 25,
      presentToday: 24,
      averagePerformance: 78,
      attendanceRate: 91,
      nextLesson: '2024-01-25 14:00',
      recentAssessment: 'Trigonometry Quiz - 82% average',
      classTeacher: 'Mr. David Wilson'
    },
    {
      id: 3,
      name: 'Class 8C - Mathematics',
      subject: 'Mathematics',
      yearGroup: 'Year 8',
      totalStudents: 30,
      presentToday: 28,
      averagePerformance: 92,
      attendanceRate: 96,
      nextLesson: '2024-01-26 09:00',
      recentAssessment: 'Geometry Test - 91% average',
      classTeacher: 'Dr. Emily Brown'
    }
  ]

  // Student data for selected class - will be loaded from API
  const [studentsData, setStudentsData] = useState([])
      parentContact: 'bob.parent@email.com',
      notes: 'Good understanding, needs practice'
    },
    {
      id: 3,
      name: 'Carol Davis',
      studentId: 'STU003',
      currentGrade: 'A-',
      attendance: 94,
      lastAssessment: 88,
      trend: 'improving',
      parentContact: 'carol.parent@email.com',
      notes: 'Strong analytical skills'
    },
    {
      id: 4,
      name: 'David Wilson',
      studentId: 'STU004',
      currentGrade: 'C+',
      attendance: 78,
      lastAssessment: 72,
      trend: 'declining',
      parentContact: 'david.parent@email.com',
      notes: 'Needs additional support'
    }
  ]

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <div className="h-4 w-4 bg-blue-500 rounded-full" />
    }
  }

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'improving': return 'text-green-600'
      case 'declining': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800'
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800'
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const classStats = {
    totalStudents: teacherClasses.reduce((sum, cls) => sum + cls.totalStudents, 0),
    averageAttendance: Math.round(teacherClasses.reduce((sum, cls) => sum + cls.attendanceRate, 0) / teacherClasses.length),
    averagePerformance: Math.round(teacherClasses.reduce((sum, cls) => sum + cls.averagePerformance, 0) / teacherClasses.length),
    totalClasses: teacherClasses.length
  }

  return (
    <DashboardLayout title="My Classes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/teacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Users className="h-6 w-6 mr-2" />
                Classroom Management
              </h1>
              <p className="text-gray-600">Manage your classes and track student progress</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Reports
            </Button>
            <Button>
              <UserCheck className="h-4 w-4 mr-2" />
              Take Attendance
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{classStats.totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCheck className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">{classStats.averageAttendance}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Performance</p>
                  <p className="text-2xl font-bold text-gray-900">{classStats.averagePerformance}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">My Classes</p>
                  <p className="text-2xl font-bold text-gray-900">{classStats.totalClasses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classes Overview */}
        <Card>
          <CardHeader>
            <CardTitle>My Classes Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teacherClasses.map((classItem) => (
                <div 
                  key={classItem.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedClass(classItem)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {classItem.yearGroup}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Students:</span>
                      <span className="font-medium">{classItem.totalStudents}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Present Today:</span>
                      <span className="font-medium text-green-600">{classItem.presentToday}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Performance:</span>
                      <span className="font-medium">{classItem.averagePerformance}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Attendance:</span>
                      <span className="font-medium">{classItem.attendanceRate}%</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    <p className="text-xs text-gray-500">Next Lesson:</p>
                    <p className="text-sm font-medium">{new Date(classItem.nextLesson).toLocaleString()}</p>
                  </div>

                  <div className="mt-3 flex items-center space-x-2">
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); setSelectedClass(classItem); setActiveTab('students'); }}>
                      <Eye className="h-4 w-4 mr-1" />
                      View Students
                    </Button>
                    <Button size="sm" variant="outline">
                      <UserCheck className="h-4 w-4 mr-1" />
                      Attendance
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Class Details */}
        {selectedClass && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedClass.name} - Detailed View</CardTitle>
                <Button variant="outline" onClick={() => setSelectedClass(null)}>
                  Close
                </Button>
              </div>
              <div className="flex space-x-1 mt-4">
                <Button
                  variant={activeTab === 'overview' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </Button>
                <Button
                  variant={activeTab === 'students' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('students')}
                >
                  Students
                </Button>
                <Button
                  variant={activeTab === 'performance' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('performance')}
                >
                  Performance
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Class Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subject:</span>
                        <span className="font-medium">{selectedClass.subject}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Year Group:</span>
                        <span className="font-medium">{selectedClass.yearGroup}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Students:</span>
                        <span className="font-medium">{selectedClass.totalStudents}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Class Teacher:</span>
                        <span className="font-medium">{selectedClass.classTeacher}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
                    <div className="space-y-2 text-sm">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="font-medium text-green-800">Recent Assessment</p>
                        <p className="text-green-700">{selectedClass.recentAssessment}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-800">Next Lesson</p>
                        <p className="text-blue-700">{new Date(selectedClass.nextLesson).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'students' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Student List</h4>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search students..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Student</th>
                          <th className="text-left py-3 px-4">Current Grade</th>
                          <th className="text-left py-3 px-4">Attendance</th>
                          <th className="text-left py-3 px-4">Last Assessment</th>
                          <th className="text-left py-3 px-4">Trend</th>
                          <th className="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentsData.map((student) => (
                          <tr key={student.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium text-gray-900">{student.name}</div>
                                <div className="text-sm text-gray-500">{student.studentId}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${getGradeColor(student.currentGrade)}`}>
                                {student.currentGrade}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full" 
                                    style={{ width: `${student.attendance}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium">{student.attendance}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium">{student.lastAssessment}%</td>
                            <td className="py-3 px-4">
                              <div className={`flex items-center ${getTrendColor(student.trend)}`}>
                                {getTrendIcon(student.trend)}
                                <span className="ml-1 text-sm capitalize">{student.trend}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'performance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Class Performance Overview</h4>
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-green-800 font-medium">High Performers</span>
                          <span className="text-green-600 font-bold">12 students</span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">Above 85% average</p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-yellow-800 font-medium">Average Performers</span>
                          <span className="text-yellow-600 font-bold">14 students</span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">70-85% average</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-red-800 font-medium">Need Support</span>
                          <span className="text-red-600 font-bold">2 students</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">Below 70% average</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Trends</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Class Average</span>
                        <span className="font-bold text-blue-600">{selectedClass.averagePerformance}%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Attendance Rate</span>
                        <span className="font-bold text-green-600">{selectedClass.attendanceRate}%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Improvement Rate</span>
                        <span className="font-bold text-purple-600">+5.2%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
