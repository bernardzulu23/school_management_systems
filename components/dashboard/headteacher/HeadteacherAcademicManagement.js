import React, { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  School, BookOpen, ClipboardList, Plus, Users, Monitor, FileText, Calendar
} from 'lucide-react'
import { useHeadteacher } from '@/lib/context/HeadteacherContext'
import { useHeadteacherActions } from '@/lib/hooks/useHeadteacherActions'

export const HeadteacherAcademicManagement = memo(function HeadteacherAcademicManagement() {
  const { stats, schoolStats } = useHeadteacher()
  const {
    handleCreateClass,
    handleAddSubject,
    handleScheduleAssessment,
    handleAssignTeachers,
    handleMonitorPerformance,
    handleViewCurriculum,
    handleViewResults,
    handleManageSchedule
  } = useHeadteacherActions()
  return (
    <div className="space-y-8">
      {/* Academic Management Header */}
      <div className="backdrop-blur-lg bg-slate-800/60 border border-blue-500/40 rounded-3xl p-8 text-center shadow-2xl">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
          Academic Management
        </h2>
        <p className="text-slate-300 text-lg">Comprehensive oversight of classes, subjects, and assessments</p>
      </div>

      {/* Academic Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Classes Management */}
        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardHeader className="backdrop-blur-md bg-blue-600/60 border-b border-blue-400/50 text-white rounded-t-3xl">
            <CardTitle className="flex items-center text-white">
              <School className="h-6 w-6 mr-3" />
              Classes Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300 font-medium">Total Classes</span>
                <span className="font-bold text-blue-400 text-xl">{stats?.stats?.total_classes || 0}</span>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                  onClick={handleCreateClass}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Class
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-blue-400 text-blue-300 hover:bg-blue-600/20 font-semibold py-3"
                  onClick={handleAssignTeachers}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assign Teachers
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-blue-400 text-blue-300 hover:bg-blue-600/20 font-semibold py-3"
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
        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardHeader className="backdrop-blur-md bg-purple-600/60 border-b border-purple-400/50 text-white rounded-t-3xl">
            <CardTitle className="flex items-center text-white">
              <BookOpen className="h-6 w-6 mr-3" />
              Subjects Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300 font-medium">Total Subjects</span>
                <span className="font-bold text-purple-400 text-xl">{stats?.stats?.total_subjects || 0}</span>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
                  onClick={handleAddSubject}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Subject
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-purple-400 text-purple-300 hover:bg-purple-600/20 font-semibold py-3"
                  onClick={handleAssignTeachers}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assign Teachers
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-purple-400 text-purple-300 hover:bg-purple-600/20 font-semibold py-3"
                  onClick={handleViewCurriculum}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Curriculum
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessments Management */}
        <Card variant="glass" className="hover:scale-105 transition-all duration-300">
          <CardHeader className="backdrop-blur-md bg-orange-600/60 border-b border-orange-400/50 text-white rounded-t-3xl">
            <CardTitle className="flex items-center text-white">
              <ClipboardList className="h-6 w-6 mr-3" />
              Assessments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300 font-medium">Total Assessments</span>
                <span className="font-bold text-orange-400 text-xl">{stats?.stats?.total_assessments || 0}</span>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3"
                  onClick={handleScheduleAssessment}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Assessment
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-orange-400 text-orange-300 hover:bg-orange-600/20 font-semibold py-3"
                  onClick={handleViewResults}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Results
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-orange-400 text-orange-300 hover:bg-orange-600/20 font-semibold py-3"
                  onClick={handleManageSchedule}
                >
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
