import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { logger } from '@/lib/utils/logger'

const HeadteacherContext = createContext()

function currentTermLabel() {
  const now = new Date()
  const month = now.getMonth() + 1
  const termNumber = month <= 4 ? 1 : month <= 8 ? 2 : 3
  return `Term ${termNumber}`
}

export function HeadteacherProvider({ children }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedTerm, setSelectedTerm] = useState(currentTermLabel())
  const isRetryable = (err) => {
    const status = err?.response?.status
    if (status === 503) return true
    if (status === 429) return true
    if (!status) return true
    return status >= 500
  }
  const normalizeDashboardError = (err) => {
    if (!err) return null

    const status = err?.response?.status
    const data = err?.response?.data || {}
    const rawError = String(data?.error || '')
    const rawMessage = String(data?.message || '')
    const code = data?.code || err?.response?.headers?.['x-error-code'] || null

    let display = rawError || err?.message || 'Request failed'
    if (status === 503) {
      const lower = rawError.toLowerCase()
      if (lower.includes('database unavailable')) {
        display = 'Database unavailable'
      } else if (lower.includes('schema out of date')) {
        display = 'Service temporarily unavailable'
      } else {
        display = 'Service temporarily unavailable'
      }
    }

    if (code) display = `${display} (code: ${String(code)})`

    return {
      message: err?.message || display,
      response: err?.response
        ? { ...err.response, data: { ...data, error: display, message: rawMessage } }
        : { status, data: { error: display, message: rawMessage } },
      originalError: err,
    }
  }
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () =>
      api
        .getDashboardStats()
        .then((res) => res.data)
        .catch((err) => {
          logger.error('Failed to fetch dashboard stats', err)
          throw err
        }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, err) => {
      if (!isRetryable(err)) return false
      if (err?.response?.status === 503) return failureCount < 2
      return failureCount < 3
    },
    retryDelay: (attemptIndex, err) => {
      if (err?.response?.status === 503) return Math.min(1000 * 2 ** attemptIndex, 30000)
      return Math.min(1000 * 2 ** attemptIndex, 10000)
    },
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['headteacher-dashboard', selectedTerm],
    queryFn: () =>
      api
        .getHeadteacherDashboard({ term: selectedTerm })
        .then((res) => res.data)
        .catch((err) => {
          logger.error('Failed to fetch headteacher dashboard data', err)
          throw err
        }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, err) => {
      if (!isRetryable(err)) return false
      if (err?.response?.status === 503) return failureCount < 2
      return failureCount < 3
    },
    retryDelay: (attemptIndex, err) => {
      if (err?.response?.status === 503) return Math.min(1000 * 2 ** attemptIndex, 30000)
      return Math.min(1000 * 2 ** attemptIndex, 10000)
    },
    refetchInterval: (_data, query) => (query.state.status === 'success' ? 15 * 1000 : false),
    refetchIntervalInBackground: false,
  })

  const displayError = useMemo(
    () => normalizeDashboardError(statsError || dashboardError),
    [statsError, dashboardError]
  )

  const schoolStats = useMemo(() => {
    const statsData = stats?.data || stats
    const merged = { ...(statsData || {}), ...(dashboardData || {}) }
    const hasAny =
      merged &&
      typeof merged === 'object' &&
      Object.keys(merged).some((k) => merged[k] !== null && merged[k] !== undefined)
    const data = hasAny ? merged : null
    const unknown = '—'
    return {
      totalStudents: data ? (data.totalStudents ?? data.total_students ?? 0) : unknown,
      totalTeachers: data ? (data.totalTeachers ?? data.total_teachers ?? 0) : unknown,
      totalHODs: data ? (data.totalHods ?? data.total_hods ?? 0) : unknown,
      totalClasses: data ? (data.totalClasses ?? data.total_classes ?? 0) : unknown,
      totalSubjects: data ? (data.totalSubjects ?? data.total_subjects ?? 0) : unknown,
      totalAssessments: data ? (data.totalAssessments ?? data.total_assessments ?? 0) : unknown,
      attendanceRate: data
        ? (data.attendanceRate ??
          data.attendance_rate ??
          data.averageAttendance ??
          data.average_attendance ??
          0)
        : unknown,
      studentAchievement: data
        ? (data.studentAchievement ?? data.student_achievement ?? 0)
        : unknown,
      passRate: data ? (data.passRate ?? data.pass_rate ?? 0) : unknown,
      teacherEffectiveness: data
        ? (data.teacherEffectiveness ?? data.teacher_effectiveness ?? 0)
        : unknown,
      complianceRate: data ? (data.complianceRate ?? data.compliance_rate ?? 0) : unknown,
      teacherDevelopment: data
        ? (data.teacherDevelopment ?? data.teacher_development ?? 0)
        : unknown,
    }
  }, [stats, dashboardData])

  const refreshAll = async () => {
    await Promise.all([refetchStats(), refetchDashboard()])
  }

  useEffect(() => {
    const refresh = () => Promise.all([refetchStats(), refetchDashboard()])
    const onEvent = (payload) => {
      const type = String(payload?.type || '')
      if (type !== 'results-updated') return
      refresh()
    }

    let channel = null
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('zsms-events')
      channel.onmessage = (ev) => onEvent(ev?.data)
    }

    const storageHandler = (ev) => {
      if (String(ev?.key || '') !== 'zsms-events:last-results-updated') return
      refresh()
    }

    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener('storage', storageHandler)
      if (channel) channel.close()
    }
  }, [refetchDashboard, refetchStats])

  const hasResults = useMemo(
    () =>
      dashboardData?.subject_performance &&
      Object.keys(dashboardData.subject_performance).length > 0,
    [dashboardData]
  )

  const subjectPerformanceData = useMemo(() => {
    if (!dashboardData?.subject_performance) return []
    return Object.entries(dashboardData.subject_performance).map(([name, score]) => ({
      name,
      score: Math.round(score),
    }))
  }, [dashboardData])

  const atRiskStudentsData = useMemo(() => {
    if (!dashboardData?.at_risk_summary) return []
    return Object.entries(dashboardData.at_risk_summary).map(([name, count]) => ({
      name,
      value: count,
    }))
  }, [dashboardData])

  const teacherComplianceData = useMemo(() => {
    if (!dashboardData?.teacher_compliance) return []
    return Object.entries(dashboardData.teacher_compliance).map(([name, rate]) => ({
      name,
      value: Math.round(rate),
    }))
  }, [dashboardData])

  const yearGroupPerformanceData = useMemo(() => {
    if (!dashboardData?.year_group_performance) return []
    return Object.entries(dashboardData.year_group_performance).map(([name, score]) => ({
      name,
      score: Math.round(score),
    }))
  }, [dashboardData])

  const value = {
    activeTab,
    setActiveTab,
    selectedTerm,
    setSelectedTerm,
    schoolStats,
    dashboardData,
    isLoading: statsLoading || dashboardLoading,
    error: displayError,
    stats,
    hasResults,
    subjectPerformanceData,
    atRiskStudentsData,
    teacherComplianceData,
    yearGroupPerformanceData,
    seniorResultsAnalysis: dashboardData?.seniorResultsAnalysis || null,
    refreshAll,
  }

  return <HeadteacherContext.Provider value={value}>{children}</HeadteacherContext.Provider>
}

export function useHeadteacher() {
  const context = useContext(HeadteacherContext)
  if (!context) {
    throw new Error('useHeadteacher must be used within a HeadteacherProvider')
  }
  return context
}
