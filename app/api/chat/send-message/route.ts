import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { withAILimits } from '@/lib/middleware/withAILimits'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { requireChatAuth, getOrCreateSession, assertSessionRole } from '@/lib/ai/chat/session'
import { enforceChatRateLimit } from '@/lib/ai/chat/enforce-rate-limit'
import { buildScopedContext } from '@/lib/ai/chat/scoped-context'
import {
  buildChatSystemPrompt,
  HUMAN_HANDOFF_REPLY,
  wantsHumanHandoff,
} from '@/lib/ai/chat/system-prompt'
import { requestHumanHandoff } from '@/lib/ai/chat/handoff'
import { createChatSseStream, AI_SSE_HEADERS } from '@/lib/ai/chat/llm'
import { handleHeadteacherQuery } from '@/lib/ai/chat/headteacher-handler'
import { secureJson } from '@/lib/security/api'
import { aiChain } from '@/lib/ai/provider-fallback'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  message: z.string().min(1).max(8000),
  sessionId: z.string().uuid().optional().nullable(),
})

/**
 * POST /api/chat/send-message
 *
 * SSE contract (Teacher/HOD generative path):
 *   data: {"sessionId":"...","meta":true}
 *   data: {"text":"<chunk>"}
 *   data: {"generatedBy":"...","model":"..."}   (optional)
 *   data: [DONE]
 *
 * Headteacher path returns JSON (retrieval-only), not SSE.
 */
export const POST = withAILimits(
  withErrorHandler(async function POST(request: Request) {
    const auth = await requireChatAuth(request)
    if (!auth.ok) return auth.response

    const rl = await enforceChatRateLimit(request, auth.chatRole, String(auth.user.id))
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

    const message = parsed.data.message.trim()
    const session = await getOrCreateSession({
      schoolId: auth.schoolId,
      userId: String(auth.user.id),
      chatRole: auth.chatRole,
      sessionId: parsed.data.sessionId,
      title: message.slice(0, 80),
    })

    const mismatch = await assertSessionRole(request, session, auth.chatRole)
    if (mismatch) return mismatch

    // —— Phase 1b: Headteacher retrieval-only ——
    if (auth.chatRole === 'HEADTEACHER' || session.openedAsRole === 'HEADTEACHER') {
      const result = await handleHeadteacherQuery({
        schoolId: auth.schoolId,
        userId: String(auth.user.id),
        question: message,
        session,
      })

      if (result.refused) {
        return NextResponse.json({
          mode: 'headteacher_retrieval',
          refused: true,
          message: result.message,
          sessionId: session.id,
        })
      }

      return NextResponse.json({
        mode: 'headteacher_retrieval',
        refused: false,
        sessionId: session.id,
        kind: result.kind,
        label: result.label,
        data: result.data,
        summary: result.summary,
        provider: result.provider,
        model: result.model,
      })
    }

    const db = getTenantClient(auth.schoolId)

    // Block generative AI once handoff has started (human path uses /api/chat/human-message)
    if (session.status === 'PENDING_HUMAN' || session.status === 'HUMAN_ACTIVE') {
      return secureJson(
        {
          error:
            session.status === 'PENDING_HUMAN'
              ? 'Waiting for an administrator. Use Request human or wait for claim.'
              : 'A human administrator is handling this session.',
          code: 'HANDOFF_ACTIVE',
          status: session.status,
          sessionId: session.id,
        },
        { status: 409 },
        request
      )
    }

    // RULE 5 — PENDING_HUMAN + metadata-only Telegram (Phase 2)
    // PILOT STAGE: escalations route to platform admin. Once past single-school
    // pilot, change escalation target to same-tenant Headteacher/HOD — see
    // ZSMS_chatbot_architecture_review.md. This routing choice should not become
    // permanent by default.
    if (wantsHumanHandoff(message)) {
      await db.chatMessage.create({
        data: {
          sessionId: session.id,
          userId: String(auth.user.id),
          sender: 'USER',
          content: message,
        },
      })
      await db.chatMessage.create({
        data: {
          sessionId: session.id,
          userId: String(auth.user.id),
          sender: 'ASSISTANT',
          content: HUMAN_HANDOFF_REPLY,
          contextSources: { handoff: true },
        },
      })
      const handoff = await requestHumanHandoff({
        schoolId: auth.schoolId,
        session,
        role: auth.chatRole,
        tenantName: auth.schoolName,
        userId: String(auth.user.id),
        persistSystemReply: false,
      })

      const encoder = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                sessionId: handoff.session.id,
                status: 'PENDING_HUMAN',
                telegramSent: handoff.telegramSent,
                meta: true,
              })}\n\n`
            )
          )
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: HUMAN_HANDOFF_REPLY })}\n\n`)
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })
      return new Response(stream, { headers: AI_SSE_HEADERS })
    }

    if (!aiChain.isConfigured()) {
      return secureJson({ error: 'AI service not configured' }, { status: 503 }, request)
    }

    const scoped = await buildScopedContext({
      tenantId: auth.schoolId,
      userId: String(auth.user.id),
      role: auth.chatRole,
      query: message,
      schoolPlan: auth.schoolPlan,
      schoolName: auth.schoolName,
    })

    const system = buildChatSystemPrompt({
      tenantName: auth.schoolName,
      tenantId: auth.schoolId,
      userRole: auth.chatRole,
      userId: String(auth.user.id),
      scopedContext: scoped.text,
    })

    await db.chatMessage.create({
      data: {
        sessionId: session.id,
        userId: String(auth.user.id),
        sender: 'USER',
        content: message,
      },
    })

    // Prior turns (bounded) for continuity
    const history = await db.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { sender: true, content: true },
    })
    const historyBlock = history
      .map((m) => {
        const who = m.sender === 'USER' ? 'User' : m.sender === 'ASSISTANT' ? 'Assistant' : m.sender
        return `${who}: ${m.content}`
      })
      .join('\n')

    const prompt = `${historyBlock}\nUser: ${message}\nAssistant:`

    const stream = createChatSseStream({
      system,
      prompt,
      meta: {
        sessionId: session.id,
        sources: scoped.sources,
        meta: true,
      },
      onComplete: async (fullText) => {
        const text = String(fullText || '').trim()
        if (!text) return
        await db.chatMessage.create({
          data: {
            sessionId: session.id,
            userId: String(auth.user.id),
            sender: 'ASSISTANT',
            content: text,
            contextSources: { sources: scoped.sources },
          },
        })
        await db.chatSession.update({
          where: { id: session.id },
          data: { updatedAt: new Date() },
        })
      },
    })

    return new Response(stream, { headers: AI_SSE_HEADERS })
  })
)
