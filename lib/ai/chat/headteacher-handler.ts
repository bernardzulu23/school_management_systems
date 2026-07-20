/**
 * Shared Phase 1b handler — used by /api/chat/headteacher-query and
 * /api/chat/send-message when openedAsRole is HEADTEACHER.
 */
import { getTenantClient } from '@/lib/prisma/tenantClient'
import {
  HEADTEACHER_REFUSAL,
  executeHeadteacherQuery,
  mapHeadteacherQuestion,
} from '@/lib/ai/chat/headteacher-queries'
import { summarizeComputedData } from '@/lib/ai/chat/llm'
import type { ChatSession } from '@prisma/client'

export type HeadteacherHandleResult =
  | {
      ok: true
      refused: false
      kind: string
      label: string
      data: Record<string, unknown>
      summary: string
      provider: string
      model: string
    }
  | {
      ok: true
      refused: true
      message: string
    }

export async function handleHeadteacherQuery(params: {
  schoolId: string
  userId: string
  question: string
  session?: ChatSession | null
}): Promise<HeadteacherHandleResult> {
  const question = String(params.question || '').trim()
  const match = mapHeadteacherQuestion(question)

  if (!match) {
    if (params.session) {
      const db = getTenantClient(params.schoolId)
      await db.chatMessage.create({
        data: {
          sessionId: params.session.id,
          userId: params.userId,
          sender: 'USER',
          content: question,
        },
      })
      await db.chatMessage.create({
        data: {
          sessionId: params.session.id,
          userId: params.userId,
          sender: 'ASSISTANT',
          content: HEADTEACHER_REFUSAL,
          contextSources: { refused: true },
        },
      })
    }
    return { ok: true, refused: true, message: HEADTEACHER_REFUSAL }
  }

  const computed = await executeHeadteacherQuery(params.schoolId, match)
  const { summary, provider, model } = await summarizeComputedData({
    label: computed.label,
    data: computed.data,
    question,
  })

  if (params.session) {
    const db = getTenantClient(params.schoolId)
    await db.chatMessage.create({
      data: {
        sessionId: params.session.id,
        userId: params.userId,
        sender: 'USER',
        content: question,
      },
    })
    await db.chatMessage.create({
      data: {
        sessionId: params.session.id,
        userId: params.userId,
        sender: 'ASSISTANT',
        content: summary,
        contextSources: {
          kind: computed.kind,
          label: computed.label,
          data: computed.data,
          provider,
          model,
        },
      },
    })
  }

  return {
    ok: true,
    refused: false,
    kind: computed.kind,
    label: computed.label,
    data: computed.data,
    summary,
    provider,
    model,
  }
}
