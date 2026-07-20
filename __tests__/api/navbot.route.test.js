import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma } from '../setup.js'

vi.mock('@/lib/middleware/auth', () => ({
  authMiddleware: vi.fn(),
  roleCheck: vi.fn(),
}))

vi.mock('@/lib/navbot/enforce-rate-limit', () => ({
  enforceNavBotRateLimit: vi.fn(),
}))

describe('POST /api/chat/navbot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.student.findFirst.mockResolvedValue({ id: 'student-1' })
    mockPrisma.navBotQuery.create.mockResolvedValue({ id: 'query-1' })
  })

  async function loadRoute() {
    return import('@/app/api/chat/navbot/route')
  }

  it('returns the matched answer for student queries and logs intent id', async () => {
    const { authMiddleware, roleCheck } = await import('@/lib/middleware/auth')
    const { enforceNavBotRateLimit } = await import('@/lib/navbot/enforce-rate-limit')
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'user-1', role: 'student', schoolId: 'school-1' },
    })
    roleCheck.mockReturnValue(true)
    enforceNavBotRateLimit.mockResolvedValue({ limited: false, remaining: 49 })

    const { POST } = await loadRoute()
    const res = await POST(
      new Request('http://localhost/api/chat/navbot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'see my timetable' }),
      })
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      matched: true,
      intentId: 'view-timetable',
      route: '/dashboard/timetable/student',
    })
    expect(mockPrisma.navBotQuery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        schoolId: 'school-1',
        studentId: 'student-1',
        matchedIntentId: 'view-timetable',
      }),
    })
  })

  it('returns the fixed fallback and logs null intent for no-match', async () => {
    const { authMiddleware, roleCheck } = await import('@/lib/middleware/auth')
    const { enforceNavBotRateLimit } = await import('@/lib/navbot/enforce-rate-limit')
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'user-1', role: 'student', schoolId: 'school-1' },
    })
    roleCheck.mockReturnValue(true)
    enforceNavBotRateLimit.mockResolvedValue({ limited: false, remaining: 49 })

    const { NAVBOT_FALLBACK_MESSAGE, POST } = await loadRoute()
    const res = await POST(
      new Request('http://localhost/api/chat/navbot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'please explain quadratic equations' }),
      })
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      matched: false,
      intentId: null,
      route: null,
      answer: NAVBOT_FALLBACK_MESSAGE,
    })
    expect(mockPrisma.navBotQuery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        matchedIntentId: null,
      }),
    })
  })

  it('blocks non-student access', async () => {
    const { authMiddleware, roleCheck } = await import('@/lib/middleware/auth')
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'user-2', role: 'teacher', schoolId: 'school-1' },
    })
    roleCheck.mockReturnValue(false)

    const { POST } = await loadRoute()
    const res = await POST(
      new Request('http://localhost/api/chat/navbot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'see my timetable' }),
      })
    )

    expect(res.status).toBe(403)
    expect(mockPrisma.student.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.navBotQuery.create).not.toHaveBeenCalled()
  })

  it('keeps forbidden imports out of the isolated module', () => {
    const files = [
      path.join(process.cwd(), 'app/api/chat/navbot/route.ts'),
      path.join(process.cwd(), 'lib/navbot/match-intent.ts'),
      path.join(process.cwd(), 'lib/navbot/enforce-rate-limit.ts'),
    ]
    const forbiddenPatterns = [
      /@\/lib\/ai\/chat\//,
      /@\/lib\/ai\/curriculum-context/,
      /provider-fallback/,
      /groq/i,
      /gemini/i,
      /openrouter/i,
      /scoped-context/,
    ]

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8')
      for (const pattern of forbiddenPatterns) {
        expect(source).not.toMatch(pattern)
      }
    }
  })
})
