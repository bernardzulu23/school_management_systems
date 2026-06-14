/**
 * Primary school feature gating — plan features and HOD assignment blocks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as assignHodPost } from '@/app/api/hods/assign/route.js'
import { POST as teacherResultsPost } from '@/app/api/teacher/results/route.js'
import { mockPrisma } from '../setup.js'
import { buildRequest, parseJson } from '../helpers/request.js'

vi.mock('@/lib/middleware/auth', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    authMiddleware: vi.fn(),
    roleCheck: actual.roleCheck,
  }
})

vi.mock('@/lib/tenant/resolveSchoolId', () => ({
  resolveAuthenticatedSchoolId: vi.fn(),
}))

import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

function mockPrimaryTrialSchool() {
  mockPrisma.school.findUnique.mockResolvedValue({
    id: 'school-primary',
    plan: 'trial',
    level: 'primary',
    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    planExpiresAt: null,
  })
}

describe('primary school API gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId: 'school-primary' })
    mockPrimaryTrialSchool()
  })

  it('POST /api/hods/assign returns 403 for primary schools', async () => {
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'admin-1', role: 'headteacher', schoolId: 'school-primary' },
    })

    const res = await assignHodPost(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/hods/assign',
        body: { teacherId: 'teacher-1', departmentId: 'dept-1' },
      })
    )

    expect(res.status).toBe(403)
    const json = await parseJson(res)
    expect(json.code).toBe('SCHOOL_LEVEL_RESTRICTED')
    expect(json.featureId).toBe('hod-management')
  })

  it('POST /api/teacher/results returns 403 for primary schools', async () => {
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'teacher-1', role: 'teacher', schoolId: 'school-primary' },
    })

    const res = await teacherResultsPost(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/teacher/results',
        body: {
          results: [
            {
              studentId: 'student-1',
              subjectId: 'subject-1',
              classId: 'class-1',
              score: 80,
              term: 'Term 1 2026',
            },
          ],
        },
      })
    )

    expect(res.status).toBe(403)
    const json = await parseJson(res)
    expect(json.code).toBe('SCHOOL_LEVEL_RESTRICTED')
    expect(json.featureId).toBe('basic-results')
  })
})
