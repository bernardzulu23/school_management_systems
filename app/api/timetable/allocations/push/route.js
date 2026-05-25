export const dynamic = 'force-dynamic'
// app/api/timetable/allocations/push/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'

// POST — HOD pushes department allocations to the headteacher
export async function POST(req) {
  const auth = await authMiddleware(req)
  if (!auth.isAuthenticated) return auth.response

  const user = auth.user
  const tenant = await resolveAuthenticatedSchoolId(req, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const isAdmin = roleCheck(user, ['ADMIN'])
  const hasHodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId: user.id, schoolId },
    select: { id: true },
  })
  const isHod = roleCheck(user, ['HOD', 'hod']) || Boolean(hasHodProfile)
  if (!isAdmin && !isHod) {
    return NextResponse.json({ error: 'HOD role required' }, { status: 403 })
  }

  const { term, academicYear, allocationIds } = await req.json()

  if (!term || !academicYear) {
    return NextResponse.json({ error: 'term and academicYear required' }, { status: 400 })
  }

  if (!isHod && !(allocationIds?.length > 0)) {
    return NextResponse.json({ error: 'allocationIds required for non-HOD users' }, { status: 400 })
  }

  // Fetch allocations to push — either specific IDs or all draft for this HOD
  const where = {
    schoolId,
    status: 'draft',
    term,
    academicYear,
    ...(allocationIds?.length ? { id: { in: allocationIds } } : isHod ? { hodId: user.id } : {}),
  }

  const allocations = await prisma.teacherAllocation.findMany({
    where,
    include: {
      teacher: { select: { name: true } },
      subject: { select: { name: true } },
      class: { select: { name: true } },
      hod: {
        select: { name: true, hodProfile: { select: { department: true } } },
      },
    },
  })

  if (allocations.length === 0) {
    return NextResponse.json({ error: 'No draft allocations found to push' }, { status: 400 })
  }

  const sender = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true },
  })
  const senderName =
    [sender?.name, sender?.email, user?.email, user?.name]
      .map((v) => String(v || '').trim())
      .find(Boolean) || 'HOD'

  const department = allocations[0]?.hod?.hodProfile?.department || senderName
  const totalPeriods = allocations.reduce((s, a) => s + a.periodsPerWeek, 0)
  const teacherNames = [...new Set(allocations.map((a) => a.teacher.name))].join(', ')

  const primaryRoles = ['headteacher', 'head teacher', 'head-teacher', 'head_teacher']
  const fallbackRoles = ['admin', 'administrator', 'superadmin']

  const roleOr = (roles) => roles.map((r) => ({ role: { equals: r, mode: 'insensitive' } }))

  let recipients = await prisma.user.findMany({
    where: { schoolId, OR: roleOr(primaryRoles) },
    select: { id: true, name: true, role: true },
  })

  if (recipients.length === 0) {
    recipients = await prisma.user.findMany({
      where: { schoolId, OR: roleOr(fallbackRoles) },
      select: { id: true, name: true, role: true },
    })
  }

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: 'No headteacher/admin account found for this school' },
      { status: 404 }
    )
  }

  // Run in transaction: mark allocations as pushed + create notification
  await prisma.$transaction(async (tx) => {
    // 1. Mark all as pushed
    await tx.teacherAllocation.updateMany({
      where: { id: { in: allocations.map((a) => a.id) } },
      data: { status: 'pushed', pushedAt: new Date() },
    })

    // 2. Create notification for headteacher
    const classCount = [...new Set(allocations.map((a) => a.classId))].length
    const teacherCount = [...new Set(allocations.map((a) => a.teacherId))].length
    const subjects = [...new Set(allocations.map((a) => a.subject.name))]
    const allocationIdsMeta = allocations.map((a) => a.id)

    await Promise.all(
      recipients.map((r) =>
        tx.timetableNotification.create({
          data: {
            schoolId,
            fromUserId: user.id,
            toUserId: r.id,
            type: 'HOD_ALLOCATION_PUSHED',
            title: `${department} Department — Class Allocations Ready`,
            message: `${senderName} has submitted ${allocations.length} teaching allocations for ${term} ${academicYear}. ${allocations.length} subjects across ${[...new Set(allocations.map((a) => a.class.name))].length} classes (${totalPeriods} total periods per week). Teachers: ${teacherNames}.`,
            department,
            term,
            read: false,
            meta: {
              allocationIds: allocationIdsMeta,
              academicYear,
              teacherCount,
              classCount,
              totalPeriods,
              hodName: senderName,
              department,
              subjects,
              recipientRole: r.role,
              recipientName: r.name,
            },
          },
        })
      )
    )
  })

  return NextResponse.json({
    success: true,
    message: `${allocations.length} allocations pushed to ${recipients.map((r) => r.name).join(', ')}`,
    pushed: allocations.length,
    notifiedCount: recipients.length,
    notified: recipients.map((r) => ({ id: r.id, name: r.name, role: r.role })),
  })
}
