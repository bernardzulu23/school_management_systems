/**
 * Mock exam submit + percentile tests (Task 32).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as jose from 'jose'
import { mockPrisma } from '../setup.js'
import { buildRequest } from '../helpers/request.js'
import { scoreMockExam } from '@/lib/assessment/auto-scorer'

const SCHOOL = 'school-a'
const STUDENT_USER = 'student-user-1'
const STUDENT_ID = 'student-1'

async function studentToken() {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  return new jose.SignJWT({
    id: STUDENT_USER,
    email: 's@test.local',
    role: 'student',
    schoolId: SCHOOL,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .setAudience('zsms-api')
    .sign(secret)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.user.findUnique.mockResolvedValue({
    id: STUDENT_USER,
    schoolId: SCHOOL,
    school: { id: SCHOOL, active: true, subdomain: 'school-a' },
  })
  mockPrisma.school.findUnique.mockResolvedValue({
    id: SCHOOL,
    active: true,
    plan: 'premium',
    planExpiresAt: new Date(Date.now() + 86400000 * 365),
    trialEndsAt: null,
  })
  mockPrisma.student.findFirst.mockResolvedValue({ id: STUDENT_ID })
})

describe('POST /api/student/mock-exam/[id]/submit', () => {
  const paper = {
    examInfo: {
      subject: 'Math',
      level: 'grade9',
      topic: 'Algebra',
      totalMarks: 4,
      timeAllowed: '2h',
    },
    questions: [
      { id: 'q1', type: 'mcq', question: '2+2?', options: ['3', '4'], marks: 2, answer: '4' },
      { id: 'q2', type: 'short', question: 'Capital?', marks: 2, answer: 'Lusaka' },
    ],
  }

  it('auto-scores and persists attempt', async () => {
    mockPrisma.mockExamAttempt.findFirst.mockResolvedValue({
      id: 'attempt-1',
      schoolId: SCHOOL,
      studentId: STUDENT_ID,
      status: 'in_progress',
      paper,
      subject: 'Mathematics',
      examLevel: 'grade9',
    })

    const scoring = scoreMockExam(paper, { q1: '4', q2: 'Lusaka' })
    mockPrisma.mockExamAttempt.update.mockResolvedValue({
      id: 'attempt-1',
      subject: 'Mathematics',
      examLevel: 'grade9',
      topic: 'Algebra',
      durationMinutes: 120,
      totalMarks: scoring.totalMarks,
      awardedMarks: scoring.awardedMarks,
      percentage: scoring.percentage,
      needsReview: false,
      status: 'graded',
      startedAt: new Date(),
      submittedAt: new Date(),
      gradedAt: new Date(),
    })

    const token = await studentToken()
    const req = buildRequest({
      url: 'http://localhost/api/student/mock-exam/attempt-1/submit',
      method: 'POST',
      body: { answers: { q1: '4', q2: 'Lusaka' } },
      cookies: { access_token: token },
    })

    const { POST } = await import('@/app/api/student/mock-exam/[id]/submit/route.js')
    const res = await POST(req, { params: Promise.resolve({ id: 'attempt-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.scoring.percentage).toBe(100)
    expect(mockPrisma.mockExamAttempt.update).toHaveBeenCalled()
  })

  it('rejects double submit', async () => {
    mockPrisma.mockExamAttempt.findFirst.mockResolvedValue({
      id: 'attempt-1',
      status: 'graded',
      paper,
    })

    const token = await studentToken()
    const req = buildRequest({
      url: 'http://localhost/api/student/mock-exam/attempt-1/submit',
      method: 'POST',
      body: { answers: { q1: '4' } },
      cookies: { access_token: token },
    })

    const { POST } = await import('@/app/api/student/mock-exam/[id]/submit/route.js')
    const res = await POST(req, { params: Promise.resolve({ id: 'attempt-1' }) })
    expect(res.status).toBe(409)
  })
})

describe('GET /api/analytics/national-percentile', () => {
  it('returns aggregated distribution without leaking identities', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { percentage: 55, scoreBucket: 50 },
      { percentage: 75, scoreBucket: 70 },
      { percentage: 85, scoreBucket: 80 },
    ])
    mockPrisma.mockExamAttempt.findFirst.mockResolvedValue({
      percentage: 75,
      subject: 'Mathematics',
      examLevel: 'grade9',
    })

    const token = await studentToken()
    const req = buildRequest({
      url: 'http://localhost/api/analytics/national-percentile?subject=Mathematics&examLevel=grade9&attemptId=attempt-1',
      cookies: { access_token: token },
    })

    const { GET } = await import('@/app/api/analytics/national-percentile/route.js')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.distribution).toBeDefined()
    expect(json.data.studentPercentage).toBe(75)
    expect(json.data.percentile).toBeTypeOf('number')
    expect(json.data).not.toHaveProperty('studentName')
    expect(json.data).not.toHaveProperty('schoolId')
  })
})
