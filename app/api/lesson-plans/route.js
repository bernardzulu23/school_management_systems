import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const dynamic = 'force-dynamic'

function normalize(v) {
  return String(v || '').trim()
}

function parseGradeCategory(grade) {
  const raw = String(grade || '')
    .trim()
    .toLowerCase()
  const m = raw.match(/grade\s*(\d{1,2})/)
  if (m) {
    const n = Number(m[1])
    if (n >= 1 && n <= 7) return 'primary'
    return 'secondary'
  }
  if (raw.startsWith('form')) return 'secondary'
  return 'secondary'
}

async function resolveReviewerUserId({ schoolId, teacherUserId, grade }) {
  const category = parseGradeCategory(grade)

  if (category === 'primary') {
    const primaryHod = await prisma.headOfDepartment.findFirst({
      where: {
        schoolId,
        OR: [
          { department: { contains: 'primary', mode: 'insensitive' } },
          { department: { contains: 'lower', mode: 'insensitive' } },
          { department: { contains: 'basic', mode: 'insensitive' } },
          { departmentRef: { name: { contains: 'primary', mode: 'insensitive' } } },
          { departmentRef: { name: { contains: 'lower', mode: 'insensitive' } } },
          { departmentRef: { name: { contains: 'basic', mode: 'insensitive' } } },
        ],
      },
      select: { userId: true },
    })
    if (primaryHod?.userId) return primaryHod.userId
  }

  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId: teacherUserId },
    select: {
      department: true,
      departments: { select: { departmentId: true, department: { select: { name: true } } } },
    },
  })

  const deptId = teacher?.departments?.[0]?.departmentId || null
  const deptName = teacher?.departments?.[0]?.department?.name || teacher?.department || null

  const hod = await prisma.headOfDepartment.findFirst({
    where: {
      schoolId,
      OR: [
        ...(deptId ? [{ departmentId: deptId }] : []),
        ...(deptName
          ? [
              { department: { equals: String(deptName), mode: 'insensitive' } },
              { departmentRef: { name: { equals: String(deptName), mode: 'insensitive' } } },
              { department: { contains: String(deptName), mode: 'insensitive' } },
              { departmentRef: { name: { contains: String(deptName), mode: 'insensitive' } } },
            ]
          : []),
      ],
    },
    select: { userId: true },
  })
  if (hod?.userId) return hod.userId

  const head = await prisma.user.findFirst({
    where: {
      schoolId,
      role: { in: ['headteacher', 'HEADTEACHER', 'admin', 'ADMIN'] },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  return head?.id || null
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const scope = normalize(searchParams.get('scope')) || ''
  const status = normalize(searchParams.get('status')) || ''

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const role = String(auth.user?.role || '').toLowerCase()

  const wantsMine = scope.toLowerCase() === 'mine' || role === 'teacher'
  const wantsReview = scope.toLowerCase() === 'review' || role === 'hod'

  if (!wantsMine && !wantsReview && !roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const where = { schoolId }

  if (wantsMine) where.createdByUserId = userId
  if (wantsReview) where.reviewerUserId = userId

  if (status) where.status = status.toUpperCase()

  const plans = await prisma.lessonPlan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      status: true,
      grade: true,
      subject: true,
      topic: true,
      templateType: true,
      createdAt: true,
      submittedAt: true,
      approvedAt: true,
      rejectedAt: true,
      rejectionReason: true,
      createdBy: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ success: true, data: { plans } })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const body = await request.json().catch(() => ({}))
  const grade = normalize(body?.grade)
  const subject = normalize(body?.subject)
  const topic = normalize(body?.topic)
  const content = normalize(body?.content)
  const templateType = normalize(body?.templateType) || null

  if (!grade || !subject || !topic || !content) {
    throw new ApiError('grade, subject, topic and content are required', 400)
  }

  const reviewerUserId = await resolveReviewerUserId({ schoolId, teacherUserId: userId, grade })
  if (!reviewerUserId) {
    throw new ApiError('No reviewer found for this lesson plan', 400)
  }

  const now = new Date()

  const plan = await prisma.lessonPlan.create({
    data: {
      schoolId,
      createdByUserId: userId,
      reviewerUserId,
      status: 'SUBMITTED',
      grade,
      subject,
      topic,
      templateType,
      content,
      submittedAt: now,
    },
    select: {
      id: true,
      reviewerUserId: true,
      createdByUserId: true,
      grade: true,
      subject: true,
      topic: true,
      status: true,
      createdAt: true,
    },
  })

  await prisma.timetableNotification.create({
    data: {
      schoolId,
      fromUserId: userId,
      toUserId: reviewerUserId,
      type: 'lesson_plan',
      title: 'New Lesson Plan Submitted',
      message: `${plan.subject} • ${plan.grade} • ${plan.topic}`,
      meta: { lessonPlanId: plan.id, grade: plan.grade, subject: plan.subject, topic: plan.topic },
    },
  })

  return NextResponse.json({ success: true, data: plan })
})
