'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { 
  Calendar, Clock, BookOpen, Users, MapPin, 
  ChevronLeft, ChevronRight, Download, Filter, 
  Bell, AlertCircle, CheckCircle
} from 'lucide-react'

export default function TimetablePage() {
  const { user } = useAuth()
  const [selectedWeek, setSelectedWeek] = useState(0) // 0 = current week
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())

  const isStudent = user?.role === 'student'
  const isTeacher = user?.role === 'teacher'

  // Mock timetable data
  const mockTimetable = {
    student: {
      class: 'Grade 10A',
      schedule: {
        Monday: [
          { time: '08:00-08:45', subject: 'Mathematics', teacher: 'Ms. Emily Davis', room: 'Room 101', type: 'lesson' },
          { time: '08:45-09:30', subject: 'Physics', teacher: 'Mr. John Smith', room: 'Lab 1', type: 'lesson' },
          { time: '09:30-09:45', subject: 'Break', teacher: '', room: '', type: 'break' },
          { time: '09:45-10:30', subject: 'Chemistry', teacher: 'Dr. Sarah Wilson', room: 'Lab 2', type: 'lesson' },
          { time: '10:30-11:15', subject: 'English', teacher: 'Ms. Jane Brown', room: 'Room 203', type: 'lesson' },
          { time: '11:15-12:00', subject: 'History', teacher: 'Mr. David Lee', room: 'Room 105', type: 'lesson' },
          { time: '12:00-13:00', subject: 'Lunch Break', teacher: '', room: '', type: 'break' },
          { time: '13:00-13:45', subject: 'Biology', teacher: 'Dr. Lisa Chen', room: 'Lab 3', type: 'lesson' },
          { time: '13:45-14:30', subject: 'Physical Education', teacher: 'Coach Mike', room: 'Gymnasium', type: 'lesson' }
        ],
        Tuesday: [
          { time: '08:00-08:45', subject: 'English', teacher: 'Ms. Jane Brown', room: 'Room 203', type: 'lesson' },
          { time: '08:45-09:30', subject: 'Mathematics', teacher: 'Ms. Emily Davis', room: 'Room 101', type: 'lesson' },
          { time: '09:30-09:45', subject: 'Break', teacher: '', room: '', type: 'break' },
          { time: '09:45-10:30', subject: 'Physics', teacher: 'Mr. John Smith', room: 'Lab 1', type: 'lesson' },
          { time: '10:30-11:15', subject: 'Chemistry', teacher: 'Dr. Sarah Wilson', room: 'Lab 2', type: 'lesson' },
          { time: '11:15-12:00', subject: 'Computer Science', teacher: 'Mr. Alex Tech', room: 'Computer Lab', type: 'lesson' },
          { time: '12:00-13:00', subject: 'Lunch Break', teacher: '', room: '', type: 'break' },
          { time: '13:00-13:45', subject: 'Art', teacher: 'Ms. Creative', room: 'Art Studio', type: 'lesson' },
          { time: '13:45-14:30', subject: 'Study Hall', teacher: 'Various', room: 'Library', type: 'study' }
        ],
        Wednesday: [
          { time: '08:00-08:45', subject: 'Biology', teacher: 'Dr. Lisa Chen', room: 'Lab 3', type: 'lesson' },
          { time: '08:45-09:30', subject: 'Mathematics', teacher: 'Ms. Emily Davis', room: 'Room 101', type: 'lesson' },
          { time: '09:30-09:45', subject: 'Break', teacher: '', room: '', type: 'break' },
          { time: '09:45-10:30', subject: 'English', teacher: 'Ms. Jane Brown', room: 'Room 203', type: 'lesson' },
          { time: '10:30-11:15', subject: 'History', teacher: 'Mr. David Lee', room: 'Room 105', type: 'lesson' },
          { time: '11:15-12:00', subject: 'Physics', teacher: 'Mr. John Smith', room: 'Lab 1', type: 'lesson' },
          { time: '12:00-13:00', subject: 'Lunch Break', teacher: '', room: '', type: 'break' },
          { time: '13:00-13:45', subject: 'Chemistry', teacher: 'Dr. Sarah Wilson', room: 'Lab 2', type: 'lesson' },
          { time: '13:45-14:30', subject: 'Music', teacher: 'Mr. Melody', room: 'Music Room', type: 'lesson' }
        ],
        Thursday: [
          { time: '08:00-08:45', subject: 'Computer Science', teacher: 'Mr. Alex Tech', room: 'Computer Lab', type: 'lesson' },
          { time: '08:45-09:30', subject: 'Mathematics', teacher: 'Ms. Emily Davis', room: 'Room 101', type: 'lesson' },
          { time: '09:30-09:45', subject: 'Break', teacher: '', room: '', type: 'break' },
          { time: '09:45-10:30', subject: 'Physics', teacher: 'Mr. John Smith', room: 'Lab 1', type: 'lesson' },
          { time: '10:30-11:15', subject: 'English', teacher: 'Ms. Jane Brown', room: 'Room 203', type: 'lesson' },
          { time: '11:15-12:00', subject: 'Biology', teacher: 'Dr. Lisa Chen', room: 'Lab 3', type: 'lesson' },
          { time: '12:00-13:00', subject: 'Lunch Break', teacher: '', room: '', type: 'break' },
          { time: '13:00-13:45', subject: 'History', teacher: 'Mr. David Lee', room: 'Room 105', type: 'lesson' },
          { time: '13:45-14:30', subject: 'Physical Education', teacher: 'Coach Mike', room: 'Gymnasium', type: 'lesson' }
        ],
        Friday: [
          { time: '08:00-08:45', subject: 'Mathematics', teacher: 'Ms. Emily Davis', room: 'Room 101', type: 'lesson' },
          { time: '08:45-09:30', subject: 'Chemistry', teacher: 'Dr. Sarah Wilson', room: 'Lab 2', type: 'lesson' },
          { time: '09:30-09:45', subject: 'Break', teacher: '', room: '', type: 'break' },
          { time: '09:45-10:30', subject: 'English', teacher: 'Ms. Jane Brown', room: 'Room 203', type: 'lesson' },
          { time: '10:30-11:15', subject: 'Biology', teacher: 'Dr. Lisa Chen', room: 'Lab 3', type: 'lesson' },
          { time: '11:15-12:00', subject: 'Art', teacher: 'Ms. Creative', room: 'Art Studio', type: 'lesson' },
          { time: '12:00-13:00', subject: 'Lunch Break', teacher: '', room: '', type: 'break' },
          { time: '13:00-13:45', subject: 'Assembly', teacher: 'All Staff', room: 'Main Hall', type: 'assembly' },
          { time: '13:45-14:30', subject: 'Free Period', teacher: '', room: 'Various', type: 'free' }
        ]
      }
    },
    teacher: {
      schedule: {
        Monday: [
          { time: '08:00-08:45', subject: 'Mathematics', class: 'Grade 10A', room: 'Room 101', type: 'lesson' },
          { time: '08:45-09:30', subject: 'Mathematics', class: 'Grade 9B', room: 'Room 101', type: 'lesson' },
          { time: '09:30-09:45', subject: 'Break', class: '', room: '', type: 'break' },
          { time: '09:45-10:30', subject: 'Mathematics', class: 'Grade 11A', room: 'Room 101', type: 'lesson' },
          { time: '10:30-11:15', subject: 'Free Period', class: '', room: 'Staff Room', type: 'free' },
          { time: '11:15-12:00', subject: 'Mathematics', class: 'Grade 12A', room: 'Room 101', type: 'lesson' },
          { time: '12:00-13:00', subject: 'Lunch Break', class: '', room: '', type: 'break' },
          { time: '13:00-13:45', subject: 'Mathematics', class: 'Grade 10B', room: 'Room 101', type: 'lesson' },
          { time: '13:45-14:30', subject: 'Preparation', class: '', room: 'Staff Room', type: 'prep' }
        ]
        // Add other days similar to Monday
      }
    }
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const weekDays = days.slice(1, 6) // Monday to Friday

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
  const currentSchedule = isStudent ? mockTimetable.student.schedule : mockTimetable.teacher.schedule

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isStudent ? "My Timetable" : "Teaching Schedule"}
            </h1>
            <p className="text-gray-600">
              {isStudent 
                ? `Class schedule for ${mockTimetable.student.class}` 
                : "Your teaching schedule and class assignments"
              }
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {!isStudent && (
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            )}
          </div>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedWeek(selectedWeek - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Week
              </Button>
              
              <div className="flex items-center space-x-4">
                {weekDates.map((dayInfo, index) => (
                  <button
                    key={dayInfo.day}
                    onClick={() => setSelectedDay(index + 1)}
                    className={`p-3 rounded-lg border transition-colors ${
                      dayInfo.isToday 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : selectedDay === index + 1
                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-sm font-medium">{dayInfo.day.slice(0, 3)}</div>
                    <div className="text-xs">{dayInfo.date}/{dayInfo.month}</div>
                  </button>
                ))}
              </div>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedWeek(selectedWeek + 1)}
              >
                Next Week
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timetable Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-3 bg-gray-50 text-left font-medium">Time</th>
                    {weekDays.map((day, index) => (
                      <th 
                        key={day} 
                        className={`border border-gray-300 p-3 text-center font-medium ${
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
                  {/* Generate time slots based on Monday's schedule */}
                  {currentSchedule.Monday?.map((timeSlot, timeIndex) => (
                    <tr key={timeIndex}>
                      <td className="border border-gray-300 p-3 bg-gray-50 font-medium text-sm">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-500" />
                          {timeSlot.time}
                        </div>
                      </td>
                      {weekDays.map((day) => {
                        const daySchedule = currentSchedule[day]
                        const classInfo = daySchedule?.[timeIndex]
                        
                        return (
                          <td key={day} className="border border-gray-300 p-2">
                            {classInfo && (
                              <div className={`p-3 rounded-lg border-2 ${getSubjectColor(classInfo.type)}`}>
                                <div className="font-medium text-sm mb-1">
                                  {classInfo.subject}
                                </div>
                                {classInfo.type === 'lesson' && (
                                  <>
                                    <div className="text-xs flex items-center mb-1">
                                      {isStudent ? (
                                        <>
                                          <Users className="h-3 w-3 mr-1" />
                                          {classInfo.teacher}
                                        </>
                                      ) : (
                                        <>
                                          <BookOpen className="h-3 w-3 mr-1" />
                                          {classInfo.class}
                                        </>
                                      )}
                                    </div>
                                    <div className="text-xs flex items-center">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {classInfo.room}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentSchedule[days[new Date().getDay()]]?.map((classInfo, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  classInfo.type === 'lesson' ? 'border-blue-500 bg-blue-50' :
                  classInfo.type === 'break' ? 'border-gray-500 bg-gray-50' :
                  'border-green-500 bg-green-50'
                }`}>
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
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      classInfo.type === 'lesson' ? 'bg-blue-100 text-blue-800' :
                      classInfo.type === 'break' ? 'bg-gray-100 text-gray-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {classInfo.type}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No classes scheduled for today</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
