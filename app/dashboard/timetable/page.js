'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { timetableAPI, timeSlots, daysOfWeek } from '@/lib/timetableData'
import { 
  Calendar, Clock, BookOpen, Users, MapPin, 
  ChevronLeft, ChevronRight, Download, Filter, 
  Bell, AlertCircle, CheckCircle
} from 'lucide-react'

export default function TimetablePage() {
  const { user } = useAuth()
  const [selectedWeek, setSelectedWeek] = useState(0) // 0 = current week
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  const [studentTimetable, setStudentTimetable] = useState({})
  const [teacherTimetable, setTeacherTimetable] = useState({})

  const isStudent = user?.role === 'student'
  const isTeacher = user?.role === 'teacher'

  useEffect(() => {
    // TODO: Fetch real timetable data from API based on user role
    if (isStudent && user?.classId) {
       const data = timetableAPI.getStudentTimetable(user.classId)
       setStudentTimetable(data)
    } else if (isTeacher && user?.id) {
       const data = timetableAPI.getTeacherTimetable(user.id)
       setTeacherTimetable(data)
    }
  }, [user, isStudent, isTeacher])

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const weekDays = daysOfWeek // Use centralized daysOfWeek

  const getCurrentWeekDates = () => {
    const today = new Date()
    const currentDay = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - currentDay + 1 + (selectedWeek * 7))
    
    return weekDays.map((day, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      return {
        day,
        date: date.getDate(),
        month: date.getMonth() + 1,
        isToday: date.toDateString() === today.toDateString()
      }
    })
  }

  const weekDates = getCurrentWeekDates()
  const currentSchedule = isStudent ? studentTimetable : teacherTimetable

  const getSubjectColor = (type) => {
    switch (type) {
      case 'lesson': return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'break': return 'bg-gray-100 border-gray-300 text-gray-600'
      case 'study': return 'bg-green-100 border-green-300 text-green-800'
      case 'assembly': return 'bg-purple-100 border-purple-300 text-purple-800'
      case 'free': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'prep': return 'bg-orange-100 border-orange-300 text-orange-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-600'
    }
  }

  return (
    <DashboardLayout title={isStudent ? "My Timetable" : "Teaching Schedule"}>
      <main className="space-y-6" role="main">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isStudent ? "My Timetable" : "Teaching Schedule"}
            </h1>
            <p className="text-gray-600">
              {isStudent 
                ? `Class schedule for ${user?.class || 'your class'}` 
                : "Your teaching schedule and class assignments"
              }
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" aria-label="Export timetable">
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Export
            </Button>
            {!isStudent && (
              <Button variant="outline" aria-label="Filter timetable">
                <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                Filter
              </Button>
            )}
          </div>
        </header>

        {/* Week Navigation */}
        <section aria-label="Week selection">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedWeek(selectedWeek - 1)}
                  aria-label="Go to previous week"
                  className="w-full sm:w-auto"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                  Previous
                </Button>
                
                <nav className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0 w-full justify-start sm:justify-center sm:w-auto scrollbar-hide" aria-label="Day selection">
                  {weekDates.map((dayInfo, index) => (
                    <button
                      key={dayInfo.day}
                      onClick={() => setSelectedDay(index + 1)}
                      aria-label={`Select ${dayInfo.day}, ${dayInfo.date}/${dayInfo.month}`}
                      aria-pressed={selectedDay === index + 1}
                      className={`p-2 sm:p-3 rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none flex-shrink-0 min-w-[70px] sm:min-w-[80px] ${
                        dayInfo.isToday 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105 z-10' 
                          : selectedDay === index + 1
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-bold uppercase tracking-wider">{dayInfo.day.slice(0, 3)}</div>
                      <div className="text-[10px] sm:text-xs opacity-80 font-medium">{dayInfo.date}/{dayInfo.month}</div>
                    </button>
                  ))}
                </nav>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedWeek(selectedWeek + 1)}
                  aria-label="Go to next week"
                  className="w-full sm:w-auto"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Timetable Grid */}
        <section aria-label="Weekly Schedule Grid">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Weekly Schedule</span>
                <span className="sm:hidden">{weekDays[selectedDay - 1]} Schedule</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop View: Full Grid */}
              <div className="hidden sm:block overflow-x-auto focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg outline-none" tabIndex="0" aria-label="Timetable scrollable area">
                <table className="w-full border-collapse" role="table">
                  <thead>
                    <tr role="row">
                      <th className="border border-gray-300 p-3 bg-gray-50 text-left font-medium min-w-[100px]" role="columnheader">Time</th>
                      {weekDays.map((day, index) => (
                        <th 
                          key={day} 
                          role="columnheader"
                          className={`border border-gray-300 p-3 text-center font-medium min-w-[150px] ${
                            weekDates[index]?.isToday ? 'bg-blue-50 text-blue-800' : 'bg-gray-50'
                          }`}
                        >
                          {day}
                          <div className="text-xs font-normal text-gray-500">
                            {weekDates[index]?.date}/{weekDates[index]?.month}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((timeSlot) => (
                      <tr key={timeSlot.id} role="row">
                        <td className="border border-gray-300 p-3 bg-gray-50 font-medium text-sm" role="cell">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-gray-500" aria-hidden="true" />
                            {timeSlot.time}
                          </div>
                        </td>
                        {weekDays.map((day) => {
                          const daySchedule = currentSchedule[day]
                          const classInfo = daySchedule?.[timeSlot.id]
                          
                          return (
                            <td key={day} className="border border-gray-300 p-2" role="cell">
                              {classInfo && (
                                <article 
                                  className={`p-2 rounded border-l-4 ${getSubjectColor(classInfo.type || 'lesson')}`}
                                  role="button"
                                  tabIndex="0"
                                >
                                  <div className="font-bold text-xs truncate">{classInfo.subject}</div>
                                  <div className="text-[10px] flex items-center mt-1">
                                    <MapPin className="h-2 w-2 mr-1" /> {classInfo.classroom || classInfo.room}
                                  </div>
                                  {isTeacher ? (
                                    <div className="text-[10px] flex items-center mt-0.5">
                                      <Users className="h-2 w-2 mr-1" /> {classInfo.class}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] flex items-center mt-0.5">
                                      <Users className="h-2 w-2 mr-1" /> {classInfo.teacher}
                                    </div>
                                  )}
                                </article>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Single Day List */}
              <div className="sm:hidden space-y-4">
                {timeSlots.map((timeSlot) => {
                  const dayName = weekDays[selectedDay - 1]
                  const daySchedule = currentSchedule[dayName]
                  const classInfo = daySchedule?.[timeSlot.id]
                  
                  if (!classInfo && isStudent) return null // Hide empty slots for students on mobile to save space

                  return (
                    <div key={timeSlot.id} className="flex gap-4">
                      <div className="w-16 flex-shrink-0 text-xs font-medium text-gray-500 pt-1">
                        {timeSlot.time}
                      </div>
                      <div className="flex-1">
                        {classInfo ? (
                          <article 
                            className={`p-3 rounded-xl border-l-4 shadow-sm ${getSubjectColor(classInfo.type || 'lesson')}`}
                          >
                            <div className="font-bold text-sm">{classInfo.subject}</div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs opacity-80">
                              <div className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" /> {classInfo.classroom || classInfo.room}
                              </div>
                              {isTeacher ? (
                                <div className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" /> {classInfo.class}
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" /> {classInfo.teacher}
                                </div>
                              )}
                            </div>
                          </article>
                        ) : (
                          <div className="p-3 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs italic">
                            No class scheduled
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Today's Schedule Summary */}
        <section aria-label="Today's detailed schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" aria-hidden="true" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3" role="list">
                {(currentSchedule[days[new Date().getDay()]] && Object.values(currentSchedule[days[new Date().getDay()]]).length > 0) ? (
                  Object.values(currentSchedule[days[new Date().getDay()]]).map((classInfo, index) => (
                    <article 
                      key={index} 
                      role="listitem"
                      tabIndex="0"
                      className={`p-4 rounded-lg border-l-4 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none transition-shadow ${
                        classInfo.type === 'lesson' ? 'border-blue-500 bg-blue-50' :
                        classInfo.type === 'break' ? 'border-gray-500 bg-gray-50' :
                        'border-green-500 bg-green-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{classInfo.subject}</div>
                          <div className="text-sm text-gray-600">
                            {classInfo.time}
                            {classInfo.room && ` • ${classInfo.room}`}
                            {isStudent && classInfo.teacher && ` • ${classInfo.teacher}`}
                            {isTeacher && classInfo.class && ` • ${classInfo.class}`}
                          </div>
                        </div>
                        <div 
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            classInfo.type === 'lesson' ? 'bg-blue-100 text-blue-800' :
                            classInfo.type === 'break' ? 'bg-gray-100 text-gray-800' :
                            'bg-green-100 text-green-800'
                          }`}
                          aria-label={`Type: ${classInfo.type || 'lesson'}`}
                        >
                          {classInfo.type || 'lesson'}
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500" role="status">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" aria-hidden="true" />
                    <p>No classes scheduled for today</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </DashboardLayout>
  )
}
