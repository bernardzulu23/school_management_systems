'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, RefreshCw, TrendingDown, TrendingUp, Users } from 'lucide-react'

export function PublishedAssessmentAttemptsPanel({ assessmentId, publishedAssignmentId }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    if (!assessmentId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/attempts`, {
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load attempts')
      setData(json.data || null)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [assessmentId])

  useEffect(() => {
    if (publishedAssignmentId) load()
    else setData(null)
  }, [publishedAssignmentId, load])

  if (!publishedAssignmentId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student attempts</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-royalPurple-text2">
          After HOD approval, student attempts and class performance appear here.
        </CardContent>
      </Card>
    )
  }

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-royalPurple-text2">Loading attempts…</CardContent>
      </Card>
    )
  }

  if (!data?.published) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-royalPurple-text2">
          {data?.message || 'No attempt data yet.'}
        </CardContent>
      </Card>
    )
  }

  const stats = data.stats || {}
  const submissions = data.submissions || []
  const notAttempted = data.notAttempted || []
  const needsSupport = data.needsSupport || []

  return (
    <Card id="assessment-attempts">
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-base">Student attempts & performance</CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-royalPurple-accent/30 border border-royalPurple-border">
            <div className="flex items-center gap-2 text-xs text-royalPurple-text2">
              <Users className="h-4 w-4" />
              Attempted
            </div>
            <p className="text-xl font-bold text-royalPurple-text1">
              {stats.attempted}/{stats.classSize}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-royalPurple-card2 border border-royalPurple-border">
            <div className="text-xs text-royalPurple-text2">Not attempted</div>
            <p className="text-xl font-bold text-royalPurple-text1">{stats.notAttempted}</p>
          </div>
          <div className="p-3 rounded-lg bg-royalPurple-success/30 border border-royalPurple-border">
            <div className="flex items-center gap-2 text-xs text-royalPurple-text2">
              <TrendingUp className="h-4 w-4" />
              Class average
            </div>
            <p className="text-xl font-bold text-royalPurple-successTx">
              {stats.averagePercentage}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-royalPurple-danger/20 border border-royalPurple-border">
            <div className="flex items-center gap-2 text-xs text-royalPurple-text2">
              <TrendingDown className="h-4 w-4" />
              Needs support (&lt;65%)
            </div>
            <p className="text-xl font-bold text-royalPurple-dangerTx">{stats.needsSupportCount}</p>
          </div>
        </div>

        {needsSupport.length > 0 ? (
          <div className="p-3 rounded-lg border border-warn/40 bg-warn/10">
            <p className="text-sm font-medium text-royalPurple-text1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warn" />
              Learners who may need extra help
            </p>
            <p className="text-xs text-royalPurple-text2 mt-1">
              {needsSupport.map((s) => `${s.studentName} (${s.percentage}%)`).join(' · ')}
            </p>
          </div>
        ) : null}

        <div>
          <h4 className="font-medium text-royalPurple-text1 mb-2">Who attempted</h4>
          {submissions.length === 0 ? (
            <p className="text-sm text-royalPurple-text2">No submissions yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-royalPurple-border">
              <table className="w-full text-sm">
                <thead className="bg-royalPurple-card2">
                  <tr>
                    <th className="text-left p-2">Student</th>
                    <th className="text-left p-2">Class</th>
                    <th className="text-left p-2">Score</th>
                    <th className="text-left p-2">Submitted</th>
                    <th className="text-left p-2">Feedback</th>
                    <th className="text-left p-2">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} className="border-t border-royalPurple-border">
                      <td className="p-2 font-medium">{s.studentName}</td>
                      <td className="p-2 text-royalPurple-text2">{s.class || '—'}</td>
                      <td className="p-2">
                        <span
                          className={
                            s.needsSupport
                              ? 'text-royalPurple-dangerTx font-semibold'
                              : 'text-royalPurple-successTx font-semibold'
                          }
                        >
                          {s.percentage != null ? `${s.percentage}%` : '—'}
                          {s.score != null && s.totalMarks != null
                            ? ` (${s.score}/${s.totalMarks})`
                            : ''}
                        </span>
                      </td>
                      <td className="p-2 text-royalPurple-text2 text-xs">
                        {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}
                      </td>
                      <td className="p-2 text-royalPurple-text2 text-xs max-w-[200px]">
                        {s.encouragement || '—'}
                      </td>
                      <td className="p-2 text-royalPurple-text2 text-xs">
                        {s.needsReview ? 'Needs review' : 'Auto-graded'}
                        {Array.isArray(s.review) && s.review.length > 0
                          ? ` · ${s.review.filter((r) => !r.isCorrect).length} wrong`
                          : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {notAttempted.length > 0 ? (
          <div>
            <h4 className="font-medium text-royalPurple-text1 mb-2">
              Not attempted yet ({notAttempted.length})
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {notAttempted.map((s) => (
                <li
                  key={s.studentId}
                  className="p-2 rounded border border-royalPurple-border text-royalPurple-text2"
                >
                  {s.name}
                  {s.examNumber ? ` · ${s.examNumber}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
