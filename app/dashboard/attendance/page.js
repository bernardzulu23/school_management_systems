'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { Users, Calendar, Check, X, Clock } from 'lucide-react'

export default function AttendancePage() {
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  
  const { data: dashboardData } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => api.getTeacherDashboard().then(res => res.data),
  })

  // Mock student data for the selected class
  const mockStudents = [
    { id: '1', name: 'John Doe', student_id: 'STU001', status: 'present' },
    { id: '2', name: 'Jane Smith', student_id: 'STU002', status: 'present' },
    { id: '3', name: 'Mike Johnson', student_id: 'STU003', status: 'absent' },
    { id: '4', name: 'Sarah Wilson', student_id: 'STU004', status: 'present' },
    { id: '5', name: 'David Brown', student_id: 'STU005', status: 'late' },
  ]

  const [attendance, setAttendance] = useState(
    mockStudents.reduce((acc, student) => {
      acc[student.id] = student.status
      return acc
    }, {})
  )

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }))
  }

  const handleSaveAttendance = () => {
    // Here you would save the attendance data
    console.log('Saving attendance:', { selectedClass, selectedDate, attendance })
    alert('Attendance saved successfully!')
  }

  return (
    <DashboardLayout title="Take Attendance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Take Attendance</h1>
            <p className="text-gray-600">Mark student attendance for your classes</p>
          </div>
        </div>

        {/* Class and Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Class and Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a class...</option>
                  {dashboardData?.my_classes?.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name} ({classItem.student_count} students)
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        {selectedClass && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-lg font-semibold">{mockStudents.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Check className="h-6 w-6 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-600">Present</p>
                    <p className="text-lg font-semibold">
                      {Object.values(attendance).filter(status => status === 'present').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <X className="h-6 w-6 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-600">Absent</p>
                    <p className="text-lg font-semibold">
                      {Object.values(attendance).filter(status => status === 'absent').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-600">Late</p>
                    <p className="text-lg font-semibold">
                      {Object.values(attendance).filter(status => status === 'late').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Student Attendance List */}
        {selectedClass && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Student Attendance</CardTitle>
              <Button onClick={handleSaveAttendance} className="bg-green-600 hover:bg-green-700">
                Save Attendance
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-500">ID: {student.student_id}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleAttendanceChange(student.id, 'present')}
                        className={attendance[student.id] === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Present
                      </Button>
                      
                      <Button
                        variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleAttendanceChange(student.id, 'absent')}
                        className={attendance[student.id] === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Absent
                      </Button>
                      
                      <Button
                        variant={attendance[student.id] === 'late' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleAttendanceChange(student.id, 'late')}
                        className={attendance[student.id] === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Late
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!selectedClass && (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
              <p className="text-gray-600">
                Choose a class from the dropdown above to start taking attendance.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
