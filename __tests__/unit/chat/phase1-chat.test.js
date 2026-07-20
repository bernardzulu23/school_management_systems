import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CHAT_RATE_LIMITS, getChatRateLimit } from '@/lib/ai/chat/rate-limits'
import { rolesMatch, mapUserToChatRole, isChatRoleEnabled } from '@/lib/ai/chat/roles'
import { HEADTEACHER_REFUSAL, mapHeadteacherQuestion } from '@/lib/ai/chat/headteacher-queries'
import { roleMismatchResponse } from '@/lib/ai/chat/session'

describe('chat rate limit config', () => {
  it('exposes 100/day for teacher/hod/headteacher', () => {
    for (const role of ['TEACHER', 'HOD', 'HEADTEACHER', 'SOLO_TEACHER']) {
      const cfg = getChatRateLimit(role)
      expect(cfg.maxRequests).toBe(100)
      expect(cfg.windowSec).toBe(86_400)
    }
  })

  it('disables student and leaves platform admin unlimited', () => {
    expect(CHAT_RATE_LIMITS.STUDENT.maxRequests).toBe(0)
    expect(CHAT_RATE_LIMITS.PLATFORM_ADMIN.maxRequests).toBeNull()
  })
})

describe('chat role mapping', () => {
  it('maps headteacher aliases and disables student', () => {
    expect(mapUserToChatRole({ id: '1', role: 'headteacher', email: 'a@b.c' })).toBe('HEADTEACHER')
    expect(mapUserToChatRole({ id: '1', role: 'teacher', email: 'a@b.c' })).toBe('TEACHER')
    expect(mapUserToChatRole({ id: '1', role: 'teacher', email: 'a@b.c' }, 'INDIVIDUAL')).toBe(
      'SOLO_TEACHER'
    )
    expect(isChatRoleEnabled('STUDENT')).toBe(false)
    expect(isChatRoleEnabled('TEACHER')).toBe(true)
  })

  it('detects role mismatch', () => {
    expect(rolesMatch('TEACHER', 'TEACHER')).toBe(true)
    expect(rolesMatch('TEACHER', 'HOD')).toBe(false)
  })
})

describe('role mismatch 403 payload', () => {
  it('returns 403 with CHAT_ROLE_MISMATCH', async () => {
    const req = new Request('http://localhost/api/chat/send-message')
    const res = roleMismatchResponse(req, 'TEACHER', 'HOD')
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('CHAT_ROLE_MISMATCH')
    expect(body.openedAsRole).toBe('TEACHER')
    expect(body.currentRole).toBe('HOD')
  })
})

describe('headteacher query mapping', () => {
  it('maps enrollment / attendance / exam / coverage', () => {
    expect(mapHeadteacherQuestion('How many students are enrolled?')?.kind).toBe('enrollment')
    expect(mapHeadteacherQuestion('What is attendance rate today?')?.kind).toBe('attendance')
    expect(mapHeadteacherQuestion('What is our pass rate this term?')?.kind).toBe(
      'exam_performance'
    )
    expect(mapHeadteacherQuestion('How many teachers and coverage compliance?')?.kind).toBe(
      'teacher_coverage'
    )
  })

  it('refuses unmapped questions with exact message', () => {
    expect(mapHeadteacherQuestion('Write me a poem about exams')).toBeNull()
    expect(mapHeadteacherQuestion('What is the school budget?')).toBeNull()
    expect(HEADTEACHER_REFUSAL).toBe(
      'I can answer questions about enrollment, attendance, exam performance, and teacher coverage. For anything else, please use the relevant dashboard section.'
    )
  })
})

describe('scoped-context tenant isolation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('does not leak cross-tenant data (getTenantClient scoped)', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const findFirst = vi.fn().mockResolvedValue(null)
    const findUnique = vi.fn().mockResolvedValue({
      name: 'School A',
      plan: 'trial',
      academicYear: '2026',
      level: 'secondary',
    })

    vi.doMock('@/lib/prisma/tenantClient', () => ({
      getTenantClient: (schoolId) => {
        expect(schoolId).toBe('school-a')
        return {
          school: { findUnique },
          teacher: { findFirst, findMany },
          teachingAssignment: { findMany },
          lessonPlan: { findMany },
          headOfDepartment: { findFirst, findMany },
          subject: { findMany },
        }
      },
    }))

    vi.doMock('@/lib/ai/rag-context', () => ({
      buildRagContextForQuery: vi.fn().mockResolvedValue({ block: '', refs: [] }),
    }))

    const { buildScopedContext } = await import('@/lib/ai/chat/scoped-context')
    const result = await buildScopedContext({
      tenantId: 'school-a',
      userId: 'user-1',
      role: 'TEACHER',
      query: 'algebra',
    })

    expect(findUnique).toHaveBeenCalled()
    expect(result.text).not.toMatch(/school-b/i)
    expect(result.snippets.every((s) => !/school-b/i.test(s.content))).toBe(true)
  })
})
