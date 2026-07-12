import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { endOfTermWeeksFromSchedule, midTermWeeksFromSchedule } from '@/lib/teaching/testWeeks'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  schemeId: z.string().min(1),
  midTermWeek: z.number().int().min(1).max(20).nullable().optional(),
  midTermWeekEnd: z.number().int().min(1).max(20).nullable().optional(),
  endOfTermWeek: z.number().int().min(1).max(20).nullable().optional(),
  endOfTermWeekEnd: z.number().int().min(1).max(20).nullable().optional(),
  midTermDate: z.string().datetime().nullable().optional(),
  endOfTermDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).optional(),
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

  const schemeId = new URL(request.url).searchParams.get('schemeId')
  if (!schemeId) return NextResponse.json({ error: 'schemeId required' }, { status: 400 })

  const schedule = await prisma.schemeTestSchedule.findFirst({
    where: { schoolId, schemeId },
  })

  return NextResponse.json({ schedule })
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

  const midEnd =
    body.midTermWeekEnd != null
      ? body.midTermWeekEnd
      : body.midTermWeek != null
        ? body.midTermWeek
        : null
  const eotEnd =
    body.endOfTermWeekEnd != null
      ? body.endOfTermWeekEnd
      : body.endOfTermWeek != null
        ? body.endOfTermWeek
        : null

  const schedule = await prisma.schemeTestSchedule.upsert({
    where: { schemeId: body.schemeId },
    create: {
      schoolId,
      schemeId: body.schemeId,
      teacherId: scheme.teacherId,
      midTermWeek: body.midTermWeek ?? null,
      midTermWeekEnd: midEnd,
      endOfTermWeek: body.endOfTermWeek ?? null,
      endOfTermWeekEnd: eotEnd,
      midTermDate: body.midTermDate ? new Date(body.midTermDate) : null,
      endOfTermDate: body.endOfTermDate ? new Date(body.endOfTermDate) : null,
      notes: body.notes ?? null,
    },
    update: {
      midTermWeek: body.midTermWeek ?? undefined,
      midTermWeekEnd: body.midTermWeekEnd !== undefined ? midEnd : undefined,
      endOfTermWeek: body.endOfTermWeek ?? undefined,
      endOfTermWeekEnd: body.endOfTermWeekEnd !== undefined ? eotEnd : undefined,
      midTermDate:
        body.midTermDate === null
          ? null
          : body.midTermDate
            ? new Date(body.midTermDate)
            : undefined,
      endOfTermDate:
        body.endOfTermDate === null
          ? null
          : body.endOfTermDate
            ? new Date(body.endOfTermDate)
            : undefined,
      notes: body.notes ?? undefined,
    },
  })

  const midWeeks = midTermWeeksFromSchedule(schedule)
  const eotWeeks = endOfTermWeeksFromSchedule(schedule)
  const schedules = [
    ...midWeeks.map((w) => ({
      id: `${schedule.id}-mid-${w}`,
      testType: 'MID_TERM' as const,
      scheduledWeek: w,
      scheduledWeeks: midWeeks,
      schemeId: schedule.schemeId,
    })),
    ...eotWeeks.map((w) => ({
      id: `${schedule.id}-eot-${w}`,
      testType: 'END_OF_TERM' as const,
      scheduledWeek: w,
      scheduledWeeks: eotWeeks,
      schemeId: schedule.schemeId,
    })),
  ]

  return NextResponse.json({ success: true, schedule, schedules })
})
