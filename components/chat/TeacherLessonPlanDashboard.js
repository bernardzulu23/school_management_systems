'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { MessageSquarePlus, Loader2 } from 'lucide-react'
import LessonPlanStatsCards from '@/components/chat/LessonPlanStatsCards'

const RESUBMIT_PROMPT = "Rewrite the evaluation section based on the HOD's comment"

/**
 * Teacher dashboard block: stats cards + rejected list with one-click resubmit.
 */
export default function TeacherLessonPlanDashboard({ compact = false }) {
  const router = useRouter()
  const [counts, setCounts] = useState({})
  const [readiness, setReadiness] = useState(null)
  const [rejected, setRejected] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, listRes] = await Promise.all([
        fetch('/api/teacher/lesson-plans/stats', { credentials: 'include' }),
        fetch('/api/teacher/lesson-plans/submissions?status=REJECTED', {
          credentials: 'include',
        }),
      ])
      const stats = await statsRes.json().catch(() => ({}))
      const list = await listRes.json().catch(() => ({}))
      if (!statsRes.ok) throw new Error(stats.error || 'Failed to load stats')
      setCounts(stats.counts || {})
      setReadiness(stats.readiness || null)
      if (listRes.ok) {
        setRejected(Array.isArray(list.submissions) ? list.submissions : [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openResubmit = (row) => {
    if (!row?.sessionId) {
      setError('This rejection has no linked chat session — generate a new plan from AI Assistant.')
      return
    }
    const params = new URLSearchParams({
      resubmit: row.id,
      sessionId: row.sessionId,
    })
    router.push(`/dashboard/teacher/chat?${params.toString()}`)
  }

  return (
    <div className={`space-y-3 ${compact ? '' : 'mb-4'}`}>
      <LessonPlanStatsCards counts={counts} readiness={readiness} loading={loading} />
      {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{error}</div>}

      {!compact && rejected.length > 0 && (
        <div className="border border-ink/10 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-semibold text-ink">Rejected — revise &amp; resubmit</h4>
          <ul className="space-y-2">
            {rejected.map((r) => (
              <li
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between text-sm"
              >
                <div>
                  <div className="font-medium">
                    {r.subject} • {r.grade} • {r.topic}
                  </div>
                  {r.hodComments && (
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">HOD: {r.hodComments}</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!r.sessionId}
                  onClick={() => openResubmit(r)}
                  title={
                    r.sessionId
                      ? `Opens chat with suggested prompt: ${RESUBMIT_PROMPT}`
                      : 'No linked chat session'
                  }
                >
                  <MessageSquarePlus className="h-3.5 w-3.5 mr-1" />
                  Revise in chat
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted">
            Opens the original chat with the HOD comment pinned and a suggested rewrite prompt
            pre-filled — nothing is sent until you confirm.
          </p>
        </div>
      )}

      {loading && rejected.length === 0 && !error && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing submissions…
        </div>
      )}
    </div>
  )
}

export { RESUBMIT_PROMPT }
