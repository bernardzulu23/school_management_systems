/**
 * Tests for SBA (School-Based Assessment) API and ECZ compliance helpers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as createSbaTask } from '@/app/api/assessments/sba-tasks/route.js'
import { POST as recordSbaScore } from '@/app/api/assessments/sba-scores/route.js'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { mockPrisma } from '../setup.js'
import { buildRequest, parseJson } from '../helpers/request.js'
import {
  validateFormLevelForSBA,
  computeTotalSBAScore,
  getSBASubmissionDeadline,
  SBA_SUBMISSION_DEADLINE_DAY,
  SBA_SUBMISSION_DEADLINE_MONTH,
} from '@/lib/ecz/ecz-compliance'

vi.mock('@/lib/middleware/auth', () => ({
  authMiddleware: vi.fn(),
  roleCheck: vi.fn(() => true),
  ROLE_GROUPS: { SCHOOL_STAFF: ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'] },
}))

vi.mock('@/lib/tenant/resolveSchoolId', () => ({
  resolveAuthenticatedSchoolId: vi.fn(),
}))

vi.mock('@/lib/ecz/ecz-rubric-builder', () => ({
  generateEczRubricCriteria: vi.fn(() => []),
  criteriaToPrismaCreate: vi.fn(() => []),
}))

const schoolId = 'school-1'
const teacher = { id: 'teacher-1', role: 'teacher', schoolId }

const zambianContext =
  'Farmers in Mkushi sell maize at the local market to support their families in Zambia.'

describe('ECZ SBA compliance helpers', () => {
  it('rejects Form 4 for SBA', () => {
    const result = validateFormLevelForSBA(4)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/Form 4/i)
  })

  it('accepts Form 1, 2, and 3', () => {
    expect(validateFormLevelForSBA(1).valid).toBe(true)
    expect(validateFormLevelForSBA(2).valid).toBe(true)
    expect(validateFormLevelForSBA(3).valid).toBe(true)
  })

  it('computes total SBA score capped at 100', () => {
    expect(
      computeTotalSBAScore({
        task1Score: 20,
        task2Score: 20,
        task3Score: 20,
        termTestScore: 40,
      })
    ).toBe(100)
    expect(
      computeTotalSBAScore({
        task1Score: 25,
        task2Score: 25,
        task3Score: 25,
        termTestScore: 50,
      })
    ).toBe(100)
  })

  it('returns 31 January deadline for academic year', () => {
    const deadline = getSBASubmissionDeadline(2025)
    expect(deadline.getFullYear()).toBe(2026)
    expect(deadline.getMonth()).toBe(SBA_SUBMISSION_DEADLINE_MONTH)
    expect(deadline.getDate()).toBe(SBA_SUBMISSION_DEADLINE_DAY)
  })
})

describe('POST /api/assessments/sba-tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMiddleware.mockResolvedValue({ isAuthenticated: true, user: teacher })
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId })
    mockPrisma.subject.findFirst.mockResolvedValue({
      id: 'sub-1',
      schoolId,
      name: 'Mathematics',
    })
    mockPrisma.eczAssessment.create.mockResolvedValue({
      id: 'assess-1',
      title: 'Market Survey',
      subject: { name: 'Mathematics' },
    })
    mockPrisma.eczRubric.create.mockResolvedValue({ id: 'rubric-1' })
  })

  it('creates SBA task for Form 2', async () => {
    const res = await createSbaTask(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/assessments/sba-tasks',
        body: {
          formLevel: 2,
          subjectId: 'sub-1',
          title: 'Market Survey',
          context: zambianContext,
          type: 'Project',
        },
      })
    )

    expect(res.status).toBe(201)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })

  it('returns 400 for Form 4 SBA task', async () => {
    const res = await createSbaTask(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/assessments/sba-tasks',
        body: {
          formLevel: 4,
          subjectId: 'sub-1',
          title: 'Invalid Form 4 Task',
          context: zambianContext,
        },
      })
    )

    expect(res.status).toBe(400)
    const json = await parseJson(res)
    expect(json.error).toMatch(/Form 4/i)
    expect(mockPrisma.eczAssessment.create).not.toHaveBeenCalled()
  })
})

describe('POST /api/assessments/sba-scores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMiddleware.mockResolvedValue({ isAuthenticated: true, user: teacher })
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId })
    mockPrisma.eczAssessment.findFirst.mockResolvedValue({
      id: 'assess-1',
      schoolId,
      subject: { name: 'Mathematics' },
    })
    mockPrisma.student.findFirst.mockResolvedValue({
      id: 'student-1',
      schoolId,
      name: 'Learner One',
    })
    mockPrisma.eczAssessmentScore.findUnique.mockResolvedValue(null)
    mockPrisma.eczAssessmentScore.create.mockResolvedValue({
      id: 'score-1',
      totalSBAScore: 60,
      formLevel: 2,
      student: { name: 'Learner One' },
      assessment: { subject: { name: 'Mathematics' } },
    })
  })

  it('records SBA scores for Form 3', async () => {
    const res = await recordSbaScore(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/assessments/sba-scores',
        body: {
          formLevel: 3,
          assessmentId: 'assess-1',
          studentId: 'student-1',
          taskNumber: 1,
          score: 18,
          academicYear: 2025,
        },
      })
    )

    expect(res.status).toBe(201)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.data.totalSBAScore).toBeDefined()
  })

  it('rejects Form 4 score entry', async () => {
    const res = await recordSbaScore(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/assessments/sba-scores',
        body: {
          formLevel: 4,
          assessmentId: 'assess-1',
          studentId: 'student-1',
          taskNumber: 1,
          score: 10,
        },
      })
    )

    expect(res.status).toBe(400)
    expect(mockPrisma.eczAssessmentScore.create).not.toHaveBeenCalled()
  })
})
