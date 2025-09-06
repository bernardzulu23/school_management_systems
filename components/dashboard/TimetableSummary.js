'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { timetableAPI, timeSlots } from '@/lib/timetableData'
import {
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  Users,
  User,
  ChevronRight,
  AlertCircle
} from 'lucide-react'

export function TimetableSummary({ userRole, userId, className = "" }) {
  const [todaySchedule, setTodaySchedule] = useState([])
  const [nextClass, setNextClass] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get timetable data based on user role
  const getTimetableData = () => {
    if (userRole === 'student') {
      // In a real app, get student's class ID from user profile
      const studentClassId = 5 // Grade 10A
      return timetableAPI.getStudentTimetable(studentClassId)
    } else if (userRole === 'teacher') {
      // In a real app, get teacher ID from user profile
      const teacherId = 1 // Mr. John Smith
      return timetableAPI.getTeacherTimetable(teacherId)
    }
    return {}
  }

  // Fallback sample data for demonstration
  const getSampleData = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    
    if (userRole === 'student') {
      return {
        Monday: {
          1: { subject: 'Mathematics', teacher: 'Mr. John Smith', classroom: 'Room 101', color: '#3B82F6' },
          2: { subject: 'English', teacher: 'Mrs. Sarah Johnson', classroom: 'Room 102', color: '#10B981' },
          3: { subject: 'Physics', teacher: 'Mr. John Smith', classroom: 'Lab 201', color: '#8B5CF6' },
          5: { subject: 'Chemistry', teacher: 'Dr. Michael Brown', classroom: 'Lab 201', color: '#F59E0B' },
          6: { subject: 'History', teacher: 'Ms. Emily Davis', classroom: 'Room 301', color: '#6B7280' },
          9: { subject: 'Art', teacher: 'Mrs. Lisa Anderson', classroom: 'Art Studio', color: '#EC4899' }
        },
        Tuesday: {
          1: { subject: 'Biology', teacher: 'Dr. Michael Brown', classroom: 'Lab 201', color: '#EF4444' },
          2: { subject: 'Mathematics', teacher: 'Mr. John Smith', classroom: 'Room 101', color: '#3B82F6' },
          5: { subject: 'English', teacher: 'Mrs. Sarah Johnson', classroom: 'Room 102', color: '#10B981' },
          6: { subject: 'Physics', teacher: 'Mr. John Smith', classroom: 'Lab 201', color: '#8B5CF6' },
          9: { subject: 'Chemistry', teacher: 'Dr. Michael Brown', classroom: 'Lab 201', color: '#F59E0B' }
        },
        Wednesday: {
          1: { subject: 'English', teacher: 'Mrs. Sarah Johnson', classroom: 'Room 102', color: '#10B981' },
          2: { subject: 'Physics', teacher: 'Mr. John Smith', classroom: 'Lab 201', color: '#8B5CF6' },
          3: { subject: 'Mathematics', teacher: 'Mr. John Smith', classroom: 'Room 101', color: '#3B82F6' },
          5: { subject: 'Biology', teacher: 'Dr. Michael Brown', classroom: 'Lab 201', color: '#EF4444' },
          9: { subject: 'Art', teacher: 'Mrs. Lisa Anderson', classroom: 'Art Studio', color: '#EC4899' }
        },
        Thursday: {
          1: { subject: 'Chemistry', teacher: 'Dr. Michael Brown', classroom: 'Lab 201', color: '#F59E0B' },
          2: { subject: 'History', teacher: 'Ms. Emily Davis', classroom: 'Room 301', color: '#6B7280' },
          5: { subject: 'Mathematics', teacher: 'Mr. John Smith', classroom: 'Room 101', color: '#3B82F6' },
          6: { subject: 'English', teacher: 'Mrs. Sarah Johnson', classroom: 'Room 102', color: '#10B981' },
          9: { subject: 'Physics', teacher: 'Mr. John Smith', classroom: 'Lab 201', color: '#8B5CF6' }
        },
        Friday: {
          1: { subject: 'Geography', teacher: 'Ms. Emily Davis', classroom: 'Room 301', color: '#14B8A6' },
          2: { subject: 'Biology', teacher: 'Dr. Michael Brown', classroom: 'Lab 201', color: '#EF4444' },
          5: { subject: 'Physics', teacher: 'Mr. John Smith', classroom: 'Lab 201', color: '#8B5CF6' },
          6: { subject: 'Mathematics', teacher: 'Mr. John Smith', classroom: 'Room 101', color: '#3B82F6' },
          9: { subject: 'Computer Science', teacher: 'Mr. David Wilson', classroom: 'Lab 202', color: '#F97316' }
        }
      }
    } else if (userRole === 'teacher') {
      return {
        Monday: {
          1: { subject: 'Mathematics', class: 'Grade 10A', classroom: 'Room 101', students: 30, color: '#3B82F6' },
          3: { subject: 'Physics', class: 'Grade 10A', classroom: 'Lab 201', students: 30, color: '#8B5CF6' },
          6: { subject: 'Mathematics', class: 'Grade 9A', classroom: 'Room 101', students: 35, color: '#3B82F6' },
          9: { subject: 'Physics', class: 'Grade 11A', classroom: 'Lab 201', students: 25, color: '#8B5CF6' }
        },
        Tuesday: {
          2: { subject: 'Mathematics', class: 'Grade 10A', classroom: 'Room 101', students: 30, color: '#3B82F6' },
          5: { subject: 'Physics', class: 'Grade 9A', classroom: 'Lab 201', students: 35, color: '#8B5CF6' },
          6: { subject: 'Physics', class: 'Grade 10A', classroom: 'Lab 201', students: 30, color: '#8B5CF6' },
          9: { subject: 'Mathematics', class: 'Grade 11A', classroom: 'Room 101', students: 25, color: '#3B82F6' }
        },
        Wednesday: {
          2: { subject: 'Physics', class: 'Grade 10A', classroom: 'Lab 201', students: 30, color: '#8B5CF6' },
          3: { subject: 'Mathematics', class: 'Grade 10A', classroom: 'Room 101', students: 30, color: '#3B82F6' },
          5: { subject: 'Mathematics', class: 'Grade 8A', classroom: 'Room 101', students: 35, color: '#3B82F6' },
          9: { subject: 'Mathematics', class: 'Grade 9A', classroom: 'Room 101', students: 35, color: '#3B82F6' }
        },
        Thursday: {
          5: { subject: 'Mathematics', class: 'Grade 10A', classroom: 'Room 101', students: 30, color: '#3B82F6' },
          7: { subject: 'Mathematics', class: 'Grade 11A', classroom: 'Room 101', students: 25, color: '#3B82F6' },
          9: { subject: 'Physics', class: 'Grade 10A', classroom: 'Lab 201', students: 30, color: '#8B5CF6' }
        },
        Friday: {
          5: { subject: 'Physics', class: 'Grade 10A', classroom: 'Lab 201', students: 30, color: '#8B5CF6' },
          6: { subject: 'Mathematics', class: 'Grade 10A', classroom: 'Room 101', students: 30, color: '#3B82F6' },
          9: { subject: 'Mathematics', class: 'Grade 8A', classroom: 'Room 101', students: 35, color: '#3B82F6' }
        }
      }
    }
    
    return {}
  }

  function getTodaySchedule() {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const timetableData = getTimetableData()

    // Use centralized data if available, otherwise fall back to sample data
    const dataToUse = Object.keys(timetableData).length > 0 ? timetableData : getSampleData()

    if (!dataToUse[today]) return []
    
    const todayClasses = []
    const daySchedule = dataToUse[today]
    
    timeSlots.forEach(slot => {
      if (!slot.isBreak && daySchedule[slot.id]) {
        todayClasses.push({
          ...daySchedule[slot.id],
          time: slot.time,
          period: slot.label,
          slotId: slot.id
        })
      }
    })
    
    return todayClasses
  }

  function getNextClass() {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const today = now.toLocaleDateString('en-US', { weekday: 'long' })
    const sampleData = getSampleData()
    
    if (!sampleData[today]) return null
    
    const daySchedule = sampleData[today]
    
    for (const slot of timeSlots) {
      if (!slot.isBreak && daySchedule[slot.id]) {
        const [startTime] = slot.time.split('-')
        const [hours, minutes] = startTime.split(':').map(Number)
        const slotTime = hours * 60 + minutes
        
        if (slotTime > currentTime) {
          return {
            ...daySchedule[slot.id],
            time: slot.time,
            period: slot.label,
            minutesUntil: slotTime - currentTime
          }
        }
      }
    }
    
    return null
  }

  useEffect(() => {
    setTodaySchedule(getTodaySchedule())
    setNextClass(getNextClass())
    setIsLoading(false)
  }, [userRole, userId])

  const getTimetableLink = () => {
    switch (userRole) {
      case 'student': return '/dashboard/timetable/student'
      case 'teacher': return '/dashboard/timetable/teacher'
      case 'hod': return '/dashboard/timetable/hod'
      case 'headteacher': return '/dashboard/timetable/master'
      default: return '/dashboard'
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Today's Schedule
          </span>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = getTimetableLink()}>
            View Full
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Next Class Alert */}
        {nextClass && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-green-600 mr-2" />
              <div className="flex-1">
                <div className="text-sm font-medium text-green-900">
                  Next: {nextClass.subject} {userRole === 'teacher' && `- ${nextClass.class}`}
                </div>
                <div className="text-xs text-green-700">
                  {nextClass.time} • {nextClass.minutesUntil < 60 ? `${nextClass.minutesUntil}m` : `${Math.floor(nextClass.minutesUntil / 60)}h ${nextClass.minutesUntil % 60}m`} remaining
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Today's Classes */}
        {todaySchedule.length > 0 ? (
          <div className="space-y-3">
            {todaySchedule.slice(0, 4).map((cls, index) => (
              <div key={index} className="flex items-center p-3 rounded-lg border" style={{ borderLeftColor: cls.color, borderLeftWidth: '4px' }}>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">
                    {cls.subject} {userRole === 'teacher' && `- ${cls.class}`}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {cls.time} ({cls.period})
                  </div>
                  <div className="text-xs text-gray-600 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {cls.classroom}
                  </div>
                  {userRole === 'student' && (
                    <div className="text-xs text-gray-600 flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {cls.teacher}
                    </div>
                  )}
                  {userRole === 'teacher' && (
                    <div className="text-xs text-gray-600 flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {cls.students} students
                    </div>
                  )}
                </div>
              </div>
            ))}
            {todaySchedule.length > 4 && (
              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={() => window.location.href = getTimetableLink()}>
                  +{todaySchedule.length - 4} more classes
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No classes scheduled for today</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
