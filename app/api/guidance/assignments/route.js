export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  authorizeGuidanceAssignmentAdmin,
  authorizeGuidanceAssignmentRead,
} from '@/lib/guidance/routeAuth'
import { normalizeGuidanceScope } from '@/lib/guidance/guidanceAccess'
import { safeStringId } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeGuidanceAssignmentRead(request)
  if (!authz.ok) return authz.response

  const { schoolId, isHead } = authz

  if (isHead) {
    const assignments = await prisma.guidanceAssignment.findMany({
      where: { schoolId, active: true, revokedAt: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            teacherProfile: { select: { id: true, department: true } },
          },
        },
        assignedBy: { select: { id: true, name: true } },
      },
      orderBy: { assignedAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ success: true, data: assignments })
  }

  return NextResponse.json({ success: true, data: [authz.assignment] })
})

export const POST = withErrorHandler(async function POST(request) {
  const authz = await authorizeGuidanceAssignmentAdmin(request)
  if (!authz.ok) return authz.response

  const { auth, schoolId } = authz
  const body = await request.json().catch(() => ({}))
  const teacherId = safeStringId(body?.teacherId)
  const scope = normalizeGuidanceScope(body?.scope)
  const canManageReEntry = Boolean(body?.canManageReEntry)

  if (!teacherId) throw new ApiError('teacherId is required', 400)

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    select: { id: true, userId: true, user: { select: { id: true, name: true, role: true } } },
  })
  if (!teacher?.userId) throw new ApiError('Teacher not found', 404)

  const existing = await prisma.guidanceAssignment.findUnique({
    where: { userId: teacher.userId },
    select: { id: true, schoolId: true, active: true },
  })

  if (existing && existing.schoolId !== schoolId) {
    throw new ApiError('This teacher already has a guidance assignment at another school', 409)
  }

  const assignment = await prisma.guidanceAssignment.upsert({
    where: { userId: teacher.userId },
    create: {
      schoolId,
      userId: teacher.userId,
      scope,
      canManageReEntry,
      assignedById: auth.user.id,
      active: true,
      revokedAt: null,
    },
    update: {
      schoolId,
      scope,
      canManageReEntry,
      assignedById: auth.user.id,
      active: true,
      revokedAt: null,
      assignedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          teacherProfile: { select: { id: true, department: true } },
        },
      },
      assignedBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ success: true, data: assignment }, { status: 201 })
})
