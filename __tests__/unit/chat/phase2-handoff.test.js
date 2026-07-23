import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildTelegramHandoffPayload,
  buildAdminConsoleSessionUrl,
  isTelegramConfigured,
} from '@/lib/ai/chat/telegram-handoff'
import { signChatWsTicket, verifyChatWsTicket } from '@/lib/ai/chat/ws-ticket'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { isPlatformSession } from '@/lib/middleware/auth'
import {
  isHandoffStatus,
  buildHandoffClientPayload,
  HANDOFF_ADMIN_CLAIM_PATH,
  HANDOFF_CLAIMER_HINT,
} from '@/lib/ai/chat/handoff'
import { wantsHumanHandoff } from '@/lib/ai/chat/system-prompt'

describe('Telegram handoff payload (metadata-only)', () => {
  it('never includes message content fields', () => {
    const secretUserMessage = 'My student failed math and needs counseling about grades'
    const payload = buildTelegramHandoffPayload({
      tenantName: 'Ndake Secondary',
      role: 'TEACHER',
      sessionId: '11111111-1111-4111-8111-111111111111',
      schoolId: 'school-1',
      adminConsoleUrl:
        'https://example.com/platform/support?sessionId=11111111-1111-4111-8111-111111111111',
      // If a caller accidentally passed content, it must still be ignored:
      messageContent: secretUserMessage,
      content: secretUserMessage,
      transcript: secretUserMessage,
    })

    expect(payload.meta).toEqual({
      tenantName: 'Ndake Secondary',
      role: 'TEACHER',
      sessionId: '11111111-1111-4111-8111-111111111111',
      schoolId: 'school-1',
      adminConsoleUrl:
        'https://example.com/platform/support?sessionId=11111111-1111-4111-8111-111111111111',
    })

    const allowedKeys = ['tenantName', 'role', 'sessionId', 'schoolId', 'adminConsoleUrl']
    expect(Object.keys(payload.meta).sort()).toEqual(allowedKeys.sort())
    expect(payload.text).not.toContain(secretUserMessage)
    expect(payload.text).not.toContain('counseling')
    expect(payload.text).toContain('Ndake Secondary')
    expect(payload.text).toContain('TEACHER')
    expect(JSON.stringify(payload)).not.toContain(secretUserMessage)
  })

  it('builds admin console deep link', () => {
    const prev = process.env.NEXT_PUBLIC_APP_ORIGIN
    process.env.NEXT_PUBLIC_APP_ORIGIN = 'https://app.example.com/'
    expect(buildAdminConsoleSessionUrl('abc')).toBe(
      'https://app.example.com/platform/support?sessionId=abc'
    )
    process.env.NEXT_PUBLIC_APP_ORIGIN = prev
  })

  it('reports telegram unconfigured when env missing', () => {
    const t = process.env.TELEGRAM_BOT_TOKEN
    const c = process.env.TELEGRAM_CHAT_ID
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
    expect(isTelegramConfigured()).toBe(false)
    process.env.TELEGRAM_BOT_TOKEN = t
    process.env.TELEGRAM_CHAT_ID = c
  })
})

describe('claim gate — non-admin cannot claim', () => {
  it('requirePlatformAdmin rejects school teacher', () => {
    const gate = requirePlatformAdmin({
      id: 'u1',
      role: 'teacher',
      email: 't@school.com',
      schoolId: 's1',
      isPlatform: false,
    })
    expect(gate.ok).toBe(false)
    expect(gate.status).toBe(403)
  })

  it('requirePlatformAdmin accepts platform superadmin', () => {
    const user = {
      id: 'admin1',
      role: 'superadmin',
      email: 'ops@zsms.com',
      isPlatform: true,
    }
    expect(isPlatformSession(user)).toBe(true)
    const gate = requirePlatformAdmin(user)
    expect(gate.ok).toBe(true)
  })

  it('rejects forged isPlatform without superadmin role', () => {
    const user = {
      id: 'u2',
      role: 'teacher',
      email: 't@school.com',
      isPlatform: true,
    }
    expect(isPlatformSession(user)).toBe(false)
    expect(requirePlatformAdmin(user).ok).toBe(false)
  })
})

describe('handoff client payload (request-human response shape)', () => {
  it('includes claimer path and omits telegram skip fields when sent', () => {
    const payload = buildHandoffClientPayload({
      sessionId: 'sess-1',
      status: 'PENDING_HUMAN',
      telegramSent: true,
    })
    expect(payload.success).toBe(true)
    expect(payload.telegramSent).toBe(true)
    expect(payload.adminClaimPath).toBe(HANDOFF_ADMIN_CLAIM_PATH)
    expect(payload.claimerHint).toBe(HANDOFF_CLAIMER_HINT)
    expect(payload.telegramReason).toBeUndefined()
    expect(payload.telegramSkippedHint).toBeUndefined()
    expect(payload.claimerHint).toMatch(/Platform → Chat support/)
  })

  it('exposes telegramSent false + reason when alert was skipped', () => {
    const payload = buildHandoffClientPayload({
      sessionId: 'sess-2',
      status: 'PENDING_HUMAN',
      telegramSent: false,
      telegramReason: 'not_configured',
    })
    expect(payload.telegramSent).toBe(false)
    expect(payload.telegramReason).toBe('not_configured')
    expect(payload.telegramSkippedHint).toMatch(/Telegram alert was not sent/)
    expect(payload.adminClaimPath).toBe('/platform/support')
  })
})

describe('handoff status transitions', () => {
  it('recognizes PENDING_HUMAN and HUMAN_ACTIVE', () => {
    expect(isHandoffStatus('PENDING_HUMAN')).toBe(true)
    expect(isHandoffStatus('HUMAN_ACTIVE')).toBe(true)
    expect(isHandoffStatus('AI_MANAGED')).toBe(false)
    expect(isHandoffStatus('CLOSED')).toBe(false)
  })

  it('documents designed order PENDING_HUMAN → HUMAN_ACTIVE → CLOSED', () => {
    const order = ['AI_MANAGED', 'PENDING_HUMAN', 'HUMAN_ACTIVE', 'CLOSED']
    expect(order.indexOf('PENDING_HUMAN')).toBeLessThan(order.indexOf('HUMAN_ACTIVE'))
    expect(order.indexOf('HUMAN_ACTIVE')).toBeLessThan(order.indexOf('CLOSED'))
  })
})

describe('RULE 5 detection', () => {
  it('detects explicit human requests', () => {
    expect(wantsHumanHandoff('I need to speak to a human')).toBe(true)
    expect(wantsHumanHandoff('escalate please')).toBe(true)
    expect(wantsHumanHandoff('How do I write a lesson plan?')).toBe(false)
  })
})

describe('WS ticket HMAC', () => {
  beforeEach(() => {
    process.env.CHAT_DO_SHARED_SECRET = 'unit-test-chat-do-secret'
  })
  afterEach(() => {
    delete process.env.CHAT_DO_SHARED_SECRET
  })

  it('round-trips user tickets', () => {
    const token = signChatWsTicket({
      sessionId: 'sess-1',
      userId: 'user-1',
      connectionRole: 'user',
    })
    const claims = verifyChatWsTicket(token)
    expect(claims?.sessionId).toBe('sess-1')
    expect(claims?.connectionRole).toBe('user')
  })

  it('rejects tampered admin tickets', () => {
    const token = signChatWsTicket({
      sessionId: 'sess-1',
      userId: 'admin-1',
      connectionRole: 'admin',
    })
    const tampered = token.slice(0, -2) + 'ab'
    expect(verifyChatWsTicket(tampered)).toBeNull()
  })
})

describe('claimHandoffSession status machine (mocked prisma)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('transitions PENDING_HUMAN → HUMAN_ACTIVE and rejects non-pending', async () => {
    const session = {
      id: 'sess-1',
      schoolId: 'school-1',
      status: 'PENDING_HUMAN',
      assignedToId: null,
      assignedToName: null,
    }
    const update = vi.fn().mockResolvedValue({
      ...session,
      status: 'HUMAN_ACTIVE',
      assignedToId: 'admin-1',
      assignedToName: 'Platform Dev',
    })
    const findUnique = vi.fn().mockResolvedValue(session)
    const create = vi.fn().mockResolvedValue({ id: 'msg-join-1' })

    vi.doMock('@/lib/prisma/client', () => ({
      basePrisma: {
        chatSession: { findUnique, update },
        chatMessage: { create },
      },
    }))
    vi.doMock('@/lib/ai/chat/ws-ticket', () => ({
      chatDoHttpBaseUrl: () => null,
    }))

    const { claimHandoffSession, closeHandoffSession } = await import('@/lib/ai/chat/handoff')

    const claimed = await claimHandoffSession({
      sessionId: 'sess-1',
      adminUserId: 'admin-1',
      adminName: 'Platform Dev',
    })
    expect(claimed.ok).toBe(true)
    if (claimed.ok) {
      expect(claimed.session.status).toBe('HUMAN_ACTIVE')
      expect(claimed.session.assignedToId).toBe('admin-1')
      expect(claimed.session.assignedToName).toBe('Platform Dev')
    }
    expect(update).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      data: {
        status: 'HUMAN_ACTIVE',
        assignedToId: 'admin-1',
        assignedToName: 'Platform Dev',
      },
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: null,
          sender: 'SYSTEM',
          content: 'Platform Dev has joined this conversation.',
          contextSources: expect.objectContaining({
            handoffClaim: true,
            claimedByPlatformAdminId: 'admin-1',
            claimedByName: 'Platform Dev',
          }),
        }),
      })
    )

    findUnique.mockResolvedValue({
      id: 'sess-1',
      schoolId: 'school-1',
      status: 'HUMAN_ACTIVE',
      assignedToId: 'admin-1',
      assignedToName: 'Platform Dev',
    })
    update.mockResolvedValue({
      id: 'sess-1',
      schoolId: 'school-1',
      status: 'CLOSED',
      assignedToId: 'admin-1',
      assignedToName: 'Platform Dev',
    })
    const closed = await closeHandoffSession({ sessionId: 'sess-1', actorUserId: 'admin-1' })
    expect(closed.ok).toBe(true)
    if (closed.ok) expect(closed.session.status).toBe('CLOSED')
  })

  it('rejects claim when session is AI_MANAGED', async () => {
    vi.doMock('@/lib/prisma/client', () => ({
      basePrisma: {
        chatSession: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'sess-2',
            schoolId: 'school-1',
            status: 'AI_MANAGED',
            assignedToId: null,
          }),
          update: vi.fn(),
        },
        chatMessage: { create: vi.fn() },
      },
    }))
    vi.doMock('@/lib/ai/chat/ws-ticket', () => ({
      chatDoHttpBaseUrl: () => null,
    }))

    const { claimHandoffSession } = await import('@/lib/ai/chat/handoff')
    const result = await claimHandoffSession({ sessionId: 'sess-2', adminUserId: 'admin-1' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(409)
  })

  it('claims with PlatformAdmin id that is not a User row (no User FK required)', async () => {
    const platformAdminId = 'plat-admin-uuid-not-in-user-table'
    const session = {
      id: 'sess-pa',
      schoolId: 'school-1',
      status: 'PENDING_HUMAN',
      assignedToId: null,
      assignedToName: null,
    }
    const update = vi.fn().mockResolvedValue({
      ...session,
      status: 'HUMAN_ACTIVE',
      assignedToId: platformAdminId,
      assignedToName: 'super-admin@bluepeacktechnologies.com',
    })
    const create = vi.fn().mockResolvedValue({ id: 'msg-pa-join' })

    vi.doMock('@/lib/prisma/client', () => ({
      basePrisma: {
        chatSession: {
          findUnique: vi.fn().mockResolvedValue(session),
          update,
        },
        chatMessage: { create },
      },
    }))
    vi.doMock('@/lib/ai/chat/ws-ticket', () => ({
      chatDoHttpBaseUrl: () => null,
    }))

    const { claimHandoffSession } = await import('@/lib/ai/chat/handoff')
    const result = await claimHandoffSession({
      sessionId: 'sess-pa',
      adminUserId: platformAdminId,
      adminName: 'super-admin@bluepeacktechnologies.com',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.session.status).toBe('HUMAN_ACTIVE')
      expect(result.session.assignedToId).toBe(platformAdminId)
      expect(result.session.assignedToName).toBe('super-admin@bluepeacktechnologies.com')
    }
    // Must not write platform admin id into ChatMessage.userId (still FKs User).
    expect(create.mock.calls[0][0].data.userId).toBeNull()
    expect(create.mock.calls[0][0].data.content).toContain(
      'super-admin@bluepeacktechnologies.com has joined'
    )
  })

  it('returns 409 when prisma reports FK violation on claim (legacy schema)', async () => {
    const fkErr = Object.assign(new Error('FK'), { code: 'P2003' })
    vi.doMock('@/lib/prisma/client', () => ({
      basePrisma: {
        chatSession: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'sess-fk',
            schoolId: 'school-1',
            status: 'PENDING_HUMAN',
            assignedToId: null,
          }),
          update: vi.fn().mockRejectedValue(fkErr),
        },
        chatMessage: { create: vi.fn() },
      },
    }))
    vi.doMock('@/lib/ai/chat/ws-ticket', () => ({
      chatDoHttpBaseUrl: () => null,
    }))

    const { claimHandoffSession } = await import('@/lib/ai/chat/handoff')
    const result = await claimHandoffSession({
      sessionId: 'sess-fk',
      adminUserId: 'plat-admin-no-user',
      adminName: 'Platform Admin',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(409)
      expect(result.error).toMatch(/Cannot assign claimer/i)
    }
  })

  it('returns 400 when claimer id is missing', async () => {
    vi.doMock('@/lib/prisma/client', () => ({
      basePrisma: {
        chatSession: { findUnique: vi.fn(), update: vi.fn() },
        chatMessage: { create: vi.fn() },
      },
    }))
    vi.doMock('@/lib/ai/chat/ws-ticket', () => ({
      chatDoHttpBaseUrl: () => null,
    }))

    const { claimHandoffSession } = await import('@/lib/ai/chat/handoff')
    const result = await claimHandoffSession({ sessionId: 'sess-x', adminUserId: '  ' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(400)
  })
})
