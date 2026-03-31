'use client'

import { useEffect, useMemo, useState } from 'react'
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
    queryFn: () => api.getTeacherDashboard().then((res) => res.data),
  })

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['class-students', selectedClass],
    enabled: Boolean(selectedClass),
    queryFn: async () => {
      const res = await fetch(`/api/classes/students?classId=${encodeURIComponent(selectedClass)}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load students')
      return Array.isArray(json?.data) ? json.data : []
    },
  })

  const students = useMemo(() => (Array.isArray(studentsData) ? studentsData : []), [studentsData])

  const [attendance, setAttendance] = useState({})

  useEffect(() => {
    if (!selectedClass) return
    if (students.length === 0) {
      setAttendance({})
      return
    }
    setAttendance((prev) => {
      const next = { ...prev }
      for (const s of students) {
        if (!next[String(s.id)]) next[String(s.id)] = 'present'
      }
      Object.keys(next).forEach((id) => {
        if (!students.some((s) => String(s.id) === id)) delete next[id]
      })
      return next
    })
  }, [selectedClass, students])

  const handleAttendanceChange = (studentId, status) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }))
  }

  const handleSaveAttendance = () => {
    if (!selectedClass) return
    const records = students.map((s) => ({
      studentId: s.id,
      status: attendance[String(s.id)] || 'present',
    }))

    fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate, records }),
    })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(json.error || 'Failed to save attendance')
        toast.success('Attendance saved successfully!')
      })
      .catch((e) => toast.error(e.message || 'Failed to save attendance'))
  }

  return (
    <DashboardLayout title="Take Attendance">
      <main className="space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1">Take Attendance</h1>
            <p className="text-royalPurple-text2">Mark student attendance for your classes</p>
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
                  <label
                    htmlFor="class-select"
                    className="block text-sm font-medium text-royalPurple-text2 mb-2"
                  >
                    Select Class
                  </label>
                  <select
                    id="class-select"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full p-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-royalPurple-card"
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
                  <label
                    htmlFor="date-select"
                    className="block text-sm font-medium text-royalPurple-text2 mb-2"
                  >
                    Date
                  </label>
                  <input
                    id="date-select"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Attendance Summary */}
        {selectedClass && (
          <section
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
            aria-label="Attendance Summary"
          >
            <Card className="focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-royalPurple-accentTx" aria-hidden="true" />
                  <div className="ml-3">
                    <p className="text-sm text-royalPurple-text2">Total Students</p>
                    <p className="text-lg font-semibold">{students.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="focus-within:ring-2 focus-within:ring-green-500 transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Check className="h-6 w-6 text-royalPurple-successTx" aria-hidden="true" />
                  <div className="ml-3">
                    <p className="text-sm text-royalPurple-text2">Present</p>
                    <p className="text-lg font-semibold">
                      {Object.values(attendance).filter((status) => status === 'present').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="focus-within:ring-2 focus-within:ring-red-500 transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <X className="h-6 w-6 text-royalPurple-dangerTx" aria-hidden="true" />
                  <div className="ml-3">
                    <p className="text-sm text-royalPurple-text2">Absent</p>
                    <p className="text-lg font-semibold">
                      {Object.values(attendance).filter((status) => status === 'absent').length}
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
                    <p className="text-sm text-royalPurple-text2">Late</p>
                    <p className="text-lg font-semibold">
                      {Object.values(attendance).filter((status) => status === 'late').length}
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
                  className="bg-royalPurple-success hover:bg-royalPurple-success focus:ring-2 focus:ring-green-500 focus:ring-offset-2 outline-none"
                  aria-label="Save current attendance"
                >
                  Save Attendance
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3" role="list">
                  {studentsLoading ? (
                    <div className="text-royalPurple-text2">Loading students...</div>
                  ) : students.length === 0 ? (
                    <div className="text-royalPurple-text2">No students found for this class.</div>
                  ) : (
                    students.map((student) => (
                      <article
                        key={student.id}
                        className="flex items-center justify-between p-4 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 outline-none transition-shadow"
                        role="listitem"
                        tabIndex="0"
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className="w-10 h-10 bg-royalPurple-card2 rounded-full flex items-center justify-center"
                            aria-hidden="true"
                          >
                            <span className="text-sm font-medium">
                              {student.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-royalPurple-text1">{student.name}</p>
                            <p className="text-sm text-royalPurple-text3">
                              {student.exam_number
                                ? `Exam: ${student.exam_number}`
                                : `ID: ${student.student_id}`}
                            </p>
                          </div>
                        </div>

                        <div
                          className="flex space-x-2"
                          role="group"
                          aria-label={`Attendance status for ${student.name}`}
                        >
                          <Button
                            variant={
                              attendance[String(student.id)] === 'present' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => handleAttendanceChange(student.id, 'present')}
                            className={`${attendance[String(student.id)] === 'present' ? 'bg-royalPurple-success hover:bg-royalPurple-success' : ''} focus:ring-2 focus:ring-green-500`}
                            aria-pressed={attendance[String(student.id)] === 'present'}
                          >
                            <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                            Present
                          </Button>

                          <Button
                            variant={
                              attendance[String(student.id)] === 'absent' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => handleAttendanceChange(student.id, 'absent')}
                            className={`${attendance[String(student.id)] === 'absent' ? 'bg-royalPurple-danger hover:bg-royalPurple-danger' : ''} focus:ring-2 focus:ring-red-500`}
                            aria-pressed={attendance[String(student.id)] === 'absent'}
                          >
                            <X className="h-4 w-4 mr-1" aria-hidden="true" />
                            Absent
                          </Button>

                          <Button
                            variant={
                              attendance[String(student.id)] === 'late' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => handleAttendanceChange(student.id, 'late')}
                            className={`${attendance[String(student.id)] === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''} focus:ring-2 focus:ring-yellow-500`}
                            aria-pressed={attendance[String(student.id)] === 'late'}
                          >
                            <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
                            Late
                          </Button>
                        </div>
                      </article>
                    ))
                  )}
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
                <Calendar
                  className="h-12 w-12 text-royalPurple-text3 mx-auto mb-4"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-medium text-royalPurple-text1 mb-2">Select a Class</h3>
                <p className="text-royalPurple-text2">
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
