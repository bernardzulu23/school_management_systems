'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { useHodApi } from '@/lib/hod/useHodApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Users,
  ArrowLeft,
  Download,
  Play,
  Pause,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { EmptyModuleState } from '@/components/dashboard/EmptyModuleState'
import { HodAddRoutineTaskDialog } from '@/components/hod/HodAddRoutineTaskDialog'
import { HodFileUpload } from '@/components/hod/HodFileUpload'

export default function DailyRoutinePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('today')
  const [updatingId, setUpdatingId] = useState(null)
  const { data, loading, error, reload } = useHodApi(
    `/api/hod/daily-routine?date=${selectedDate}`,
    [selectedDate]
  )
  const routineData = data ?? { today: [], weekly: [] }

  const patchTask = async (id, body) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/hod/daily-routine/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Update failed')
      toast.success('Task updated')
      await reload()
    } catch (e) {
      toast.error(e.message || 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-royalPurple-successTx" />
      case 'in-progress':
        return <Play className="h-4 w-4 text-royalPurple-accentTx" />
      case 'pending':
        return <Clock className="h-4 w-4 text-warn/100" />
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-royalPurple-dangerTx" />
      default:
        return <Clock className="h-4 w-4 text-royalPurple-text3" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      case 'in-progress':
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
      case 'pending':
        return 'bg-warn/20 text-g-800'
      case 'overdue':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx border-royalPurple-border'
      case 'medium':
        return 'bg-warn/20 text-g-800 border-warn/40'
      case 'low':
        return 'bg-royalPurple-success text-royalPurple-successTx border-royalPurple-border'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1 border-royalPurple-border'
    }
  }

  const filteredToday =
    filterStatus === 'all'
      ? routineData.today
      : routineData.today.filter((t) => t.status === filterStatus)

  const routineStats = {
    totalTasks: routineData.today.length,
    completedTasks: routineData.today.filter((task) => task.status === 'completed').length,
    inProgressTasks: routineData.today.filter((task) => task.status === 'in-progress').length,
    pendingTasks: routineData.today.filter((task) => task.status === 'pending').length,
  }

  const completionRate =
    routineStats.totalTasks > 0
      ? Math.round((routineStats.completedTasks / routineStats.totalTasks) * 100)
      : 0

  const hasRoutine = routineData.today.length > 0 || routineData.weekly.length > 0

  const exportSchedule = () => {
    const rows = [
      ['Time', 'Task', 'Priority', 'Status', 'Assigned To', 'Category'],
      ...routineData.today.map((t) => [
        t.time || '',
        t.task || '',
        t.priority || '',
        t.status || '',
        t.assignedTo || '',
        t.category || '',
      ]),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hod-routine-${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout title="Daily Routine">
      <div className="space-y-6">
        {loading && <p className="text-sm text-royalPurple-text3">Loading routine…</p>}
        {error && <p className="text-sm text-royalPurple-dangerTx">{error}</p>}
        {!loading && !hasRoutine && (
          <EmptyModuleState
            title="No daily routine tasks"
            description="Add today’s tasks and weekly overview when your department routine is configured."
          />
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/hod">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center">
                <Clock className="h-6 w-6 mr-2" />
                Daily Routine Management
              </h1>
              <p className="text-royalPurple-text2">
                Day-to-day operational tasks and responsibilities
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500"
            />
            <Button variant="outline" onClick={exportSchedule}>
              <Download className="h-4 w-4 mr-2" />
              Export Schedule
            </Button>
            <HodAddRoutineTaskDialog defaultDate={selectedDate} onCreated={reload} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-royalPurple-accentTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Tasks</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {routineStats.totalTasks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-royalPurple-successTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Completed</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {routineStats.completedTasks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Play className="h-8 w-8 text-royalPurple-accentTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">In Progress</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {routineStats.inProgressTasks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-warn" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Pending</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {routineStats.pendingTasks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-royalPurple-pillTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Completion Rate</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">{completionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Daily Progress</h3>
              <span className="text-sm text-royalPurple-text2">
                {new Date(selectedDate).toLocaleDateString()}
              </span>
            </div>
            <div className="w-full bg-royalPurple-card2 rounded-full h-4">
              <div
                className="bg-royalPurple-success h-4 rounded-full transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-royalPurple-text2 mt-2">
              <span>
                {routineStats.completedTasks} of {routineStats.totalTasks} tasks completed
              </span>
              <span>{completionRate}% complete</span>
            </div>
          </CardContent>
        </Card>

        <div className="border-b border-royalPurple-border">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('today')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'today'
                  ? 'border-royalPurple-border2 text-royalPurple-accentTx'
                  : 'border-transparent text-royalPurple-text3 hover:text-royalPurple-text2 hover:border-royalPurple-border'
              }`}
            >
              Today's Tasks
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'weekly'
                  ? 'border-royalPurple-border2 text-royalPurple-accentTx'
                  : 'border-transparent text-royalPurple-text3 hover:text-royalPurple-text2 hover:border-royalPurple-border'
              }`}
            >
              Weekly Overview
            </button>
          </nav>
        </div>

        {activeTab === 'today' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today's Tasks</CardTitle>
                <select
                  className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredToday.length === 0 ? (
                  <p className="text-sm text-royalPurple-text3 py-4 text-center">
                    No tasks match this filter.
                  </p>
                ) : null}
                {filteredToday.map((task) => (
                  <div
                    key={task.id}
                    className="border border-royalPurple-border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2 flex-wrap gap-2">
                          <span className="text-sm font-medium text-royalPurple-accentTx">
                            {task.time}
                          </span>
                          <h3 className="text-lg font-semibold text-royalPurple-text1">
                            {task.task}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded border ${getPriorityColor(task.priority)}`}
                          >
                            {task.priority} priority
                          </span>
                        </div>
                        <p className="text-royalPurple-text2 mb-3">{task.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-royalPurple-text3 flex-wrap">
                          <span>Duration: {task.duration || '—'}</span>
                          <span>Assigned to: {task.assignedTo || '—'}</span>
                          <span className="badge-brand">{task.category || 'General'}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center mr-2">
                          {getStatusIcon(task.status)}
                          <span
                            className={`ml-2 px-2 py-1 text-xs rounded ${getStatusColor(task.status)}`}
                          >
                            {task.status}
                          </span>
                        </div>
                        {task.status !== 'completed' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === task.id}
                            onClick={() =>
                              patchTask(task.id, {
                                status: task.status === 'pending' ? 'in-progress' : 'completed',
                              })
                            }
                            title={task.status === 'pending' ? 'Start task' : 'Mark complete'}
                          >
                            {task.status === 'pending' ? (
                              <Play className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === task.id}
                            onClick={() => patchTask(task.id, { status: 'pending' })}
                            title="Reopen task"
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <HodFileUpload
                      entityType="daily_routine"
                      entityId={task.id}
                      defaultLabel="schedule"
                      compact
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'weekly' && (
          <Card>
            <CardHeader>
              <CardTitle>Weekly Routine Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {routineData.weekly.length === 0 ? (
                <p className="text-sm text-royalPurple-text3 text-center py-6">
                  Weekly plans appear after they are saved for this department.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {routineData.weekly.map((day, index) => (
                    <div key={index} className="border border-royalPurple-border rounded-lg p-4">
                      <h3 className="font-semibold text-royalPurple-text1 mb-2">{day.day}</h3>
                      <p className="text-sm text-royalPurple-accentTx mb-3 font-medium">
                        {day.focus}
                      </p>
                      <div className="space-y-2">
                        {(day.tasks || []).map((task, taskIndex) => (
                          <div
                            key={taskIndex}
                            className="text-sm text-royalPurple-text2 p-2 bg-royalPurple-page rounded"
                          >
                            {task}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <HodAddRoutineTaskDialog defaultDate={selectedDate} onCreated={reload} />
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setActiveTab('weekly')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Weekly Schedule
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={exportSchedule}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Daily Report
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Priorities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {routineData.today.filter((task) => task.priority === 'high').length === 0 ? (
                  <p className="text-sm text-royalPurple-text3 text-center py-4">
                    No high-priority tasks for this day.
                  </p>
                ) : null}
                {routineData.today
                  .filter((task) => task.priority === 'high')
                  .map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-royalPurple-danger border border-royalPurple-border rounded-lg"
                    >
                      <h4 className="font-medium text-royalPurple-dangerTx">{task.task}</h4>
                      <p className="text-sm text-royalPurple-dangerTx">
                        {task.time} - {task.duration || '—'}
                      </p>
                      <div className="flex items-center mt-2 justify-between gap-2">
                        <div className="flex items-center">
                          {getStatusIcon(task.status)}
                          <span
                            className={`ml-2 px-2 py-1 text-xs rounded ${getStatusColor(task.status)}`}
                          >
                            {task.status}
                          </span>
                        </div>
                        {task.status !== 'completed' ? (
                          <Button
                            size="sm"
                            disabled={updatingId === task.id}
                            onClick={() => patchTask(task.id, { status: 'completed' })}
                          >
                            Complete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
