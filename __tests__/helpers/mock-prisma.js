/**
 * Prisma client mock factory for API route tests.
 */
import { vi } from 'vitest'

/**
 * @returns {Record<string, unknown>}
 */
export function createMockPrisma() {
  const mock = {
    school: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    schoolRegistration: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    teacher: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    student: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    subject: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    teacherAllocation: {
      findMany: vi.fn(),
    },
    class: {
      findMany: vi.fn(),
    },
    eczAssessment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    eczAssessmentScore: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    eczRubric: {
      create: vi.fn(),
    },
    eczAssessmentItem: {
      createMany: vi.fn(),
    },
    eczSubmission: {
      upsert: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    lessonPlan: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    sharedMaterial: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    materialRating: {
      findUnique: vi.fn(),
      aggregate: vi.fn(),
      upsert: vi.fn(),
    },
    timetableNotification: {
      create: vi.fn(),
    },
    mockExamAttempt: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    navBotQuery: {
      create: vi.fn(),
    },
    aIRequest: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(async (fn) => fn(mock)),
  }
  return mock
}
