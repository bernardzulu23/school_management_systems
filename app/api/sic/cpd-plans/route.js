export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  authorizeDepartmentPlanSubmitter,
  authorizeSicOrHead,
  authorizeSicPortal,
} from '@/lib/sic/routeAuth'
import {
  applyOverdueCpdInactivity,
  minutesDueAtFromMeeting,
  SIC_MINUTES_GRACE_DAYS,
} from '@/lib/sic/sicAccess'
import { z } from 'zod'

const CreatePlanSchema = z.object({
  departmentId: z.string().min(1).max(64),
  title: z.string().trim().min(2).max(200),
  term: z.number().int().min(1).max(3),
  year: z.number().int().min(2020).max(2100),
  meetingDate: z.string().datetime(),
  description: z.string().trim().max(5000).optional().nullable(),
  submit: z.boolean().optional(),
})

const ReviewSchema = z.object({
  action: z.enum(['accept', 'reject']),
  reviewNotes: z.string().trim().max(2000).optional().nullable(),
})

const MinutesSchema = z.object({
  minutes: z.string().trim().min(5).max(20000),
})

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeSicOrHead(request)
  if (!authz.ok) {
    // HOD may list own department plans
    const submitter = await authorizeDepartmentPlanSubmitter(request)
    if (!submitter.ok) return authz.response
    const db = getTenantClient(submitter.schoolId)
    await applyOverdueCpdInactivity(db, submitter.schoolId)
    const plans = await db.sicCpdPlan.findMany({
      where: { submittedById: submitter.auth.user.id },
      orderBy: { meetingDate: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
      },
      take: 100,
    })
    return NextResponse.json({ success: true, data: plans, graceDays: SIC_MINUTES_GRACE_DAYS })
  }

  const db = getTenantClient(authz.schoolId)
  await applyOverdueCpdInactivity(db, authz.schoolId)
  const { searchParams } = new URL(request.url)
  const status = String(searchParams.get('status') || '').trim()

  const plans = await db.sicCpdPlan.findMany({
    where: {
      ...(status ? { status } : {}),
    },
    orderBy: [{ status: 'asc' }, { meetingDate: 'desc' }],
    include: {
      department: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    take: 200,
  })

  return NextResponse.json({ success: true, data: plans, graceDays: SIC_MINUTES_GRACE_DAYS })
})

export const POST = withErrorHandler(async function POST(request) {
  const authz = await authorizeDepartmentPlanSubmitter(request)
  if (!authz.ok) return authz.response

  const body = await request.json().catch(() => null)
  const parsed = CreatePlanSchema.safeParse(body)
  if (!parsed.success) throw new ApiError('Invalid plan data', 400)

  const db = getTenantClient(authz.schoolId)
  const dept = await db.department.findFirst({
    where: { id: parsed.data.departmentId },
    select: { id: true },
  })
  if (!dept) throw new ApiError('Department not found', 404)

  const submit = parsed.data.submit !== false
  const created = await db.sicCpdPlan.create({
    data: {
      schoolId: authz.schoolId,
      departmentId: parsed.data.departmentId,
      title: parsed.data.title,
      term: parsed.data.term,
      year: parsed.data.year,
      meetingDate: new Date(parsed.data.meetingDate),
      description: parsed.data.description || null,
      status: submit ? 'SUBMITTED' : 'DRAFT',
      submittedById: authz.auth.user.id,
      submittedAt: submit ? new Date() : null,
    },
    include: { department: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ success: true, data: created }, { status: 201 })
})

export const PATCH = withErrorHandler(async function PATCH(request) {
  const body = await request.json().catch(() => ({}))
  const planId = String(body?.id || '').trim()
  if (!planId) throw new ApiError('id is required', 400)

  if (body.action === 'accept' || body.action === 'reject') {
    const authz = await authorizeSicPortal(request)
    if (!authz.ok) return authz.response
    const parsed = ReviewSchema.safeParse(body)
    if (!parsed.success) throw new ApiError('Invalid review', 400)

    const db = getTenantClient(authz.schoolId)
    const plan = await db.sicCpdPlan.findFirst({ where: { id: planId } })
    if (!plan) throw new ApiError('Not found', 404)
    if (plan.status !== 'SUBMITTED') throw new ApiError('Plan is not awaiting review', 400)

    const accept = parsed.data.action === 'accept'
    const due = minutesDueAtFromMeeting(plan.meetingDate)
    const updated = await db.sicCpdPlan.update({
      where: { id: planId },
      data: {
        status: accept ? 'ACCEPTED' : 'REJECTED',
        reviewedById: authz.auth.user.id,
        reviewedAt: new Date(),
        reviewNotes: parsed.data.reviewNotes || null,
        minutesDueAt: accept ? due : null,
      },
      include: { department: { select: { id: true, name: true } } },
    })

    if (accept) {
      await db.sicDepartmentStatus.upsert({
        where: {
          schoolId_departmentId: {
            schoolId: plan.schoolId,
            departmentId: plan.departmentId,
          },
        },
        create: {
          schoolId: plan.schoolId,
          departmentId: plan.departmentId,
          inactive: false,
          reason: null,
          relatedPlanId: plan.id,
        },
        update: {
          inactive: false,
          inactiveAt: null,
          reason: null,
          relatedPlanId: plan.id,
        },
      })
    }

    return NextResponse.json({ success: true, data: updated })
  }

  if (body.minutes != null) {
    const authz = await authorizeDepartmentPlanSubmitter(request)
    if (!authz.ok) return authz.response
    const parsed = MinutesSchema.safeParse(body)
    if (!parsed.success) throw new ApiError('Minutes are required', 400)

    const db = getTenantClient(authz.schoolId)
    const plan = await db.sicCpdPlan.findFirst({ where: { id: planId } })
    if (!plan) throw new ApiError('Not found', 404)
    if (!['ACCEPTED', 'INACTIVE'].includes(plan.status)) {
      throw new ApiError('Minutes can only be submitted for accepted plans', 400)
    }

    const updated = await db.sicCpdPlan.update({
      where: { id: planId },
      data: {
        minutes: parsed.data.minutes,
        minutesSubmittedAt: new Date(),
        status: 'ACCEPTED',
        inactiveAt: null,
        inactiveReason: null,
      },
      include: { department: { select: { id: true, name: true } } },
    })

    await db.sicDepartmentStatus.upsert({
      where: {
        schoolId_departmentId: {
          schoolId: plan.schoolId,
          departmentId: plan.departmentId,
        },
      },
      create: {
        schoolId: plan.schoolId,
        departmentId: plan.departmentId,
        inactive: false,
      },
      update: {
        inactive: false,
        inactiveAt: null,
        reason: null,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  }

  throw new ApiError('Unsupported update', 400)
})
