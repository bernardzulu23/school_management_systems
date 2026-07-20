import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { withAILimits } from '@/lib/middleware/withAILimits'
import { requireChatAuth, getOrCreateSession, assertSessionRole } from '@/lib/ai/chat/session'
import { enforceChatRateLimit } from '@/lib/ai/chat/enforce-rate-limit'
import { handleHeadteacherQuery } from '@/lib/ai/chat/headteacher-handler'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  question: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
})

/**
 * POST /api/chat/headteacher-query
 * Retrieval-only analytics — NOT generative free-form chat.
 */
export const POST = withAILimits(
  withErrorHandler(async function POST(request: Request) {
    const auth = await requireChatAuth(request)
    if (!auth.ok) return auth.response

    if (auth.chatRole !== 'HEADTEACHER') {
      return secureJson(
        { error: 'Headteacher access only', code: 'CHAT_HEADTEACHER_ONLY' },
        { status: 403 },
        request
      )
    }

    const rl = await enforceChatRateLimit(request, 'HEADTEACHER', String(auth.user.id))
    if (rl.limited) return rl.response

    const raw = await request.json().catch(() => null)
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return secureJson(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 },
        request
      )
    }

    const session = await getOrCreateSession({
      schoolId: auth.schoolId,
      userId: String(auth.user.id),
      chatRole: 'HEADTEACHER',
      sessionId: parsed.data.sessionId,
      title: parsed.data.question.slice(0, 80),
    })

    const mismatch = await assertSessionRole(request, session, 'HEADTEACHER')
    if (mismatch) return mismatch

    const result = await handleHeadteacherQuery({
      schoolId: auth.schoolId,
      userId: String(auth.user.id),
      question: parsed.data.question,
      session,
    })

    if (result.refused) {
      return NextResponse.json({
        refused: true,
        message: result.message,
        sessionId: session.id,
      })
    }

    return NextResponse.json({
      refused: false,
      sessionId: session.id,
      kind: result.kind,
      label: result.label,
      data: result.data,
      summary: result.summary,
      provider: result.provider,
      model: result.model,
    })
  })
)
