import React, { memo, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  School,
  BookOpen,
  ClipboardList,
  Plus,
  Users,
  Monitor,
  FileText,
  Calendar,
} from 'lucide-react'
import { useHeadteacherActions } from '@/lib/hooks/useHeadteacherActions'

export const HeadteacherAcademicManagement = memo(function HeadteacherAcademicManagement() {
  const [stats, setStats] = useState({ classes: 0, subjects: 0, assessments: 0 })
  const [loading, setLoading] = useState(true)
  const {
    handleCreateClass,
    handleAddSubject,
    handleScheduleAssessment,
    handleAssignTeachers,
    handleMonitorPerformance,
    handleViewCurriculum,
    handleViewResults,
    handleManageSchedule,
  } = useHeadteacherActions()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/academic-management', {
          credentials: 'include',
          cache: 'no-store',
        })
        const data = await res.json().catch(() => null)
        if (cancelled) return
        setStats({
          classes: Number(data?.classes) || 0,
          subjects: Number(data?.subjects) || 0,
          assessments: Number(data?.assessments) || 0,
        })
      } catch {
        if (cancelled) return
        setStats({ classes: 0, subjects: 0, assessments: 0 })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* Academic Management Header */}
      <div className="bg-royalPurple-deep border border-royalPurple-border rounded-2xl p-8 text-center">
        <h2 className="text-3xl font-bold text-royalPurple-text1 mb-2">Academic Management</h2>
        <p className="text-royalPurple-text2 text-sm">
          Comprehensive oversight of classes, subjects, and assessments
        </p>
      </div>

      {/* Academic Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Classes Management */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-royalPurple-border">
            <CardTitle className="flex items-center text-royalPurple-text1">
              <School className="h-6 w-6 mr-3 text-royalPurple-text2" />
              Classes Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-royalPurple-card2 border border-royalPurple-border rounded-lg">
                <span className="text-royalPurple-text2 font-medium">Total Classes</span>
                <span className="font-bold text-royalPurple-text1 text-xl">
                  {loading ? '—' : stats.classes}
                </span>
              </div>
              <div className="space-y-3">
                <Button className="w-full py-3" onClick={handleCreateClass}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Class
                </Button>
                <Button variant="outline" className="w-full py-3" onClick={handleAssignTeachers}>
                  <Users className="h-4 w-4 mr-2" />
                  Assign Teachers
                </Button>
                <Button
                  variant="outline"
                  className="w-full py-3"
                  onClick={handleMonitorPerformance}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Monitor Performance
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Management */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-royalPurple-border">
            <CardTitle className="flex items-center text-royalPurple-text1">
              <BookOpen className="h-6 w-6 mr-3 text-royalPurple-text2" />
              Subjects Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-royalPurple-card2 border border-royalPurple-border rounded-lg">
                <span className="text-royalPurple-text2 font-medium">Total Subjects</span>
                <span className="font-bold text-royalPurple-text1 text-xl">
                  {loading ? '—' : stats.subjects}
                </span>
              </div>
              <div className="space-y-3">
                <Button className="w-full py-3" onClick={handleAddSubject}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Subject
                </Button>
                <Button variant="outline" className="w-full py-3" onClick={handleAssignTeachers}>
                  <Users className="h-4 w-4 mr-2" />
                  Assign Teachers
                </Button>
                <Button variant="outline" className="w-full py-3" onClick={handleViewCurriculum}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Curriculum
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessments Management */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-royalPurple-border">
            <CardTitle className="flex items-center text-royalPurple-text1">
              <ClipboardList className="h-6 w-6 mr-3 text-royalPurple-text2" />
              Assessments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-royalPurple-card2 border border-royalPurple-border rounded-lg">
                <span className="text-royalPurple-text2 font-medium">Total Assessments</span>
                <span className="font-bold text-royalPurple-text1 text-xl">
                  {loading ? '—' : stats.assessments}
                </span>
              </div>
              <div className="space-y-3">
                <Button className="w-full py-3" onClick={handleScheduleAssessment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Assessment
                </Button>
                <Button variant="outline" className="w-full py-3" onClick={handleViewResults}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Results
                </Button>
                <Button variant="outline" className="w-full py-3" onClick={handleManageSchedule}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Schedule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})
