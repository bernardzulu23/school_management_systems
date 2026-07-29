import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GET as getAssignments,
  POST as postAssignment,
  DELETE as deleteAssignment,
} from '@/app/api/senior-teachers/assignments/route.js'
import { buildRequest, parseJson } from '../helpers/request.js'
import { mockPrisma } from '../setup.js'

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

describe('Senior Teacher assignment routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'admin-1', role: 'headteacher', schoolId: 'school-1' },
    })
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId: 'school-1' })
    mockPrisma.school.findUnique.mockResolvedValue({ id: 'school-1', level: 'primary' })
  })

  it('assigns a teacher as Senior Teacher', async () => {
    mockPrisma.teacher.findFirst.mockResolvedValue({
      id: 'teacher-1',
      userId: 'user-1',
      user: { id: 'user-1', role: 'teacher', name: 'Ada', email: 'ada@test.com' },
    })
    mockPrisma.seniorTeacherAssignment.upsert.mockResolvedValue({
      id: 'sta-1',
      user: { id: 'user-1', name: 'Ada', email: 'ada@test.com', role: 'teacher' },
      assignedBy: { id: 'admin-1', name: 'Headteacher' },
    })

    const res = await postAssignment(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/senior-teachers/assignments',
        body: { teacherId: 'teacher-1' },
      })
    )

    expect(res.status).toBe(201)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('sta-1')
  })

  it('lists active Senior Teacher assignments', async () => {
    mockPrisma.seniorTeacherAssignment.findMany.mockResolvedValue([
      { id: 'sta-1', user: { id: 'user-1', name: 'Ada', email: 'ada@test.com' } },
    ])

    const res = await getAssignments(
      buildRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/senior-teachers/assignments',
      })
    )

    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it('revokes a Senior Teacher assignment', async () => {
    mockPrisma.seniorTeacherAssignment.findFirst.mockResolvedValue({ id: 'sta-1' })
    mockPrisma.seniorTeacherAssignment.update.mockResolvedValue({
      id: 'sta-1',
      active: false,
      revokedAt: new Date('2026-07-29'),
    })

    const res = await deleteAssignment(
      buildRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/senior-teachers/assignments',
        body: { assignmentId: 'sta-1' },
      })
    )

    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.data.active).toBe(false)
  })
})
