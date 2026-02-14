import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  Target, Briefcase, Plus, Monitor, BarChart3, Calendar, Clock, Award
} from 'lucide-react'
import { useHeadteacher } from '@/lib/context/HeadteacherContext'
import { useHeadteacherActions } from '@/lib/hooks/useHeadteacherActions'

export function HeadteacherStrategicPlanning() {
  const { schoolStats, dashboardData } = useHeadteacher()
  const {
    handleCreateGoal,
    handleMonitorProgress,
    handleGenerateReports,
    handleScheduleReviews
  } = useHeadteacherActions()

  const goalsData = dashboardData?.goals_summary || {
    total: schoolStats.totalGoals || 0,
    completed: 0,
    in_progress: 0,
    not_started: 0,
    progress_percentage: 0
  }

  return (
    <div className="space-y-6">
      {/* Strategic Planning Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Strategic Planning</h2>
        <p className="text-gray-600">School-wide goals and strategic management</p>
      </div>

      {/* Goal Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              School Goals Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Goals</span>
                <span className="font-bold text-blue-600">{goalsData.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="font-bold text-green-600">{goalsData.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">In Progress</span>
                <span className="font-bold text-yellow-600">{goalsData.in_progress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Not Started</span>
                <span className="font-bold text-gray-600">{goalsData.not_started}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${goalsData.progress_percentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 text-center">{goalsData.progress_percentage}% Overall Progress</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-green-600 text-white">
            <CardTitle className="flex items-center">
              <Briefcase className="h-5 w-5 mr-2" />
              Strategic Initiatives
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Button className="w-full justify-start" onClick={handleCreateGoal}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Goal
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleMonitorProgress}>
                <Monitor className="h-4 w-4 mr-2" />
                Monitor Progress
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleGenerateReports}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Reports
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleScheduleReviews}>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Reviews
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Current Strategic Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.current_goals?.length > 0 ? (
              dashboardData.current_goals.map((goal, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{goal.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      goal.status === 'On Track' ? 'bg-green-100 text-green-800' :
                      goal.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {goal.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>Progress: {goal.progress}%</span>
                    <span>Due: {goal.due_date}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No active strategic goals found.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={handleCreateGoal}>
                  Create Your First Goal
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Strategic Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">Goal Completion Rate</h4>
            <p className="text-2xl font-bold text-blue-600">{goalsData.completion_rate || 0}%</p>
            <p className="text-sm text-gray-600">
              {goalsData.completion_rate >= 70 ? 'Above target of 70%' : 'Below target of 70%'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">On-Time Delivery</h4>
            <p className="text-2xl font-bold text-green-600">{goalsData.on_time_delivery || 0}%</p>
            <p className="text-sm text-gray-600">Goals completed on schedule</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">Impact Score</h4>
            <p className="text-2xl font-bold text-purple-600">{goalsData.impact_score || 0}/5</p>
            <p className="text-sm text-gray-600">Stakeholder satisfaction</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
