'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { timetableAPI, timeSlots } from '@/lib/timetableData'
import SkeletonLoader from '@/components/SkeletonLoader'
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
      // TODO: Get student's class ID from user profile context
      const studentClassId = 5 // Placeholder for now until context is available
      return timetableAPI.getStudentTimetable(studentClassId)
    } else if (userRole === 'teacher') {
      // TODO: Get teacher ID from user profile context
      const teacherId = 1 // Placeholder for now until context is available
      return timetableAPI.getTeacherTimetable(teacherId)
    }
    return {}
  }

  function getTodaySchedule() {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const timetableData = getTimetableData()

    if (!timetableData[today]) return []
    
    const todayClasses = []
    const daySchedule = timetableData[today]
    
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
    const timetableData = getTimetableData()
    
    if (!timetableData[today]) return null
    
    const daySchedule = timetableData[today]
    
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
      <Card className={className} role="status" aria-busy="true" aria-label="Loading timetable summary">
        <CardContent className="p-6">
          <div className="space-y-4">
            <SkeletonLoader variant="text" width="40%" height="24px" />
            <div className="space-y-3">
              <SkeletonLoader variant="rectangular" height="80px" className="rounded-lg" />
              <SkeletonLoader variant="rectangular" height="60px" className="rounded-lg" />
              <SkeletonLoader variant="rectangular" height="60px" className="rounded-lg" />
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
            <Calendar className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
            Today's Schedule
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.location.href = getTimetableLink()}
            aria-label="View full timetable"
          >
            View Full
            <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Next Class Alert */}
        {nextClass && (
          <div 
            className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-green-600 mr-2" aria-hidden="true" />
              <div className="flex-1">
                <div className="text-sm font-medium text-green-900">
                  <span className="sr-only">Next class: </span>
                  {nextClass.subject} {userRole === 'teacher' && `- ${nextClass.class}`}
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
          <ul className="space-y-3" role="list" aria-label="Today's classes">
            {todaySchedule.slice(0, 4).map((cls, index) => (
              <li key={index}>
                <article 
                  className="flex items-center p-3 rounded-lg border focus-within:ring-2 focus-within:ring-blue-500 outline-none transition-shadow" 
                  style={{ borderLeftColor: cls.color, borderLeftWidth: '4px' }}
                  tabIndex="0"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">
                      {cls.subject} {userRole === 'teacher' && `- ${cls.class}`}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                      <span className="sr-only">Time: </span>{cls.time} ({cls.period})
                    </div>
                    <div className="text-xs text-gray-600 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" aria-hidden="true" />
                      <span className="sr-only">Location: </span>{cls.classroom}
                    </div>
                    {userRole === 'student' && (
                      <div className="text-xs text-gray-600 flex items-center">
                        <User className="h-3 w-3 mr-1" aria-hidden="true" />
                        <span className="sr-only">Teacher: </span>{cls.teacher}
                      </div>
                    )}
                    {userRole === 'teacher' && (
                      <div className="text-xs text-gray-600 flex items-center">
                        <Users className="h-3 w-3 mr-1" aria-hidden="true" />
                        <span className="sr-only">Students: </span>{cls.students} students
                      </div>
                    )}
                  </div>
                </article>
              </li>
            ))}
            {todaySchedule.length > 4 && (
              <li className="text-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.location.href = getTimetableLink()}
                  aria-label={`View ${todaySchedule.length - 4} more classes`}
                >
                  +{todaySchedule.length - 4} more classes
                </Button>
              </li>
            )}
          </ul>
        ) : (
          <div className="text-center text-gray-500 py-8" role="status">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" aria-hidden="true" />
            <p className="text-sm">No classes scheduled for today</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
