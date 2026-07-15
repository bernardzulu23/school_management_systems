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
import { weekKindFromRow, type TestScheduleLike } from '@/lib/teaching/testWeeks'

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
    include: { testSchedule: true },
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

  const schedule = scheme.testSchedule as TestScheduleLike | null
  const kind = weekKindFromRow(body.weekNumber, weekRow?.weekType, schedule)
  if (kind !== 'teaching') {
    return NextResponse.json(
      {
        error:
          'This is a mid-term / end-of-term test week — no teaching to mark. Coverage excludes test weeks.',
      },
      { status: 400 }
    )
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

  const teachableWeeks = weekRows.filter(
    (w) => weekKindFromRow(w.week, w.weekType, schedule) === 'teaching'
  )
  const teachableSet = new Set(teachableWeeks.map((w) => w.week))
  const progressDone = await prisma.schemeProgress.findMany({
    where: { schemeId: body.schemeId, schoolId, completed: true },
    select: { weekNumber: true },
  })
  const completedWeeks = progressDone.filter((p) => teachableSet.has(p.weekNumber)).length
  const totalWeeks = teachableWeeks.length || 0

  if (body.completed) {
    const { notifySchemeProgressUpdate } = await import('@/lib/notifications/integrations')
    await notifySchemeProgressUpdate({
      schoolId,
      teacherId: scheme.teacherId,
      subject: scheme.subject,
      gradeOrForm: scheme.gradeOrForm,
      completedWeeks,
      totalWeeks,
      weekNumber: body.weekNumber,
      topicName: weekRow?.topic ?? null,
    })
  }

  return NextResponse.json({
    success: true,
    progress: {
      ...progress,
      status: progress.completed ? 'COMPLETED' : 'NOT_STARTED',
    },
    coveragePercent: totalWeeks === 0 ? 100 : Math.round((completedWeeks / totalWeeks) * 100),
    completedWeeks,
    totalWeeks,
  })
})
