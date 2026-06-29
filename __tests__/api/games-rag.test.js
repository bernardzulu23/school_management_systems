import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/middleware/auth', () => ({
  authMiddleware: vi.fn(),
  roleCheck: vi.fn(() => true),
}))

vi.mock('@/lib/tenant/resolveSchoolId', () => ({
  resolveAuthenticatedSchoolId: vi.fn(),
}))

vi.mock('@/lib/middleware/subscriptionGate', () => ({
  enforceSubscriptionIfNeeded: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    game: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    studentGame: { aggregate: vi.fn() },
  },
}))

import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import prisma from '@/lib/prisma'
import { GET, POST } from '@/app/api/games/route'

describe('GET /api/games', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'u1', role: 'teacher', schoolId: 'school-1' },
    })
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId: 'school-1' })
    prisma.game.findMany.mockResolvedValue([
      {
        id: 'g1',
        title: 'Math Quiz',
        description: 'Test',
        type: 'quiz',
        subject: 'Mathematics',
        difficulty: 'easy',
        content: { questions: [{ question: '2+2?', options: ['3', '4'], correctAnswer: '4' }] },
        createdAt: new Date(),
      },
    ])
    prisma.studentGame.aggregate.mockResolvedValue({ _count: { id: 3 }, _avg: { score: 80 } })
  })

  it('lists games for the school', async () => {
    const res = await GET(new Request('http://localhost/api/games'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data[0].title).toBe('Math Quiz')
    expect(json.data[0].playCount).toBe(3)
  })
})

describe('POST /api/games', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'u1', role: 'teacher', schoolId: 'school-1' },
    })
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId: 'school-1' })
    prisma.game.create.mockResolvedValue({
      id: 'g-new',
      title: 'Science Quiz',
      description: null,
      type: 'quiz',
      subject: 'Science',
      difficulty: 'medium',
      content: { questions: [{ question: 'H2O?', options: ['Water'], correctAnswer: 'Water' }] },
      createdAt: new Date(),
    })
  })

  it('creates a quiz game', async () => {
    const res = await POST(
      new Request('http://localhost/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Science Quiz',
          subject: 'Science',
          gameType: 'quiz',
          difficulty: 'medium',
          pointsReward: 20,
          timeLimit: 30,
          targetClass: 'Form 2',
          content: {
            questions: [{ question: 'H2O?', options: ['Water'], correctAnswer: 'Water' }],
          },
        }),
      })
    )
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.data.title).toBe('Science Quiz')
    expect(prisma.game.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: expect.objectContaining({
            pointsReward: 20,
            timeLimit: 30,
            targetClass: 'Form 2',
          }),
        }),
      })
    )
  })
})
