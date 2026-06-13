import { describe, expect, it, vi } from 'vitest'
import { fetchResultsOverview, resolveResultsScope } from '@/lib/dashboard/resultsOverview'

function createPrismaMock(overrides = {}) {
  return {
    teacher: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    headOfDepartment: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    department: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    pupilSubjectEnrollment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    class: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    subject: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    result: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  }
}

describe('resolveResultsScope', () => {
  it('returns school-wide enrolled subjects and teachers for headteacher', async () => {
    const prisma = createPrismaMock({
      teacher: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 't1',
            user: { id: 'u1', name: 'Jane Mwila', email: 'jane@school.test' },
            teachingAssignments: [
              {
                teacherId: 't1',
                class: { id: 'c1', name: 'Form 1A' },
                subject: { id: 's1', name: 'Mathematics' },
              },
            ],
          },
          {
            id: 't2',
            user: { id: 'u2', name: 'John Banda', email: 'john@school.test' },
            teachingAssignments: [
              {
                teacherId: 't2',
                class: { id: 'c1', name: 'Form 1A' },
                subject: { id: 's2', name: 'English' },
              },
            ],
          },
        ]),
      },
      pupilSubjectEnrollment: {
        findMany: vi.fn().mockResolvedValue([
          {
            class: { id: 'c1', name: 'Form 1A' },
            subject: { id: 's3', name: 'Science' },
          },
        ]),
      },
    })

    const scope = await resolveResultsScope({
      prisma,
      schoolId: 'school-1',
      user: { id: 'ht-1', role: 'headteacher' },
    })

    expect(scope.scope).toBe('school')
    expect(scope.filters.classes.map((c) => c.name)).toEqual(['Form 1A'])
    expect(scope.filters.subjects.map((s) => s.name).sort()).toEqual([
      'English',
      'Mathematics',
      'Science',
    ])
    expect(scope.filters.teachers.map((t) => t.name).sort()).toEqual(['Jane Mwila', 'John Banda'])
  })
})

describe('fetchResultsOverview', () => {
  it('applies class and subject filters in the query', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const prisma = createPrismaMock({
      teacher: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 't1',
            user: { id: 'u1', name: 'Jane Mwila', email: 'jane@school.test' },
            teachingAssignments: [
              {
                teacherId: 't1',
                class: { id: 'c1', name: 'Form 1A' },
                subject: { id: 's1', name: 'Mathematics' },
              },
            ],
          },
        ]),
      },
      result: { findMany },
    })

    await fetchResultsOverview({
      prisma,
      schoolId: 'school-1',
      user: { id: 'ht-1', role: 'headteacher' },
      className: 'Form 1A',
      subjectName: 'Mathematics',
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { schoolId: 'school-1' },
            { student: { class: 'Form 1A' } },
            { subject: { name: 'Mathematics' } },
          ]),
        }),
      })
    )
  })
})
