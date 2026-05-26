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
    student: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    subject: {
      findFirst: vi.fn(),
    },
    eczAssessment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    eczAssessmentScore: {
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
      create: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    $transaction: vi.fn(async (fn) => fn(mock)),
  }
  return mock
}
