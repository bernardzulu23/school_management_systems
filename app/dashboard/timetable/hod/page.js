'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { timetableAPI, timeSlots, daysOfWeek } from '@/lib/timetableData'
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  MapPin,
  Users,
  Download,
  Print,
  ChevronLeft,
  ChevronRight,
  Today,
  Target,
  BarChart3,
  TrendingUp,
  Eye
} from 'lucide-react'

export default function HODTimetablePage() {
  const { user } = useAuth()
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek())
  const [selectedView, setSelectedView] = useState('overview') // overview, teachers, classes
  const [departmentTimetable, setDepartmentTimetable] = useState(null)
  const [departmentStats, setDepartmentStats] = useState({})

  // HOD data - will come from API based on logged-in HOD
  const [hodInfo, setHodInfo] = useState({
    id: null,
    name: user?.name || '',
    employeeId: user?.employeeId || '',
    department: user?.department || '',
    subjects: user?.subjects || []
  })

  const loadTimetableData = () => {
    const departmentTimetableData = timetableAPI.getDepartmentTimetable(hodInfo.department)
    console.log('HOD timetable data loaded:', departmentTimetableData)
    setDepartmentTimetable(departmentTimetableData)
  }

  // Load department timetable from centralized data
  useEffect(() => {
    loadTimetableData()
  }, [])

  // Department teachers - will be loaded from API
  const [departmentTeachers, setDepartmentTeachers] = useState([])

  // Department overview data - will be loaded from API
  const [departmentOverview, setDepartmentOverview] = useState({})

  function getCurrentWeek() {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1))
    return startOfWeek.toISOString().split('T')[0]
  }

  function calculateDepartmentStats() {
    let totalPeriods = 0
    let mathPeriods = 0
    let physicsPeriods = 0
    let chemPeriods = 0
    let bioPeriods = 0
    const teacherUtilization = {}

    // Initialize teacher utilization
    departmentTeachers.forEach(teacher => {
      teacherUtilization[teacher.name] = { assigned: 0, max: teacher.maxPeriods }
    })

    daysOfWeek.forEach(day => {
      timeSlots.forEach(slot => {
        if (!slot.isBreak && departmentOverview[day]?.[slot.id]) {
          departmentOverview[day][slot.id].forEach(assignment => {
            totalPeriods++
            
            if (assignment.subject === 'Mathematics') mathPeriods++
            if (assignment.subject === 'Physics') physicsPeriods++
            if (assignment.subject === 'Chemistry') chemPeriods++
            if (assignment.subject === 'Biology') bioPeriods++
            
            if (teacherUtilization[assignment.teacher]) {
              teacherUtilization[assignment.teacher].assigned++
            }
          })
        }
      })
    })

    return {
      totalPeriods,
      mathPeriods,
      physicsPeriods,
      chemPeriods,
      bioPeriods,
      teacherUtilization,
      averageUtilization: departmentTeachers.length > 0 ? Math.round(
        Object.values(teacherUtilization).reduce((sum, teacher) =>
          sum + (teacher.assigned / teacher.max * 100), 0
        ) / departmentTeachers.length
      ) : 0
    }
  }

  useEffect(() => {
    setDepartmentTimetable(departmentOverview)
    setDepartmentStats(calculateDepartmentStats())
  }, [])

  const navigateWeek = (direction) => {
    const currentDate = new Date(selectedWeek)
    currentDate.setDate(currentDate.getDate() + (direction * 7))
    setSelectedWeek(currentDate.toISOString().split('T')[0])
  }

  const goToCurrentWeek = () => {
    setSelectedWeek(getCurrentWeek())
  }

  const printTimetable = () => {
    window.print()
  }

  const downloadTimetable = () => {
    // Here you would generate and download a PDF
    alert('Department timetable download feature would be implemented here')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Department Timetable</h1>
            <p className="text-gray-600 mt-1">
              {hodInfo.name} - {hodInfo.department} ({hodInfo.employeeId})
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={printTimetable}>
              <Print className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={downloadTimetable}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Department Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{departmentStats.totalPeriods}</p>
              <p className="text-sm text-gray-600">Total Periods</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{departmentStats.mathPeriods}</p>
              <p className="text-sm text-gray-600">Math</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{departmentStats.physicsPeriods}</p>
              <p className="text-sm text-gray-600">Physics</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{departmentStats.chemPeriods}</p>
              <p className="text-sm text-gray-600">Chemistry</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{departmentStats.bioPeriods}</p>
              <p className="text-sm text-gray-600">Biology</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{departmentStats.averageUtilization}%</p>
              <p className="text-sm text-gray-600">Avg Utilization</p>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-2">
          <Button 
            variant={selectedView === 'overview' ? 'default' : 'outline'}
            onClick={() => setSelectedView('overview')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Department Overview
          </Button>
          <Button 
            variant={selectedView === 'teachers' ? 'default' : 'outline'}
            onClick={() => setSelectedView('teachers')}
          >
            <Users className="h-4 w-4 mr-2" />
            Teacher Utilization
          </Button>
        </div>

        {/* Department Overview */}
        {selectedView === 'overview' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Department Schedule Overview
                </span>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                    <Today className="h-4 w-4 mr-1" />
                    This Week
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 p-3 bg-gray-50 w-32">Time</th>
                      {daysOfWeek.map(day => (
                        <th key={day} className="border border-gray-300 p-3 bg-gray-50 min-w-64">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map(slot => (
                      <tr key={slot.id}>
                        <td className={`border border-gray-300 p-3 font-medium text-center ${
                          slot.isBreak ? 'bg-yellow-50 text-yellow-800' : 'bg-gray-50'
                        }`}>
                          <div className="text-sm font-semibold">{slot.label}</div>
                          <div className="text-xs text-gray-600">{slot.time}</div>
                        </td>
                        {daysOfWeek.map(day => (
                          <td key={`${day}-${slot.id}`} className="border border-gray-300 p-2">
                            {slot.isBreak ? (
                              <div className="text-center text-yellow-600 font-medium py-6">
                                {slot.label}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {departmentTimetable?.[day]?.[slot.id]?.map((assignment, index) => (
                                  <div key={index} className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                                    <div className="font-semibold text-blue-900">
                                      {assignment.subject} - {assignment.class}
                                    </div>
                                    <div className="text-xs text-blue-700 flex items-center">
                                      <Users className="h-3 w-3 mr-1" />
                                      {assignment.teacher}
                                    </div>
                                    <div className="text-xs text-blue-700 flex items-center">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {assignment.classroom}
                                    </div>
                                  </div>
                                )) || (
                                  <div className="text-center text-gray-400 py-4">
                                    No classes scheduled
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teacher Utilization */}
        {selectedView === 'teachers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-600" />
                  Teacher Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentTeachers.map(teacher => {
                    const utilization = departmentStats.teacherUtilization?.[teacher.name] || { assigned: 0, max: teacher.maxPeriods }
                    const percentage = Math.round((utilization.assigned / utilization.max) * 100)

                    return (
                      <div key={teacher.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">{teacher.name}</div>
                            <div className="text-sm text-gray-600">{teacher.subjects.join(', ')}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">{percentage}%</div>
                            <div className="text-sm text-gray-600">
                              {utilization.assigned}/{utilization.max} periods
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              percentage >= 90 ? 'bg-red-500' :
                              percentage >= 75 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                  Subject Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-blue-900">Mathematics</span>
                    <span className="text-blue-700 font-bold">{departmentStats.mathPeriods} periods</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium text-purple-900">Physics</span>
                    <span className="text-purple-700 font-bold">{departmentStats.physicsPeriods} periods</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="font-medium text-orange-900">Chemistry</span>
                    <span className="text-orange-700 font-bold">{departmentStats.chemPeriods} periods</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="font-medium text-red-900">Biology</span>
                    <span className="text-red-700 font-bold">{departmentStats.bioPeriods} periods</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
