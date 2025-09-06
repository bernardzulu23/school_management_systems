'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  School, Plus, Users, BookOpen, TrendingUp, Edit, Trash2,
  ArrowLeft, Search, Filter, Download, Eye, UserCheck
} from 'lucide-react'
import Link from 'next/link'

export default function ClassesManagementPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterYear, setFilterYear] = useState('all')
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Sample classes data
  const classesData = [
    {
      id: 1,
      name: 'Class 7A',
      yearGroup: 'Year 7',
      classTeacher: 'Ms. Sarah Johnson',
      currentEnrollment: 28,
      maxCapacity: 30,
      subjects: ['Mathematics', 'English', 'Science', 'History'],
      averagePerformance: 85,
      attendanceRate: 94
    },
    {
      id: 2,
      name: 'Class 7B',
      yearGroup: 'Year 7',
      classTeacher: 'Mr. David Wilson',
      currentEnrollment: 25,
      maxCapacity: 30,
      subjects: ['Mathematics', 'English', 'Science', 'Geography'],
      averagePerformance: 78,
      attendanceRate: 91
    },
    {
      id: 3,
      name: 'Class 8A',
      yearGroup: 'Year 8',
      classTeacher: 'Dr. Emily Brown',
      currentEnrollment: 30,
      maxCapacity: 30,
      subjects: ['Mathematics', 'English', 'Science', 'History', 'Art'],
      averagePerformance: 92,
      attendanceRate: 96
    },
    {
      id: 4,
      name: 'Class 9A',
      yearGroup: 'Year 9',
      classTeacher: 'Mr. Michael Davis',
      currentEnrollment: 27,
      maxCapacity: 30,
      subjects: ['Mathematics', 'English', 'Science', 'Geography', 'Computer Science'],
      averagePerformance: 88,
      attendanceRate: 93
    },
    {
      id: 5,
      name: 'Class 10A',
      yearGroup: 'Year 10',
      classTeacher: 'Ms. Lisa Anderson',
      currentEnrollment: 24,
      maxCapacity: 28,
      subjects: ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology'],
      averagePerformance: 90,
      attendanceRate: 95
    }
  ]

  const getPerformanceColor = (performance) => {
    if (performance >= 90) return 'text-green-600 bg-green-100'
    if (performance >= 80) return 'text-blue-600 bg-blue-100'
    if (performance >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getCapacityColor = (current, max) => {
    const percentage = (current / max) * 100
    if (percentage >= 95) return 'text-red-600'
    if (percentage >= 85) return 'text-yellow-600'
    return 'text-green-600'
  }

  const filteredClasses = classesData.filter(classItem => {
    const matchesSearch = classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         classItem.classTeacher.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterYear === 'all' || classItem.yearGroup === filterYear
    return matchesSearch && matchesFilter
  })

  const classStats = {
    totalClasses: classesData.length,
    totalStudents: classesData.reduce((sum, cls) => sum + cls.currentEnrollment, 0),
    averagePerformance: Math.round(classesData.reduce((sum, cls) => sum + cls.averagePerformance, 0) / classesData.length),
    averageAttendance: Math.round(classesData.reduce((sum, cls) => sum + cls.attendanceRate, 0) / classesData.length)
  }

  return (
    <DashboardLayout title="Classes Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/headteacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <School className="h-6 w-6 mr-2" />
                Classes Management
              </h1>
              <p className="text-gray-600">Comprehensive class organization and monitoring</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Class
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <School className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Classes</p>
                  <p className="text-2xl font-bold text-gray-900">{classStats.totalClasses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
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
                <UserCheck className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">{classStats.averageAttendance}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Classes</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search classes or teachers..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                >
                  <option value="all">All Year Groups</option>
                  <option value="Year 7">Year 7</option>
                  <option value="Year 8">Year 8</option>
                  <option value="Year 9">Year 9</option>
                  <option value="Year 10">Year 10</option>
                  <option value="Year 11">Year 11</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Class Name</th>
                    <th className="text-left py-3 px-4">Year Group</th>
                    <th className="text-left py-3 px-4">Class Teacher</th>
                    <th className="text-left py-3 px-4">Enrollment</th>
                    <th className="text-left py-3 px-4">Subjects</th>
                    <th className="text-left py-3 px-4">Performance</th>
                    <th className="text-left py-3 px-4">Attendance</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map((classItem) => (
                    <tr key={classItem.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{classItem.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {classItem.yearGroup}
                        </span>
                      </td>
                      <td className="py-3 px-4">{classItem.classTeacher}</td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${getCapacityColor(classItem.currentEnrollment, classItem.maxCapacity)}`}>
                          {classItem.currentEnrollment}/{classItem.maxCapacity}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {classItem.subjects.slice(0, 3).map((subject, index) => (
                            <span key={index} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                              {subject}
                            </span>
                          ))}
                          {classItem.subjects.length > 3 && (
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                              +{classItem.subjects.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getPerformanceColor(classItem.averagePerformance)}`}>
                          {classItem.averagePerformance}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium">{classItem.attendanceRate}%</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Users className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Class Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Year Group</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Year 7', 'Year 8', 'Year 9', 'Year 10'].map((year) => {
                  const yearClasses = classesData.filter(cls => cls.yearGroup === year)
                  const avgPerformance = yearClasses.length > 0 
                    ? Math.round(yearClasses.reduce((sum, cls) => sum + cls.averagePerformance, 0) / yearClasses.length)
                    : 0
                  
                  return (
                    <div key={year} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="font-medium">{year}</span>
                        <span className="text-sm text-gray-500 ml-2">({yearClasses.length} classes)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${avgPerformance}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-blue-600">{avgPerformance}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Class Management Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Class
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Assign Teachers
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Manage Subjects
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Performance Reports
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Class Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
