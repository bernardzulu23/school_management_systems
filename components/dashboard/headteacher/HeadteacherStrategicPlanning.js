import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Target, Briefcase, Plus, Monitor, BarChart3, Calendar, Clock, Award } from 'lucide-react'
import { useHeadteacher } from '@/lib/context/HeadteacherContext'
import { useHeadteacherActions } from '@/lib/hooks/useHeadteacherActions'

export function HeadteacherStrategicPlanning() {
  const { schoolStats, dashboardData } = useHeadteacher()
  const { handleCreateGoal, handleMonitorProgress, handleGenerateReports, handleScheduleReviews } =
    useHeadteacherActions()

  const goalsData = dashboardData?.goals_summary || {
    total: schoolStats.totalGoals || 0,
    completed: 0,
    in_progress: 0,
    not_started: 0,
    progress_percentage: 0,
  }

  return (
    <div className="space-y-6">
      {/* Strategic Planning Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-royalPurple-text1 mb-2">Strategic Planning</h2>
        <p className="text-royalPurple-text2">School-wide goals and strategic management</p>
      </div>

      {/* Goal Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-royalPurple-accent text-royalPurple-text1">
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              School Goals Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-royalPurple-text2">Total Goals</span>
                <span className="font-bold text-royalPurple-accentTx">{goalsData.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-royalPurple-text2">Completed</span>
                <span className="font-bold text-royalPurple-successTx">{goalsData.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-royalPurple-text2">In Progress</span>
                <span className="text-royalPurple-accentTx font-bold">{goalsData.in_progress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-royalPurple-text2">Not Started</span>
                <span className="font-bold text-royalPurple-text2">{goalsData.not_started}</span>
              </div>
              <div className="w-full bg-royalPurple-card2 rounded-full h-2 mt-4">
                <div
                  className="bg-royalPurple-accent h-2 rounded-full transition-all duration-500"
                  style={{ width: `${goalsData.progress_percentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-royalPurple-text2 text-center">
                {goalsData.progress_percentage}% Overall Progress
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-royalPurple-success text-royalPurple-text1">
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
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleMonitorProgress}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Monitor Progress
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleGenerateReports}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Reports
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleScheduleReviews}
              >
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
                <div key={index} className="p-4 border border-royalPurple-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-royalPurple-text1">{goal.title}</h4>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        goal.status === 'On Track'
                          ? 'bg-royalPurple-success text-royalPurple-successTx'
                          : goal.status === 'In Progress'
                            ? 'bg-royalPurple-accentBg text-royalPurple-accentTx'
                            : 'bg-royalPurple-accent text-royalPurple-accentTx'
                      }`}
                    >
                      {goal.status}
                    </span>
                  </div>
                  <p className="text-sm text-royalPurple-text2 mb-3">{goal.description}</p>
                  <div className="w-full bg-royalPurple-card2 rounded-full h-2">
                    <div
                      className="bg-royalPurple-accent h-2 rounded-full transition-all duration-500"
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-royalPurple-text2 mt-1">
                    <span>Progress: {goal.progress}%</span>
                    <span>Due: {goal.due_date}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-royalPurple-text3">
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
            <Target className="h-8 w-8 text-royalPurple-accentTx mx-auto mb-2" />
            <h4 className="font-medium text-royalPurple-text1">Goal Completion Rate</h4>
            <p className="text-2xl font-bold text-royalPurple-accentTx">
              {goalsData.completion_rate || 0}%
            </p>
            <p className="text-sm text-royalPurple-text2">
              {goalsData.completion_rate >= 70 ? 'Above target of 70%' : 'Below target of 70%'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-royalPurple-successTx mx-auto mb-2" />
            <h4 className="font-medium text-royalPurple-text1">On-Time Delivery</h4>
            <p className="text-2xl font-bold text-royalPurple-successTx">
              {goalsData.on_time_delivery || 0}%
            </p>
            <p className="text-sm text-royalPurple-text2">Goals completed on schedule</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="h-8 w-8 text-royalPurple-pillTx mx-auto mb-2" />
            <h4 className="font-medium text-royalPurple-text1">Impact Score</h4>
            <p className="text-2xl font-bold text-royalPurple-pillTx">
              {goalsData.impact_score || 0}/5
            </p>
            <p className="text-sm text-royalPurple-text2">Stakeholder satisfaction</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
