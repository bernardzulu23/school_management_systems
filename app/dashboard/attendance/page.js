'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    toast.success('Attendance saved successfully!')
  }

  return (
    <DashboardLayout title="Take Attendance">
      <main className="space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Take Attendance</h1>
            <p className="text-gray-600">Mark student attendance for your classes</p>
          </div>
        </header>

        {/* Class and Date Selection */}
        <section aria-labelledby="selection-title">
          <Card>
            <CardHeader>
              <CardTitle id="selection-title">Select Class and Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Class
                  </label>
                  <select
                    id="class-select"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
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
                  <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    id="date-select"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Attendance Summary */}
        {selectedClass && (
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4" aria-label="Attendance Summary">
            <Card className="focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-blue-600" aria-hidden="true" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-lg font-semibold">{mockStudents.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="focus-within:ring-2 focus-within:ring-green-500 transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Check className="h-6 w-6 text-green-600" aria-hidden="true" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-600">Present</p>
                    <p className="text-lg font-semibold">
                      {Object.values(attendance).filter(status => status === 'present').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="focus-within:ring-2 focus-within:ring-red-500 transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <X className="h-6 w-6 text-red-600" aria-hidden="true" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-600">Absent</p>
                    <p className="text-lg font-semibold">
                      {Object.values(attendance).filter(status => status === 'absent').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="focus-within:ring-2 focus-within:ring-yellow-500 transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-600">Late</p>
                    <p className="text-lg font-semibold">
                      {Object.values(attendance).filter(status => status === 'late').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Student Attendance List */}
        {selectedClass && (
          <section aria-labelledby="attendance-list-title">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle id="attendance-list-title">Student Attendance</CardTitle>
                <Button 
                  onClick={handleSaveAttendance} 
                  className="bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 outline-none"
                  aria-label="Save current attendance"
                >
                  Save Attendance
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3" role="list">
                  {mockStudents.map((student) => (
                    <article 
                      key={student.id} 
                      className="flex items-center justify-between p-4 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 outline-none transition-shadow"
                      role="listitem"
                      tabIndex="0"
                    >
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"
                          aria-hidden="true"
                        >
                          <span className="text-sm font-medium">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">ID: {student.student_id}</p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2" role="group" aria-label={`Attendance status for ${student.name}`}>
                        <Button
                          variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleAttendanceChange(student.id, 'present')}
                          className={`${attendance[student.id] === 'present' ? 'bg-green-600 hover:bg-green-700' : ''} focus:ring-2 focus:ring-green-500`}
                          aria-pressed={attendance[student.id] === 'present'}
                        >
                          <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                          Present
                        </Button>
                        
                        <Button
                          variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleAttendanceChange(student.id, 'absent')}
                          className={`${attendance[student.id] === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''} focus:ring-2 focus:ring-red-500`}
                          aria-pressed={attendance[student.id] === 'absent'}
                        >
                          <X className="h-4 w-4 mr-1" aria-hidden="true" />
                          Absent
                        </Button>
                        
                        <Button
                          variant={attendance[student.id] === 'late' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleAttendanceChange(student.id, 'late')}
                          className={`${attendance[student.id] === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''} focus:ring-2 focus:ring-yellow-500`}
                          aria-pressed={attendance[student.id] === 'late'}
                        >
                          <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
                          Late
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Empty State */}
        {!selectedClass && (
          <section aria-label="No class selected">
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
                <p className="text-gray-600">
                  Choose a class from the dropdown above to start taking attendance.
                </p>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </DashboardLayout>
  )
}
