export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  authorizeSeniorTeacherAccess,
  authorizeSeniorTeacherAdmin,
} from '@/lib/senior-teacher/seniorTeacherAccess'
import { safeStringId } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request) {
  const admin = await authorizeSeniorTeacherAdmin(request)
  if (admin.ok) {
    const assignments = await prisma.seniorTeacherAssignment.findMany({
      where: { schoolId: admin.schoolId, active: true, revokedAt: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            teacherProfile: { select: { id: true, department: true, specialization: true } },
          },
        },
        assignedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ assignedAt: 'desc' }],
      take: 100,
    })
    return NextResponse.json({ success: true, data: assignments })
  }

  const authz = await authorizeSeniorTeacherAccess(request)
  if (!authz.ok) return authz.response

  return NextResponse.json({
    success: true,
    data: authz.assignment ? [authz.assignment] : [],
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const authz = await authorizeSeniorTeacherAdmin(request)
  if (!authz.ok) return authz.response

  const body = await request.json().catch(() => ({}))
  const teacherId = safeStringId(body?.teacherId)
  if (!teacherId) throw new ApiError('teacherId is required', 400)

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId: authz.schoolId },
    select: {
      id: true,
      userId: true,
      user: { select: { id: true, role: true, name: true, email: true } },
    },
  })
  if (!teacher?.userId) throw new ApiError('Teacher not found', 404)

  const assignment = await prisma.seniorTeacherAssignment.upsert({
    where: { userId: teacher.userId },
    create: {
      schoolId: authz.schoolId,
      userId: teacher.userId,
      assignedById: authz.auth.user.id,
      active: true,
      revokedAt: null,
    },
    update: {
      schoolId: authz.schoolId,
      assignedById: authz.auth.user.id,
      assignedAt: new Date(),
      active: true,
      revokedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          teacherProfile: { select: { id: true, department: true, specialization: true } },
        },
      },
      assignedBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ success: true, data: assignment }, { status: 201 })
})

export const DELETE = withErrorHandler(async function DELETE(request) {
  const authz = await authorizeSeniorTeacherAdmin(request)
  if (!authz.ok) return authz.response

  const body = await request.json().catch(() => ({}))
  const assignmentId = safeStringId(body?.assignmentId)
  if (!assignmentId) throw new ApiError('assignmentId is required', 400)

  const existing = await prisma.seniorTeacherAssignment.findFirst({
    where: { id: assignmentId, schoolId: authz.schoolId, active: true, revokedAt: null },
    select: { id: true },
  })
  if (!existing) throw new ApiError('Senior Teacher assignment not found', 404)

  const revoked = await prisma.seniorTeacherAssignment.update({
    where: { id: assignmentId },
    data: {
      active: false,
      revokedAt: new Date(),
      assignedById: authz.auth.user.id,
    },
    select: { id: true, active: true, revokedAt: true },
  })

  return NextResponse.json({ success: true, data: revoked })
})
