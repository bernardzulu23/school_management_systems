import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/middleware/auth', () => ({
  authMiddleware: vi.fn(),
  roleCheck: vi.fn(() => true),
}))

vi.mock('@/lib/tenant/resolveSchoolId', () => ({
  resolveAuthenticatedSchoolId: vi.fn(),
}))

vi.mock('@/lib/middleware/aiUsageTracker', () => ({
  getSchoolPlanForUsage: vi.fn(),
}))

vi.mock('@/lib/features/ragAccess', () => ({
  canUseRAG: vi.fn(() => ({ enabled: true, topK: 5, embedProvider: 'huggingface' })),
}))

vi.mock('@/lib/ai/rag-context', () => ({
  buildRagContextForQuery: vi.fn(),
}))

import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { getSchoolPlanForUsage } from '@/lib/middleware/aiUsageTracker'
import { buildRagContextForQuery } from '@/lib/ai/rag-context'
import { GET } from '@/app/api/materials/rag-preview/route'

describe('GET /api/materials/rag-preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'u1', role: 'teacher' },
    })
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId: 'school-1' })
    getSchoolPlanForUsage.mockResolvedValue({ plan: 'premium' })
    buildRagContextForQuery.mockResolvedValue({
      enabled: true,
      refs: [{ ref: 1, materialTitle: 'ICT Notes', excerpt: 'Hardware' }],
      materialIds: ['mat-1'],
    })
  })

  it('returns preview refs for a topic', async () => {
    const url =
      'http://localhost/api/materials/rag-preview?subject=ICT&topic=Computer%20hardware&gradeLevel=Form%201'
    const res = await GET(new Request(url))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.hasCoverage).toBe(true)
    expect(json.chunkCount).toBe(1)
    expect(buildRagContextForQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'school-1',
        subject: 'ICT',
        gradeLevel: 'Form 1',
      })
    )
  })

  it('rejects short topics', async () => {
    const res = await GET(
      new Request('http://localhost/api/materials/rag-preview?subject=ICT&topic=ab')
    )
    expect(res.status).toBe(400)
  })
})
