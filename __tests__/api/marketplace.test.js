/**
 * Marketplace API + privacy tests (Task 29).
 *
 * Verifies:
 *  - Privacy mappers never leak schoolId/teacher identity (author only when opted in).
 *  - Browse returns approved materials only, privacy-safe.
 *  - Submit refuses a lesson plan the teacher does not own.
 *  - Review is tenant-isolated (another school's submission is not found).
 *  - Download copies the material into the downloader's own school.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as jose from 'jose'
import { mockPrisma } from '../setup.js'
import { buildRequest } from '../helpers/request.js'
import { toPublicListing, toPublicDetail } from '@/lib/marketplace'

const SCHOOL_A = 'school-a-id'
const SCHOOL_B = 'school-b-id'

async function teacherToken(schoolId = SCHOOL_A, role = 'teacher', id = 'teacher-1') {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  return new jose.SignJWT({ id, email: 't@test.local', role, schoolId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .setAudience('zsms-api')
    .sign(secret)
}

function authedRequest({ url, method = 'GET', body, token, params }) {
  const req = buildRequest({ url, method, body, cookies: token ? { access_token: token } : {} })
  return req
}

beforeEach(() => {
  vi.clearAllMocks()
  // resolveAuthenticatedSchoolId: the DB user belongs to SCHOOL_A and is active.
  mockPrisma.user.findUnique.mockResolvedValue({
    id: 'teacher-1',
    schoolId: SCHOOL_A,
    school: { id: SCHOOL_A, active: true, subdomain: 'school-a' },
  })
  // School with an active subscription (satisfies the subscription gate in
  // withErrorHandler) and a province (used by submit).
  mockPrisma.school.findUnique.mockResolvedValue({
    id: SCHOOL_A,
    active: true,
    plan: 'premium',
    planExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    trialEndsAt: null,
    province: 'Lusaka',
  })
})

describe('privacy mappers', () => {
  const row = {
    id: 'm1',
    schoolId: SCHOOL_A,
    teacherId: 'teacher-1',
    teacher: { name: 'Mr. Banda' },
    type: 'lesson_plan',
    title: 'Algebra Basics',
    subject: 'Mathematics',
    form: 'Form 1',
    topic: 'Linear equations',
    province: 'Lusaka',
    showAuthorName: false,
    rating: 4.5,
    ratingCount: 2,
    downloadCount: 7,
    content: { content: 'secret body' },
  }

  it('never exposes schoolId or teacherId', () => {
    const out = toPublicListing(row)
    expect(out.schoolId).toBeUndefined()
    expect(out.teacherId).toBeUndefined()
    expect(out.province).toBe('Lusaka')
  })

  it('hides author name unless opted in', () => {
    expect(toPublicListing(row).author).toBeNull()
    expect(toPublicListing({ ...row, showAuthorName: true }).author).toBe('Mr. Banda')
  })

  it('detail adds content but stays privacy-safe', () => {
    const out = toPublicDetail(row)
    expect(out.content).toEqual({ content: 'secret body' })
    expect(out.schoolId).toBeUndefined()
  })
})

describe('GET /api/marketplace (public browse)', () => {
  it('queries approved materials only and returns privacy-safe items', async () => {
    const { GET } = await import('@/app/api/marketplace/route.js')
    mockPrisma.sharedMaterial.count.mockResolvedValue(1)
    mockPrisma.sharedMaterial.findMany.mockResolvedValue([
      {
        id: 'm1',
        schoolId: SCHOOL_A,
        teacherId: 'teacher-1',
        teacher: { name: 'Mr. Banda' },
        type: 'lesson_plan',
        title: 'Algebra',
        subject: 'Mathematics',
        form: 'Form 1',
        topic: 'Equations',
        province: 'Lusaka',
        showAuthorName: false,
        rating: null,
        ratingCount: 0,
        downloadCount: 0,
        createdAt: new Date(),
      },
    ])

    const res = await GET(
      authedRequest({ url: 'http://localhost:3000/api/marketplace?subject=Mathematics' })
    )
    const body = await res.json()

    expect(mockPrisma.sharedMaterial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'approved' }) })
    )
    expect(body.success).toBe(true)
    expect(body.data.items[0].schoolId).toBeUndefined()
    expect(body.data.items[0].author).toBeNull()
  })
})

describe('POST /api/marketplace/submit', () => {
  it('refuses a lesson plan the teacher does not own', async () => {
    const { POST } = await import('@/app/api/marketplace/submit/route.js')
    mockPrisma.lessonPlan.findFirst.mockResolvedValue(null)

    const res = await POST(
      authedRequest({
        url: 'http://localhost:3000/api/marketplace/submit',
        method: 'POST',
        body: { lessonPlanId: 'plan-x' },
        token: await teacherToken(),
      })
    )
    expect(res.status).toBe(404)
  })

  it('creates a pending submission for an owned plan', async () => {
    const { POST } = await import('@/app/api/marketplace/submit/route.js')
    mockPrisma.lessonPlan.findFirst.mockResolvedValue({
      id: 'plan-1',
      schoolId: SCHOOL_A,
      createdByUserId: 'teacher-1',
      grade: 'Form 1',
      subject: 'Mathematics',
      topic: 'Equations',
      content: 'body',
    })
    mockPrisma.sharedMaterial.findFirst.mockResolvedValue(null)
    mockPrisma.sharedMaterial.create.mockResolvedValue({
      id: 'm1',
      status: 'pending',
      title: 'Mathematics • Equations',
      subject: 'Mathematics',
      form: 'Form 1',
    })
    mockPrisma.user.findFirst.mockResolvedValue(null) // no reviewer to notify

    const res = await POST(
      authedRequest({
        url: 'http://localhost:3000/api/marketplace/submit',
        method: 'POST',
        body: { lessonPlanId: 'plan-1', showAuthorName: true },
        token: await teacherToken(),
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.status).toBe('pending')
    expect(mockPrisma.sharedMaterial.create).toHaveBeenCalled()
  })
})

describe('POST /api/marketplace/:id/review (tenant isolation)', () => {
  it("does not find another school's submission (cross-school review blocked)", async () => {
    const { POST } = await import('@/app/api/marketplace/[id]/review/route.js')
    // The route scopes findFirst by { id, schoolId: SCHOOL_A }; a SCHOOL_B item is not found.
    mockPrisma.sharedMaterial.findFirst.mockResolvedValue(null)

    const res = await POST(
      authedRequest({
        url: 'http://localhost:3000/api/marketplace/m-from-b/review',
        method: 'POST',
        body: { action: 'approve' },
        token: await teacherToken(SCHOOL_A, 'headteacher', 'teacher-1'),
      }),
      { params: Promise.resolve({ id: 'm-from-b' }) }
    )
    expect(res.status).toBe(404)
    expect(mockPrisma.sharedMaterial.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: SCHOOL_A }) })
    )
  })
})

describe('POST /api/marketplace/:id/download', () => {
  it('copies the material into the downloader own school as a DRAFT plan', async () => {
    const { POST } = await import('@/app/api/marketplace/[id]/download/route.js')
    mockPrisma.sharedMaterial.findFirst.mockResolvedValue({
      id: 'm1',
      schoolId: SCHOOL_B,
      type: 'lesson_plan',
      title: 'Algebra',
      subject: 'Mathematics',
      form: 'Form 1',
      topic: 'Equations',
      content: { grade: 'Form 1', subject: 'Mathematics', topic: 'Equations', content: 'body' },
    })
    mockPrisma.lessonPlan.create.mockResolvedValue({
      id: 'new-plan',
      subject: 'Mathematics',
      topic: 'Equations',
      grade: 'Form 1',
      status: 'DRAFT',
    })
    mockPrisma.sharedMaterial.updateMany.mockResolvedValue({ count: 1 })

    const res = await POST(
      authedRequest({
        url: 'http://localhost:3000/api/marketplace/m1/download',
        method: 'POST',
        token: await teacherToken(),
      }),
      { params: Promise.resolve({ id: 'm1' }) }
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.lessonPlanId).toBe('new-plan')
    // Created in the downloader's own school (SCHOOL_A), not the source school.
    expect(mockPrisma.lessonPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ schoolId: SCHOOL_A, status: 'DRAFT' }),
      })
    )
    expect(mockPrisma.sharedMaterial.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { downloadCount: { increment: 1 } } })
    )
  })
})
