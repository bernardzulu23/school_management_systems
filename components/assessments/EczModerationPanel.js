'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { Check, X } from 'lucide-react'

export function EczModerationPanel() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ecz/moderation?status=PENDING', { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setTasks(Array.isArray(json.data) ? json.data : [])
    } catch (e) {
      toast.error(e.message || 'Could not load moderation queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const moderate = async (assessmentId, moderationStatus) => {
    try {
      const res = await fetch('/api/ecz/moderation', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, moderationStatus }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      toast.success(moderationStatus === 'APPROVED' ? 'Task approved' : 'Task rejected')
      load()
    } catch (e) {
      toast.error(e.message || 'Moderation failed')
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading moderation queue…</p>

  if (!tasks.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No SBA tasks pending moderation. Teachers&apos; new tasks appear here for headteacher QA
        before export.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {tasks.map((t) => (
        <li
          key={t.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-royalPurple-border p-4"
        >
          <div>
            <p className="font-medium">{t.title}</p>
            <p className="text-sm text-muted-foreground">
              {t.subject?.name} · Form {t.formLevel} · {t.type} · by {t.creator?.name || 'Staff'}
            </p>
            {t.context && <p className="text-xs mt-2 line-clamp-2">{t.context}</p>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => moderate(t.id, 'APPROVED')}>
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => moderate(t.id, 'REJECTED')}>
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
