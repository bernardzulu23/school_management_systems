'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import ChatPanel from '@/components/chat/ChatPanel'
import TeacherLessonPlanDashboard from '@/components/chat/TeacherLessonPlanDashboard'
import { FeatureGate } from '@/components/FeatureGate'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const RESUBMIT_PROMPT = "Rewrite the evaluation section based on the HOD's comment"

function TeacherChatInner() {
  const searchParams = useSearchParams()
  const resubmitId = searchParams.get('resubmit')
  const sessionIdParam = searchParams.get('sessionId')
  const hodCommentParam = searchParams.get('hodComment')

  const [fetched, setFetched] = useState(null)

  useEffect(() => {
    if (!resubmitId) {
      setFetched(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/teacher/lesson-plans/submissions?status=REJECTED', {
          credentials: 'include',
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || cancelled) return
        const row = (data.submissions || []).find((s) => s.id === resubmitId)
        if (row) setFetched(row)
      } catch {
        // fall back to query params
      }
    })()
    return () => {
      cancelled = true
    }
  }, [resubmitId])

  const resubmitCtx = useMemo(() => {
    if (!resubmitId && !sessionIdParam) return null
    return {
      sessionId: fetched?.sessionId || sessionIdParam || null,
      hodComment: fetched?.hodComments || hodCommentParam || null,
      suggestedPrompt: RESUBMIT_PROMPT,
    }
  }, [resubmitId, sessionIdParam, hodCommentParam, fetched])

  return (
    <>
      <TeacherLessonPlanDashboard />
      <ChatPanel
        key={resubmitCtx?.sessionId || 'new-chat'}
        mode="generative"
        initialSessionId={resubmitCtx?.sessionId || null}
        pinnedHodComment={resubmitCtx?.hodComment || null}
        suggestedPrompt={resubmitCtx?.suggestedPrompt || null}
      />
    </>
  )
}

export default function TeacherChatPage() {
  return (
    <DashboardLayout title="AI Assistant">
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/teacher">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        {/* Plan gate: reuse ai-tools (Standard/Premium), same bucket as other staff AI tools */}
        <FeatureGate featureId="ai-tools">
          <Suspense fallback={<p className="text-sm text-muted">Loading assistant…</p>}>
            <TeacherChatInner />
          </Suspense>
        </FeatureGate>
      </div>
    </DashboardLayout>
  )
}
