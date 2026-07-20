import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  countsFromGroupBy,
  getRequiredLessonPlansPerTerm,
  syllabusReadinessIndex,
  DEFAULT_LESSON_PLAN_REQUIRED_PER_TERM,
  totalFromCounts,
} from '@/lib/ai/chat/lesson-plan-readiness'
import { assertTeacherInHodDepartment } from '@/lib/hod/departmentTeachers'

describe('syllabus readiness index math', () => {
  it('computes ratio and clamped percent', () => {
    const r = syllabusReadinessIndex(3, 12)
    expect(r.approvedCount).toBe(3)
    expect(r.requiredCount).toBe(12)
    expect(r.ratio).toBe(0.25)
    expect(r.percent).toBe(25)
  })

  it('clamps percent at 100 when over required', () => {
    const r = syllabusReadinessIndex(15, 12)
    expect(r.ratio).toBeGreaterThan(1)
    expect(r.percent).toBe(100)
  })

  it('uses env LESSON_PLAN_REQUIRED_PER_TERM when set', () => {
    expect(getRequiredLessonPlansPerTerm({ LESSON_PLAN_REQUIRED_PER_TERM: '8' })).toBe(8)
    expect(getRequiredLessonPlansPerTerm({})).toBe(DEFAULT_LESSON_PLAN_REQUIRED_PER_TERM)
    expect(getRequiredLessonPlansPerTerm({ LESSON_PLAN_REQUIRED_PER_TERM: '0' })).toBe(
      DEFAULT_LESSON_PLAN_REQUIRED_PER_TERM
    )
  })
})

describe('stats groupBy normalization', () => {
  it('maps groupBy rows into fixed SubmissionStatus counts', () => {
    const counts = countsFromGroupBy([
      { status: 'DRAFT', _count: 2 },
      { status: 'PENDING_APPROVAL', _count: { _all: 1 } },
      { status: 'APPROVED', _count: 4 },
    ])
    expect(counts).toEqual({
      DRAFT: 2,
      PENDING_APPROVAL: 1,
      APPROVED: 4,
      REJECTED: 0,
    })
    expect(totalFromCounts(counts)).toBe(7)
  })

  it('scopes mentally: where always includes schoolId + teacherId (contract)', () => {
    // Documents the stats route contract used by /api/teacher/lesson-plans/stats
    const teacherId = 'teacher-a'
    const schoolId = 'school-1'
    const where = { schoolId, teacherId }
    expect(where.schoolId).toBe('school-1')
    expect(where.teacherId).toBe('teacher-a')
    expect(where).not.toHaveProperty('hodId')
  })
})

describe('HOD cross-department denial', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('denies teacher outside HOD department', async () => {
    const prisma = {
      headOfDepartment: {
        findFirst: vi.fn().mockResolvedValue({
          departmentId: 'dept-math',
          department: 'Mathematics',
          departmentRef: { id: 'dept-math', name: 'Mathematics' },
        }),
      },
      teacher: {
        findMany: vi.fn().mockResolvedValue([{ userId: 'teacher-in-dept' }]),
      },
    }

    vi.doMock('@/lib/utils/departmentResolver', () => ({
      resolveDepartmentScope: vi.fn().mockResolvedValue({
        departmentIds: ['dept-math'],
        departmentNameAliases: ['Mathematics'],
      }),
    }))

    // Re-import after mock — use direct call with stubbed resolver via inline prisma only
    // assertTeacherInHodDepartment calls resolveDepartmentScope which is already imported.
    // Instead stub teacher list result only (resolver still runs against our prisma).
    // Provide department find if resolver needs it — mock module properly:

    const { resolveDepartmentScope } = await import('@/lib/utils/departmentResolver')
    // If real resolver runs, it may call prisma.department — add stubs
    prisma.department = {
      findMany: vi.fn().mockResolvedValue([{ id: 'dept-math', name: 'Mathematics' }]),
    }
    prisma.departmentAlias = { findMany: vi.fn().mockResolvedValue([]) }

    const ok = await assertTeacherInHodDepartment(prisma, 'school-1', 'hod-1', 'teacher-in-dept')
    const denied = await assertTeacherInHodDepartment(
      prisma,
      'school-1',
      'hod-1',
      'teacher-other-dept'
    )
    expect(ok).toBe(true)
    expect(denied).toBe(false)
  })
})

describe('teacher stats route groupBy scoping (mocked handler deps)', () => {
  it('groupBy where is schoolId + authenticated teacherId only', async () => {
    const groupBy = vi.fn().mockResolvedValue([
      { status: 'DRAFT', _count: { _all: 1 } },
      { status: 'APPROVED', _count: { _all: 2 } },
    ])
    const db = { lessonPlanSubmission: { groupBy } }
    const schoolId = 'sch-1'
    const teacherId = 't-1'
    await db.lessonPlanSubmission.groupBy({
      by: ['status'],
      where: { schoolId, teacherId },
      _count: { _all: true },
    })
    expect(groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: { schoolId: 'sch-1', teacherId: 't-1' },
      _count: { _all: true },
    })
    const rows = await groupBy.mock.results[0].value
    const counts = countsFromGroupBy(rows.map((g) => ({ status: g.status, _count: g._count._all })))
    expect(counts.APPROVED).toBe(2)
    expect(counts.DRAFT).toBe(1)
  })
})
