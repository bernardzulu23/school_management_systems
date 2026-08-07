/**
 * Teacher DELETE /api/teacher/results — owner may delete own entries.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE as teacherResultsDelete } from '@/app/api/teacher/results/route.js'
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

vi.mock('@/lib/prisma/tenantClient', () => ({
  getTenantClient: () => mockPrisma,
}))

import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

describe('DELETE /api/teacher/results', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId: 'school-1' })
    mockPrisma.school.findUnique.mockResolvedValue({
      id: 'school-1',
      plan: 'professional',
      level: 'secondary',
      trialEndsAt: null,
      planExpiresAt: null,
    })
  })

  it('allows a teacher to delete a result they entered', async () => {
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'user-teacher-1', role: 'teacher', schoolId: 'school-1' },
    })

    mockPrisma.teacher.findFirst.mockResolvedValue({
      id: 'teacher-1',
      assignedSubjects: [],
      classes: [],
      subjects: [],
      teachingAssignments: [],
    })
    mockPrisma.result.findFirst.mockResolvedValue({
      id: 'result-1',
      studentId: 'student-1',
      subjectId: 'subject-1',
      enteredByUserId: 'user-teacher-1',
    })
    mockPrisma.subject.findFirst.mockResolvedValue({ name: 'Mathematics' })
    mockPrisma.result.deleteMany.mockResolvedValue({ count: 1 })

    const res = await teacherResultsDelete(
      buildRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/teacher/results?id=result-1',
      })
    )

    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(mockPrisma.result.deleteMany).toHaveBeenCalled()
  })

  it('rejects delete for another teacher without assignment with a clear non-login message', async () => {
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'user-teacher-2', role: 'teacher', schoolId: 'school-1' },
    })

    mockPrisma.teacher.findFirst.mockResolvedValue({
      id: 'teacher-2',
      assignedSubjects: [],
      classes: [],
      subjects: [],
      teachingAssignments: [],
    })
    mockPrisma.result.findFirst.mockResolvedValue({
      id: 'result-1',
      studentId: 'student-1',
      subjectId: 'subject-1',
      enteredByUserId: 'user-teacher-1',
    })
    mockPrisma.subject.findFirst.mockResolvedValue({ name: 'Mathematics' })
    mockPrisma.student.findFirst.mockResolvedValue({
      id: 'student-1',
      classId: 'class-1',
      class: 'Grade 8A',
    })
    mockPrisma.pupilSubjectEnrollment.findMany.mockResolvedValue([])
    mockPrisma.class.findMany.mockResolvedValue([
      { id: 'class-1', name: 'Grade 8A', year_group: 'Grade 8', section: 'A' },
    ])
    mockPrisma.class.findFirst.mockResolvedValue({ id: 'class-1', teacherId: 'other-teacher' })

    const res = await teacherResultsDelete(
      buildRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/teacher/results?id=result-1',
      })
    )

    expect(res.status).toBe(403)
    const json = await parseJson(res)
    const msg = String(json.message || json.error || '')
    expect(msg.toLowerCase()).not.toContain('log in again')
    expect(msg.toLowerCase()).toMatch(/entered|assigned|authorized|delete/)
    expect(mockPrisma.result.deleteMany).not.toHaveBeenCalled()
  })
})
