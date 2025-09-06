'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
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
  BarChart3
} from 'lucide-react'

export default function TeacherTimetablePage() {
  const { user } = useAuth()
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek())
  const [teacherTimetable, setTeacherTimetable] = useState(null)
  const [todaySchedule, setTodaySchedule] = useState([])
  const [upcomingClasses, setUpcomingClasses] = useState([])
  const [weeklyStats, setWeeklyStats] = useState({})

  // Sample teacher data - would come from API based on logged-in teacher
  const teacherInfo = {
    id: 1,
    name: 'Mr. John Smith',
    employeeId: 'EMP001',
    subjects: ['Mathematics', 'Physics'],
    maxPeriods: 8
  }

  const loadTimetableData = () => {
    const teacherTimetableData = timetableAPI.getTeacherTimetable(teacherInfo.id)
    console.log('Teacher timetable data loaded:', teacherTimetableData)
    setTeacherTimetable(teacherTimetableData)
  }

  // Load teacher timetable from centralized data
  useEffect(() => {
    loadTimetableData()
  }, [])

  // Teacher timetable data - will be loaded from API
  const [sampleTimetableData, setSampleTimetableData] = useState({})

  function getCurrentWeek() {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1))
    return startOfWeek.toISOString().split('T')[0]
  }

  function getTodaySchedule() {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    if (daysOfWeek.includes(today)) {
      const todayClasses = []
      const daySchedule = sampleTimetableData[today] || {}
      
      timeSlots.forEach(slot => {
        if (!slot.isBreak && daySchedule[slot.id]) {
          todayClasses.push({
            ...daySchedule[slot.id],
            time: slot.time,
            period: slot.label
          })
        }
      })
      
      return todayClasses
    }
    return []
  }

  function getUpcomingClasses() {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const today = now.toLocaleDateString('en-US', { weekday: 'long' })
    
    if (!daysOfWeek.includes(today)) return []
    
    const daySchedule = sampleTimetableData[today] || {}
    const upcoming = []
    
    timeSlots.forEach(slot => {
      if (!slot.isBreak && daySchedule[slot.id]) {
        const [startTime] = slot.time.split('-')
        const [hours, minutes] = startTime.split(':').map(Number)
        const slotTime = hours * 60 + minutes
        
        if (slotTime > currentTime) {
          upcoming.push({
            ...daySchedule[slot.id],
            time: slot.time,
            period: slot.label,
            minutesUntil: slotTime - currentTime
          })
        }
      }
    })
    
    return upcoming.slice(0, 3) // Next 3 classes
  }

  function calculateWeeklyStats() {
    let totalPeriods = 0
    let mathPeriods = 0
    let physicsPeriods = 0
    let totalStudents = 0
    const classesSet = new Set()

    daysOfWeek.forEach(day => {
      timeSlots.forEach(slot => {
        if (!slot.isBreak && sampleTimetableData[day]?.[slot.id]) {
          const cls = sampleTimetableData[day][slot.id]
          totalPeriods++
          totalStudents += cls.students
          classesSet.add(cls.class)
          
          if (cls.subject === 'Mathematics') mathPeriods++
          if (cls.subject === 'Physics') physicsPeriods++
        }
      })
    })

    return {
      totalPeriods,
      mathPeriods,
      physicsPeriods,
      totalStudents,
      uniqueClasses: classesSet.size,
      utilization: Math.round((totalPeriods / teacherInfo.maxPeriods) * 100)
    }
  }

  useEffect(() => {
    setTeacherTimetable(sampleTimetableData)
    setTodaySchedule(getTodaySchedule())
    setUpcomingClasses(getUpcomingClasses())
    setWeeklyStats(calculateWeeklyStats())
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
    alert('Timetable download feature would be implemented here')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Teaching Schedule</h1>
            <p className="text-gray-600 mt-1">
              {teacherInfo.name} - {teacherInfo.subjects.join(', ')} ({teacherInfo.employeeId})
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

        {/* Weekly Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{weeklyStats.totalPeriods}</p>
              <p className="text-sm text-gray-600">Total Periods</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{weeklyStats.mathPeriods}</p>
              <p className="text-sm text-gray-600">Math Periods</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{weeklyStats.physicsPeriods}</p>
              <p className="text-sm text-gray-600">Physics Periods</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{weeklyStats.uniqueClasses}</p>
              <p className="text-sm text-gray-600">Classes Taught</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{weeklyStats.utilization}%</p>
              <p className="text-sm text-gray-600">Utilization</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Today className="h-5 w-5 mr-2 text-blue-600" />
                Today's Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaySchedule.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedule.map((cls, index) => (
                    <div key={index} className="flex items-center p-3 rounded-lg border" style={{ borderLeftColor: cls.color, borderLeftWidth: '4px' }}>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{cls.subject} - {cls.class}</div>
                        <div className="text-sm text-gray-600 flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {cls.time} ({cls.period})
                        </div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {cls.classroom}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {cls.students} students
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No classes scheduled for today</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Classes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-green-600" />
                Next Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingClasses.length > 0 ? (
                <div className="space-y-3">
                  {upcomingClasses.map((cls, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div>
                        <div className="font-semibold text-gray-900">{cls.subject} - {cls.class}</div>
                        <div className="text-sm text-gray-600">{cls.time} - {cls.classroom}</div>
                        <div className="text-sm text-gray-600">{cls.students} students</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          {cls.minutesUntil < 60 ? `${cls.minutesUntil}m` : `${Math.floor(cls.minutesUntil / 60)}h ${cls.minutesUntil % 60}m`}
                        </div>
                        <div className="text-xs text-gray-500">remaining</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No more classes today</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly Teaching Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Weekly Teaching Schedule
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
                      <th key={day} className="border border-gray-300 p-3 bg-gray-50 min-w-48">
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
                            <div>
                              {teacherTimetable?.[day]?.[slot.id] ? (
                                <div
                                  className="p-3 rounded-lg text-white text-sm"
                                  style={{ backgroundColor: teacherTimetable[day][slot.id].color }}
                                >
                                  <div className="font-semibold mb-1">
                                    {teacherTimetable[day][slot.id].subject}
                                  </div>
                                  <div className="text-xs opacity-90 flex items-center mb-1">
                                    <Users className="h-3 w-3 mr-1" />
                                    {teacherTimetable[day][slot.id].class}
                                  </div>
                                  <div className="text-xs opacity-90 flex items-center mb-1">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {teacherTimetable[day][slot.id].classroom}
                                  </div>
                                  <div className="text-xs opacity-90">
                                    {teacherTimetable[day][slot.id].students} students
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-gray-400 py-6">
                                  Free Period
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

        {/* Class Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
              Weekly Class Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subject Distribution */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Subject Distribution</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm font-medium">Mathematics</span>
                    <span className="text-sm text-blue-600 font-bold">{weeklyStats.mathPeriods} periods</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                    <span className="text-sm font-medium">Physics</span>
                    <span className="text-sm text-purple-600 font-bold">{weeklyStats.physicsPeriods} periods</span>
                  </div>
                </div>
              </div>

              {/* Classes Taught */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Classes Taught</h4>
                <div className="space-y-2">
                  {(() => {
                    const classCounts = {}
                    daysOfWeek.forEach(day => {
                      timeSlots.forEach(slot => {
                        if (!slot.isBreak && teacherTimetable?.[day]?.[slot.id]) {
                          const className = teacherTimetable[day][slot.id].class
                          classCounts[className] = (classCounts[className] || 0) + 1
                        }
                      })
                    })

                    return Object.entries(classCounts).map(([className, count]) => (
                      <div key={className} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{className}</span>
                        <span className="text-sm text-gray-600 font-bold">{count} periods</span>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
