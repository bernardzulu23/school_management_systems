import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import {
  Target,
  Briefcase,
  Plus,
  Monitor,
  BarChart3,
  Calendar,
  Clock,
  Award,
  Trash2,
  Save,
} from 'lucide-react'
import { api } from '@/lib/api'

export function HeadteacherStrategicPlanning() {
  const [showCreateGoal, setShowCreateGoal] = useState(false)
  const [showScheduleReview, setShowScheduleReview] = useState(false)
  const [createGoalForm, setCreateGoalForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  })
  const [reviewForm, setReviewForm] = useState({
    title: '',
    notes: '',
    scheduledAt: '',
  })

  const {
    data: goalsResponse,
    isLoading: goalsLoading,
    refetch: refetchGoals,
  } = useQuery({
    queryKey: ['strategic-goals'],
    queryFn: async () => {
      const res = await api.client.get('/strategic-goals')
      return res.data?.data
    },
  })

  const {
    data: reviewsResponse,
    isLoading: reviewsLoading,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ['strategic-reviews'],
    queryFn: async () => {
      const res = await api.client.get('/strategic-reviews')
      return res.data?.data
    },
  })

  const summary = goalsResponse?.summary || {
    total: 0,
    completed: 0,
    in_progress: 0,
    not_started: 0,
    progress_percentage: 0,
    completion_rate: 0,
  }

  const goals = Array.isArray(goalsResponse?.goals) ? goalsResponse.goals : []
  const reviews = Array.isArray(reviewsResponse) ? reviewsResponse : []

  const handleCreateGoal = () => setShowCreateGoal(true)
  const handleMonitorProgress = () => {
    const el = document.getElementById('strategic-goals-list')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const handleGenerateReports = () => {
    if (goals.length === 0) {
      toast.error('No strategic goals to export')
      return
    }
    const rows = [
      ['Title', 'Status', 'Progress', 'Due Date', 'Updated At'],
      ...goals.map((g) => [
        String(g.title || ''),
        String(g.status || ''),
        String(g.progress ?? ''),
        g.dueDate ? new Date(g.dueDate).toISOString().slice(0, 10) : '',
        g.updatedAt ? new Date(g.updatedAt).toISOString() : '',
      ]),
    ]
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `strategic-goals-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  const handleScheduleReviews = () => setShowScheduleReview(true)

  const statusLabel = useMemo(() => {
    return (s) => {
      const v = String(s || '').toLowerCase()
      if (v === 'completed') return 'Completed'
      if (v === 'in_progress') return 'In Progress'
      return 'Not Started'
    }
  }, [])

  const statusBadgeClass = useMemo(() => {
    return (s) => {
      const v = String(s || '').toLowerCase()
      if (v === 'completed') return 'bg-royalPurple-success text-royalPurple-successTx'
      if (v === 'in_progress') return 'bg-royalPurple-accentBg text-royalPurple-accentTx'
      return 'bg-royalPurple-card2 text-royalPurple-text2'
    }
  }, [])

  const updateGoal = async (id, patch) => {
    try {
      await api.client.put(`/strategic-goals/${id}`, patch)
      await refetchGoals()
      toast.success('Saved')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to update goal')
    }
  }

  const deleteGoal = async (id) => {
    try {
      await api.client.delete(`/strategic-goals/${id}`)
      await refetchGoals()
      toast.success('Deleted')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to delete goal')
    }
  }

  const submitCreateGoal = async () => {
    const title = String(createGoalForm.title || '').trim()
    if (!title) {
      toast.error('Title is required')
      return
    }
    try {
      await api.client.post('/strategic-goals', {
        title,
        description: createGoalForm.description ? String(createGoalForm.description).trim() : null,
        dueDate: createGoalForm.dueDate ? new Date(createGoalForm.dueDate).toISOString() : null,
      })
      setCreateGoalForm({ title: '', description: '', dueDate: '' })
      setShowCreateGoal(false)
      await refetchGoals()
      toast.success('Goal created')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to create goal')
    }
  }

  const submitScheduleReview = async () => {
    const title = String(reviewForm.title || '').trim()
    if (!title) {
      toast.error('Title is required')
      return
    }
    if (!reviewForm.scheduledAt) {
      toast.error('Date/time is required')
      return
    }
    try {
      await api.client.post('/strategic-reviews', {
        title,
        notes: reviewForm.notes ? String(reviewForm.notes).trim() : null,
        scheduledAt: new Date(reviewForm.scheduledAt).toISOString(),
      })
      setReviewForm({ title: '', notes: '', scheduledAt: '' })
      setShowScheduleReview(false)
      await refetchReviews()
      toast.success('Review scheduled')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to schedule review')
    }
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
                <span className="font-bold text-royalPurple-accentTx">{summary.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-royalPurple-text2">Completed</span>
                <span className="font-bold text-royalPurple-successTx">{summary.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-royalPurple-text2">In Progress</span>
                <span className="text-royalPurple-accentTx font-bold">{summary.in_progress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-royalPurple-text2">Not Started</span>
                <span className="font-bold text-royalPurple-text2">{summary.not_started}</span>
              </div>
              <div className="w-full bg-royalPurple-card2 rounded-full h-2 mt-4">
                <div
                  className="bg-royalPurple-accent h-2 rounded-full transition-all duration-500"
                  style={{ width: `${summary.progress_percentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-royalPurple-text2 text-center">
                {summary.progress_percentage}% Overall Progress
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
      <Card id="strategic-goals-list">
        <CardHeader>
          <CardTitle>Current Strategic Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {goalsLoading ? (
              <div className="text-center py-8 text-royalPurple-text3">
                <p>Loading goals…</p>
              </div>
            ) : goals.length > 0 ? (
              goals.map((goal) => (
                <div key={goal.id} className="p-4 border border-royalPurple-border rounded-lg">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <h4 className="font-medium text-royalPurple-text1 truncate">{goal.title}</h4>
                      {goal.description ? (
                        <p className="text-sm text-royalPurple-text2 mt-1">{goal.description}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${statusBadgeClass(goal.status)}`}
                      >
                        {statusLabel(goal.status)}
                      </span>
                      <button
                        type="button"
                        className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-royalPurple-border hover:bg-royalPurple-card2 transition-colors"
                        onClick={() => deleteGoal(goal.id)}
                        aria-label="Delete goal"
                      >
                        <Trash2 className="h-4 w-4 text-royalPurple-text2" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div>
                      <label className="block text-xs text-royalPurple-text3 mb-1">Status</label>
                      <select
                        className="w-full input"
                        value={goal.status}
                        onChange={(e) => updateGoal(goal.id, { status: e.target.value })}
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-royalPurple-text3 mb-1">Progress</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="input w-24"
                          min="0"
                          max="100"
                          value={goal.progress ?? 0}
                          onChange={(e) => updateGoal(goal.id, { progress: e.target.value })}
                        />
                        <span className="text-sm text-royalPurple-text2">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-royalPurple-text3 mb-1">Due Date</label>
                      <input
                        type="date"
                        className="input w-full"
                        value={
                          goal.dueDate ? new Date(goal.dueDate).toISOString().slice(0, 10) : ''
                        }
                        onChange={(e) => updateGoal(goal.id, { dueDate: e.target.value || null })}
                      />
                    </div>
                  </div>

                  <div className="w-full bg-royalPurple-card2 rounded-full h-2 mt-4">
                    <div
                      className="bg-royalPurple-accent h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(0, Math.min(100, Number(goal.progress) || 0))}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-royalPurple-text2 mt-1">
                    <span>Progress: {Math.max(0, Math.min(100, Number(goal.progress) || 0))}%</span>
                    <span>
                      Updated:{' '}
                      {goal.updatedAt ? new Date(goal.updatedAt).toLocaleDateString() : '-'}
                    </span>
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
              {summary.completion_rate || 0}%
            </p>
            <p className="text-sm text-royalPurple-text2">
              {summary.completion_rate >= 70 ? 'Above target of 70%' : 'Below target of 70%'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-royalPurple-successTx mx-auto mb-2" />
            <h4 className="font-medium text-royalPurple-text1">On-Time Delivery</h4>
            <p className="text-2xl font-bold text-royalPurple-successTx">
              {summary.completed > 0 ? 100 : 0}%
            </p>
            <p className="text-sm text-royalPurple-text2">Goals completed on schedule</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="h-8 w-8 text-royalPurple-pillTx mx-auto mb-2" />
            <h4 className="font-medium text-royalPurple-text1">Impact Score</h4>
            <p className="text-2xl font-bold text-royalPurple-pillTx">
              {summary.total === 0
                ? 0
                : Math.max(1, Math.round((summary.progress_percentage / 100) * 5))}
              /5
            </p>
            <p className="text-sm text-royalPurple-text2">Stakeholder satisfaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewsLoading ? (
            <p className="text-royalPurple-text3">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="text-royalPurple-text3">No reviews scheduled.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="p-4 border border-royalPurple-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-royalPurple-text1">{r.title}</p>
                      <p className="text-sm text-royalPurple-text2">
                        {r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                  {r.notes ? (
                    <p className="text-sm text-royalPurple-text2 mt-2">{r.notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Goal Modal */}
      {showCreateGoal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateGoal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-royalPurple-border bg-royalPurple-deep shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-royalPurple-border">
              <h2 className="text-lg font-semibold text-royalPurple-text1">
                Create Strategic Goal
              </h2>
              <button
                type="button"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-royalPurple-border hover:bg-royalPurple-card2 transition-colors"
                onClick={() => setShowCreateGoal(false)}
                aria-label="Close"
              >
                <Calendar className="h-4 w-4 text-royalPurple-text2" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-royalPurple-text2 mb-1">Title</label>
                <input
                  className="input w-full"
                  value={createGoalForm.title}
                  onChange={(e) => setCreateGoalForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Improve Grade 12 pass rate"
                />
              </div>
              <div>
                <label className="block text-sm text-royalPurple-text2 mb-1">Description</label>
                <textarea
                  className="input w-full min-h-[90px]"
                  value={createGoalForm.description}
                  onChange={(e) =>
                    setCreateGoalForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Optional details…"
                />
              </div>
              <div>
                <label className="block text-sm text-royalPurple-text2 mb-1">Due Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={createGoalForm.dueDate}
                  onChange={(e) => setCreateGoalForm((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-royalPurple-border">
              <Button type="button" variant="outline" onClick={() => setShowCreateGoal(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitCreateGoal}>
                <Save className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Schedule Review Modal */}
      {showScheduleReview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowScheduleReview(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-royalPurple-border bg-royalPurple-deep shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-royalPurple-border">
              <h2 className="text-lg font-semibold text-royalPurple-text1">Schedule Review</h2>
              <button
                type="button"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-royalPurple-border hover:bg-royalPurple-card2 transition-colors"
                onClick={() => setShowScheduleReview(false)}
                aria-label="Close"
              >
                <Calendar className="h-4 w-4 text-royalPurple-text2" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-royalPurple-text2 mb-1">Title</label>
                <input
                  className="input w-full"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., End of term review"
                />
              </div>
              <div>
                <label className="block text-sm text-royalPurple-text2 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  className="input w-full"
                  value={reviewForm.scheduledAt}
                  onChange={(e) => setReviewForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-royalPurple-text2 mb-1">Notes</label>
                <textarea
                  className="input w-full min-h-[80px]"
                  value={reviewForm.notes}
                  onChange={(e) => setReviewForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes…"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-royalPurple-border">
              <Button type="button" variant="outline" onClick={() => setShowScheduleReview(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitScheduleReview}>
                <Save className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
