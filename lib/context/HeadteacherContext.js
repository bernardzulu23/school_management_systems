import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { logger } from '@/lib/utils/logger'

const HeadteacherContext = createContext()

export function HeadteacherProvider({ children }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedTerm, setSelectedTerm] = useState('All Terms')
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
  })

  const schoolStats = useMemo(() => {
    const data = dashboardData || stats?.data
    return {
      totalStudents: data?.totalStudents || data?.total_students || 0,
      totalTeachers: data?.totalTeachers || data?.total_teachers || 0,
      totalHODs: data?.totalHods || data?.total_hods || 0,
      totalClasses: data?.totalClasses || data?.total_classes || 0,
      totalSubjects: data?.totalSubjects || data?.total_subjects || 0,
      totalAssessments: data?.totalAssessments || data?.total_assessments || 0,
      attendanceRate: data?.attendanceRate || data?.attendance_rate || 0,
      studentAchievement: data?.studentAchievement || data?.student_achievement || 0,
      passRate: data?.passRate || data?.pass_rate || 0,
      teacherEffectiveness: data?.teacherEffectiveness || data?.teacher_effectiveness || 0,
      complianceRate: data?.complianceRate || data?.compliance_rate || 0,
      teacherDevelopment: data?.teacherDevelopment || data?.teacher_development || 0,
    }
  }, [stats, dashboardData])

  const refreshAll = async () => {
    await Promise.all([refetchStats(), refetchDashboard()])
  }

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
    error: statsError || dashboardError,
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
