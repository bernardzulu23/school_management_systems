import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import {
  parseTermNumber,
  recalculateTeacherPerformanceSummary,
  weeksFromSchemeJson,
} from '@/lib/teaching/performanceSummary'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  schemeId: z.string().min(1),
  weekNumber: z.number().int().min(1).max(20),
  completed: z.boolean().optional().default(true),
  notes: z.string().max(2000).optional(),
})

export const POST = withErrorHandler(async function POST(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = BodySchema.parse(await request.json().catch(() => null))

  const scheme = await prisma.schemeOfWork.findFirst({
    where: { id: body.schemeId, schoolId },
  })
  if (!scheme) return NextResponse.json({ error: 'Scheme not found' }, { status: 404 })

  const isOwner = scheme.teacherId === String(user.id)
  const isAdmin = roleCheck(user, ['ADMIN', 'headteacher', 'HOD', 'hod'])
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const weekRows = weeksFromSchemeJson(scheme.weeks)
  const weekRow = weekRows.find((w) => w.week === body.weekNumber)
  if (!weekRow && body.weekNumber > weekRows.length) {
    return NextResponse.json({ error: 'Week not in scheme' }, { status: 400 })
  }

  const progress = await prisma.schemeProgress.upsert({
    where: {
      schemeId_weekNumber: { schemeId: body.schemeId, weekNumber: body.weekNumber },
    },
    create: {
      schoolId,
      schemeId: body.schemeId,
      teacherId: scheme.teacherId,
      weekNumber: body.weekNumber,
      topicName: weekRow?.topic ?? null,
      completed: body.completed,
      completedAt: body.completed ? new Date() : null,
      notes: body.notes ?? null,
    },
    update: {
      completed: body.completed,
      completedAt: body.completed ? new Date() : null,
      notes: body.notes ?? undefined,
      topicName: weekRow?.topic ?? undefined,
    },
  })

  await recalculateTeacherPerformanceSummary({
    schoolId,
    teacherId: scheme.teacherId,
    term: parseTermNumber(scheme.term),
    academicYear: scheme.year,
  })

  const completedWeeks = await prisma.schemeProgress.count({
    where: { schemeId: body.schemeId, completed: true },
  })
  const totalWeeks = weekRows.length || 1

  return NextResponse.json({
    success: true,
    progress: {
      ...progress,
      status: progress.completed ? 'COMPLETED' : 'NOT_STARTED',
    },
    coveragePercent: Math.round((completedWeeks / totalWeeks) * 100),
    completedWeeks,
    totalWeeks,
  })
})
