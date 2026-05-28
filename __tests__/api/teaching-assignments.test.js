/**
 * Teaching assignments API — role gate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/teaching-assignments/route.js'
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

describe('GET /api/teaching-assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId: 'school-1' })
    mockPrisma.teacher = mockPrisma.teacher || { findUnique: vi.fn() }
    mockPrisma.teachingAssignment = mockPrisma.teachingAssignment || { findMany: vi.fn() }
    mockPrisma.teacher.findUnique.mockResolvedValue({ id: 'teacher-1' })
    mockPrisma.teachingAssignment.findMany.mockResolvedValue([
      { id: 'a1', class: { name: 'Form 1A' }, subject: { name: 'Math' } },
    ])
  })

  it('returns empty data for student (not staff)', async () => {
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'stu-1', role: 'student', schoolId: 'school-1' },
    })

    const res = await GET(
      buildRequest({
        url: 'http://localhost:3000/api/teaching-assignments?teacherId=teacher-1',
      })
    )
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.data).toEqual([])
  })

  it('returns assignments for HOD', async () => {
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'hod-1', role: 'hod', schoolId: 'school-1' },
    })

    const res = await GET(
      buildRequest({
        url: 'http://localhost:3000/api/teaching-assignments?teacherId=teacher-1',
      })
    )
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.data.length).toBeGreaterThan(0)
  })
})
