/**
 * Tests for ECZ submission API and weighting rules.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST as submitEcz } from '@/app/api/ecz/submissions/route.js'
import { GET as getEczDeadline } from '@/app/api/ecz/submissions/route.js'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { mockPrisma } from '../setup.js'
import { buildRequest, parseJson } from '../helpers/request.js'
import { getSBAWeight, SBA_WEIGHT_PERCENT } from '@/lib/ecz/ecz-compliance'

vi.mock('@/lib/middleware/auth', () => ({
  authMiddleware: vi.fn(),
  roleCheck: vi.fn(() => true),
}))

vi.mock('@/lib/tenant/resolveSchoolId', () => ({
  resolveAuthenticatedSchoolId: vi.fn(),
}))

vi.mock('@/lib/ecz/ecz-csv', () => ({
  generateECZCSV: vi.fn(() => 'csv,data'),
}))

const schoolId = 'school-1'
const hodUser = { id: 'hod-1', role: 'hod', schoolId }

describe('ECZ SBA weight rules', () => {
  it('uses 40% SBA weight for Physical Education', () => {
    expect(getSBAWeight('Physical Education and Sport')).toBe(40)
    expect(getSBAWeight('PE')).toBe(40)
  })

  it('uses 30% SBA weight for other subjects', () => {
    expect(getSBAWeight('Mathematics')).toBe(30)
    expect(getSBAWeight('English Language')).toBe(SBA_WEIGHT_PERCENT)
  })
})

describe('POST /api/ecz/submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-01T12:00:00.000Z'))

    authMiddleware.mockResolvedValue({ isAuthenticated: true, user: hodUser })
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId })

    mockPrisma.eczAssessmentScore.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        totalSBAScore: 85,
        student: { name: 'Learner A', exam_number: 'EX001' },
        assessment: { subject: { name: 'Mathematics', id: 'sub-1' } },
      },
    ])
    mockPrisma.school.findUnique.mockResolvedValue({
      id: schoolId,
      name: 'Test School',
      eczCentreNumber: 'C001',
      level: 'secondary',
      ownershipType: 'PRIVATE',
      schoolType: 'SCHOOL',
      active: true,
      plan: 'premium',
      planExpiresAt: new Date('2030-01-01'),
      trialEndsAt: null,
      emailVerified: true,
    })
    mockPrisma.subject.findFirst.mockResolvedValue({ id: 'sub-1' })
    mockPrisma.eczSubmission.upsert.mockResolvedValue({ id: 'submission-1' })
    mockPrisma.eczAssessmentScore.updateMany.mockResolvedValue({ count: 1 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('submits when scores exist and deadline not passed', async () => {
    const res = await submitEcz(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/ecz/submissions',
        body: {
          subjectId: 'sub-1',
          formLevel: 2,
          academicYear: 2025,
        },
      })
    )

    expect(res.status).toBe(201)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.csvData).toBeTruthy()
    expect(mockPrisma.eczSubmission.upsert).toHaveBeenCalled()
  })

  it('blocks Form 4 SBA submission', async () => {
    const res = await submitEcz(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/ecz/submissions',
        body: {
          subjectId: 'sub-1',
          formLevel: 4,
          academicYear: 2025,
        },
      })
    )

    expect(res.status).toBe(400)
    const json = await parseJson(res)
    expect(json.error).toMatch(/Form 4/i)
    expect(mockPrisma.eczSubmission.upsert).not.toHaveBeenCalled()
  })

  it('blocks submission when no learner scores exist', async () => {
    mockPrisma.eczAssessmentScore.findMany.mockResolvedValue([])

    const res = await submitEcz(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/ecz/submissions',
        body: {
          subjectId: 'sub-1',
          formLevel: 1,
          academicYear: 2025,
        },
      })
    )

    expect(res.status).toBe(400)
    const json = await parseJson(res)
    expect(json.error).toMatch(/no scores/i)
  })

  it('blocks submission after 31 January deadline', async () => {
    vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'))

    const res = await submitEcz(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/ecz/submissions',
        body: {
          subjectId: 'sub-1',
          formLevel: 2,
          academicYear: 2025,
        },
      })
    )

    expect(res.status).toBe(400)
    const json = await parseJson(res)
    expect(json.error).toMatch(/31 January/i)
  })
})

describe('GET /api/ecz/submissions deadline', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-01T12:00:00.000Z'))
    authMiddleware.mockResolvedValue({ isAuthenticated: true, user: hodUser })
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns deadline status with Jan 31 date', async () => {
    const res = await getEczDeadline(
      buildRequest({
        url: 'http://localhost:3000/api/ecz/submissions?academicYear=2025',
      })
    )

    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.academicYear).toBe(2025)
    expect(json.deadline).toBe('2026-01-31')
    expect(json.daysRemaining).toBeGreaterThan(0)
  })
})
