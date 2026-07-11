import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import {
  parseTermNumber,
  recalculateTeacherPerformanceSummary,
  RETEACH_THRESHOLD,
} from '@/lib/teaching/performanceSummary'

export const dynamic = 'force-dynamic'

const PostSchema = z.object({
  classId: z.string().min(1),
  topicName: z.string().min(1).max(200),
  score: z.number().min(0).max(100),
  studentCount: z.number().int().min(1).optional().default(1),
  teacherId: z.string().optional(),
  schemeId: z.string().optional(),
  term: z.union([z.string(), z.number()]).optional(),
  academicYear: z.number().int().optional(),
})

export const GET = withErrorHandler(async function GET(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('classId')
  const isAdmin = roleCheck(user, ['ADMIN', 'headteacher', 'HOD', 'hod'])
  const teacherIdParam = searchParams.get('teacherId')
  const teacherId = isAdmin && teacherIdParam ? teacherIdParam : String(user.id)

  const rows = await prisma.topicMastery.findMany({
    where: {
      schoolId,
      teacherId,
      ...(classId ? { classId } : {}),
    },
    orderBy: { averageMasteryScore: 'asc' },
  })

  return NextResponse.json({ mastery: rows })
})

export const POST = withErrorHandler(async function POST(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (
    !roleCheck(user, [
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
      'STUDENT',
      'student',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = PostSchema.parse(await request.json().catch(() => null))

  const classRow = await prisma.class.findFirst({
    where: { id: body.classId, schoolId },
    select: { id: true, teacherId: true },
  })
  if (!classRow) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  let teacherId = body.teacherId || String(user.id)
  if (roleCheck(user, ['STUDENT', 'student'])) {
    // Prefer assignment teacher when students post; fall back to class teacher user id via Teacher profile
    if (body.teacherId) {
      teacherId = body.teacherId
    } else if (classRow.teacherId) {
      const teacherProfile = await prisma.teacher.findFirst({
        where: { id: classRow.teacherId, schoolId },
        select: { userId: true },
      })
      if (teacherProfile?.userId) teacherId = teacherProfile.userId
      else return NextResponse.json({ error: 'Teacher context required' }, { status: 400 })
    } else {
      return NextResponse.json({ error: 'Teacher context required' }, { status: 400 })
    }
  }

  const existing = await prisma.topicMastery.findUnique({
    where: {
      schoolId_classId_topicName: {
        schoolId,
        classId: body.classId,
        topicName: body.topicName,
      },
    },
  })

  const assessmentCount = (existing?.assessmentCount ?? 0) + 1
  const prevWeight = existing?.assessmentCount ?? 0
  const averageMasteryScore =
    prevWeight === 0
      ? body.score
      : (existing!.averageMasteryScore * prevWeight + body.score) / assessmentCount

  const needsReteaching = averageMasteryScore < RETEACH_THRESHOLD

  const mastery = await prisma.topicMastery.upsert({
    where: {
      schoolId_classId_topicName: {
        schoolId,
        classId: body.classId,
        topicName: body.topicName,
      },
    },
    create: {
      schoolId,
      teacherId,
      classId: body.classId,
      topicName: body.topicName,
      averageMasteryScore,
      studentCount: body.studentCount,
      assessmentCount: 1,
      needsReteaching,
      lastAssessedAt: new Date(),
      schemeId: body.schemeId ?? null,
    },
    update: {
      teacherId,
      averageMasteryScore,
      studentCount: Math.max(body.studentCount, existing?.studentCount ?? 0),
      assessmentCount,
      needsReteaching,
      lastAssessedAt: new Date(),
      schemeId: body.schemeId ?? undefined,
    },
  })

  const year = body.academicYear || new Date().getFullYear()
  const term = parseTermNumber(
    body.term ?? (new Date().getMonth() < 5 ? 1 : new Date().getMonth() < 9 ? 2 : 3)
  )

  await recalculateTeacherPerformanceSummary({
    schoolId,
    teacherId,
    term,
    academicYear: year,
  })

  const allTopics = await prisma.topicMastery.findMany({
    where: { schoolId, teacherId },
    select: { averageMasteryScore: true, needsReteaching: true },
  })
  const averageMastery =
    allTopics.length === 0
      ? 0
      : allTopics.reduce((sum, t) => sum + t.averageMasteryScore, 0) / allTopics.length
  const topicsNeedingReteach = allTopics.filter((t) => t.needsReteaching).length

  return NextResponse.json({
    success: true,
    mastery,
    summary: {
      averageMastery,
      topicsNeedingReteach,
    },
  })
})
