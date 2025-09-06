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
  User,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  RefreshCw
} from 'lucide-react'

// Helper function to get current week
function getCurrentWeek() {
  const now = new Date()
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1))
  return startOfWeek.toISOString().split('T')[0]
}

export default function StudentTimetablePage() {
  const { user } = useAuth()
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek())
  const [studentTimetable, setStudentTimetable] = useState(null)
  const [todaySchedule, setTodaySchedule] = useState([])
  const [upcomingClasses, setUpcomingClasses] = useState([])

  // Sample student data - would come from API based on logged-in student
  const studentInfo = {
    id: 1,
    name: 'John Doe',
    studentId: 'STU001',
    class: 'Grade 10A',
    classId: 5
  }

  // Timetable data - will be loaded from API
  const [sampleTimetableData, setSampleTimetableData] = useState({})

  const loadTimetableData = () => {
    const studentTimetableData = timetableAPI.getStudentTimetable(studentInfo.classId)
    console.log('Student timetable data loaded:', studentTimetableData)

    // If no centralized data exists, use sample data for demonstration
    if (Object.keys(studentTimetableData).length === 0) {
      console.log('No centralized data found, using sample data')
      setStudentTimetable(sampleTimetableData)
    } else {
      setStudentTimetable(studentTimetableData)
    }
  }

  // Load student timetable from centralized data
  useEffect(() => {
    loadTimetableData()
  }, [])

  // Update today's schedule and upcoming classes when timetable data changes
  useEffect(() => {
    if (studentTimetable) {
      updateTodaySchedule()
      updateUpcomingClasses()
    }
  }, [studentTimetable])

  function updateTodaySchedule() {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const todayClasses = []

    if (studentTimetable && studentTimetable[today]) {
      timeSlots.forEach(slot => {
        if (!slot.isBreak && studentTimetable[today][slot.id]) {
          todayClasses.push({
            ...studentTimetable[today][slot.id],
            time: slot.time,
            period: slot.label,
            slotId: slot.id
          })
        }
      })
    }

    setTodaySchedule(todayClasses)
  }

  function updateUpcomingClasses() {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const today = now.toLocaleDateString('en-US', { weekday: 'long' })
    const upcoming = []

    if (studentTimetable && studentTimetable[today]) {
      timeSlots.forEach(slot => {
        if (!slot.isBreak && studentTimetable[today][slot.id]) {
          const [startTime] = slot.time.split('-')
          const [hours, minutes] = startTime.split(':').map(Number)
          const slotTime = hours * 60 + minutes

          if (slotTime > currentTime) {
            upcoming.push({
              ...studentTimetable[today][slot.id],
              time: slot.time,
              period: slot.label,
              minutesUntil: slotTime - currentTime
            })
          }
        }
      })
    }

    setUpcomingClasses(upcoming.slice(0, 3)) // Show next 3 classes
  }

  function getTodaySchedule() {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    if (daysOfWeek.includes(today) && studentTimetable) {
      const todayClasses = []
      const daySchedule = studentTimetable[today] || {}

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

    if (!daysOfWeek.includes(today) || !studentTimetable) return []

    const daySchedule = studentTimetable[today] || {}
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

  // Update schedule when studentTimetable changes
  useEffect(() => {
    if (studentTimetable) {
      setTodaySchedule(getTodaySchedule())
      setUpcomingClasses(getUpcomingClasses())
    }
  }, [studentTimetable])

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
            <h1 className="text-3xl font-bold text-gray-900">My Timetable</h1>
            <p className="text-gray-600 mt-1">
              {studentInfo.name} - {studentInfo.class} ({studentInfo.studentId})
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={loadTimetableData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={printTimetable}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={downloadTimetable}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Today's Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarCheck className="h-5 w-5 mr-2 text-blue-600" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaySchedule.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedule.map((cls, index) => (
                    <div key={index} className="flex items-center p-3 rounded-lg border" style={{ borderLeftColor: cls.color, borderLeftWidth: '4px' }}>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{cls.subject}</div>
                        <div className="text-sm text-gray-600 flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {cls.time} ({cls.period})
                        </div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {cls.teacher}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {cls.classroom}
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
                        <div className="font-semibold text-gray-900">{cls.subject}</div>
                        <div className="text-sm text-gray-600">{cls.time} - {cls.classroom}</div>
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

        {/* Weekly Timetable */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Weekly Timetable
              </span>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                  <CalendarCheck className="h-4 w-4 mr-1" />
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
                              {studentTimetable?.[day]?.[slot.id] ? (
                                <div
                                  className="p-3 rounded-lg text-white text-sm"
                                  style={{ backgroundColor: studentTimetable[day][slot.id].color }}
                                >
                                  <div className="font-semibold mb-1">
                                    {studentTimetable[day][slot.id].subject}
                                  </div>
                                  <div className="text-xs opacity-90 flex items-center mb-1">
                                    <User className="h-3 w-3 mr-1" />
                                    {studentTimetable[day][slot.id].teacher}
                                  </div>
                                  <div className="text-xs opacity-90 flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {studentTimetable[day][slot.id].classroom}
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

        {/* Subject Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
              Weekly Subject Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {(() => {
                const subjectCounts = {}
                daysOfWeek.forEach(day => {
                  timeSlots.forEach(slot => {
                    if (!slot.isBreak && studentTimetable?.[day]?.[slot.id]) {
                      const subject = studentTimetable[day][slot.id].subject
                      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1
                    }
                  })
                })

                return Object.entries(subjectCounts).map(([subject, count]) => {
                  const subjectData = Object.values(studentTimetable || {})
                    .flatMap(day => Object.values(day))
                    .find(cls => cls?.subject === subject)

                  return (
                    <div key={subject} className="text-center p-3 rounded-lg border">
                      <div
                        className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: subjectData?.color }}
                      >
                        {count}
                      </div>
                      <div className="text-sm font-medium text-gray-900">{subject}</div>
                      <div className="text-xs text-gray-600">
                        {count} period{count !== 1 ? 's' : ''}/week
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
