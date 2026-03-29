import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { logger } from '@/lib/utils/logger'
import { ERROR_MESSAGES } from '@/lib/utils/errorMessages'
import toast from 'react-hot-toast'

export function useHeadteacherActions() {
  const queryClient = useQueryClient()

  const handleCreateClass = useCallback(async () => {
    const name = prompt('Enter class name (e.g. 8A or Form 1A):')
    if (name) {
      try {
        await api.post('/classes', { name })
        toast.success('Class created successfully')
        queryClient.invalidateQueries({ queryKey: ['headteacher-dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      } catch (error) {
        logger.error('Failed to create class', error)
        toast.error(
          ERROR_MESSAGES.UPDATE_ERROR + ': ' + (error.response?.data?.error || error.message)
        )
      }
    }
  }, [queryClient])

  const handleAddSubject = useCallback(async () => {
    const name = prompt('Enter subject name (e.g. Mathematics):')
    if (name) {
      try {
        await api.post('/subjects', { name })
        toast.success('Subject added successfully')
        queryClient.invalidateQueries({ queryKey: ['headteacher-dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      } catch (error) {
        logger.error('Failed to add subject', error)
        toast.error(
          ERROR_MESSAGES.UPDATE_ERROR + ': ' + (error.response?.data?.error || error.message)
        )
      }
    }
  }, [queryClient])

  const handleScheduleAssessment = useCallback(async () => {
    const title = prompt('Enter assessment title (e.g. Mid-Term Math):')
    if (title) {
      const subject = prompt('Enter subject (e.g. Mathematics):')
      if (!subject) return
      const className = prompt('Enter class (e.g. 8A or Form 1A):')
      if (!className) return
      const date = prompt('Enter date (YYYY-MM-DD):', new Date().toISOString().split('T')[0])
      if (date) {
        const type = prompt('Enter type (exam/quiz/assignment):', 'quiz') || 'quiz'
        const duration = prompt('Enter duration in minutes:', '60') || '60'
        try {
          await api.post('/assessments', {
            title,
            subject,
            class: className,
            date,
            type,
            duration_minutes: duration,
          })
          toast.success('Assessment scheduled successfully')
          queryClient.invalidateQueries({ queryKey: ['headteacher-dashboard'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        } catch (error) {
          logger.error('Failed to schedule assessment', error)
          toast.error(
            ERROR_MESSAGES.UPDATE_ERROR + ': ' + (error.response?.data?.error || error.message)
          )
        }
      }
    }
  }, [queryClient])

  const handleCreateGoal = useCallback(() => {
    toast('Create Goal functionality - Coming soon')
  }, [])

  const handleMonitorProgress = useCallback(() => {
    toast('Monitor Progress functionality - Coming soon')
  }, [])

  const handleGenerateReports = useCallback(() => {
    toast('Generate Reports functionality - Coming soon')
  }, [])

  const handleScheduleReviews = useCallback(() => {
    toast('Schedule Reviews functionality - Coming soon')
  }, [])

  const handleAssignTeachers = useCallback(() => {
    toast('Assign Teachers functionality - Coming soon')
  }, [])

  const handleMonitorPerformance = useCallback(() => {
    toast('Monitor Performance functionality - Coming soon')
  }, [])

  const handleViewCurriculum = useCallback(() => {
    toast('View Curriculum functionality - Coming soon')
  }, [])

  const handleViewResults = useCallback(() => {
    toast('View Results functionality - Coming soon')
  }, [])

  const handleManageSchedule = useCallback(() => {
    toast('Manage Schedule functionality - Coming soon')
  }, [])

  return {
    handleCreateClass,
    handleAddSubject,
    handleScheduleAssessment,
    handleCreateGoal,
    handleMonitorProgress,
    handleGenerateReports,
    handleScheduleReviews,
    handleAssignTeachers,
    handleMonitorPerformance,
    handleViewCurriculum,
    handleViewResults,
    handleManageSchedule,
  }
}
