export const dynamic = 'force-dynamic'
// app/api/timetable/notifications/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { safeStringId } from '@/lib/security/safeQueryValue'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

// GET — fetch all timetable notifications for the logged-in user
export const GET = withErrorHandler(async function GET(req) {
  const auth = await authMiddleware(req)
  if (!auth.isAuthenticated) return auth.response

  const user = auth.user
  const tenant = await resolveAuthenticatedSchoolId(req, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const isAdmin = roleCheck(user, ['ADMIN'])

  const notifications = isAdmin
    ? await (async () => {
        const primaryRoles = ['headteacher', 'head teacher', 'head-teacher', 'head_teacher']
        const fallbackRoles = ['admin', 'administrator', 'superadmin']
        const roleOr = (roles) => roles.map((r) => ({ role: { equals: r, mode: 'insensitive' } }))

        const admins = await prisma.user.findMany({
          where: { schoolId, OR: [...roleOr(primaryRoles), ...roleOr(fallbackRoles)] },
          select: { id: true },
        })
        const adminIds = admins.map((a) => a.id)
        const toUserIds = adminIds.length ? adminIds : [user.id]

        return prisma.timetableNotification.findMany({
          where: { schoolId, toUserId: { in: toUserIds } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      })()
    : await prisma.timetableNotification.findMany({
        where: { schoolId, toUserId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

  return NextResponse.json({ notifications })
})

// POST — mark notification as read
export const POST = withErrorHandler(async function POST(req) {
  const auth = await authMiddleware(req)
  if (!auth.isAuthenticated) return auth.response

  const user = auth.user
  const tenant = await resolveAuthenticatedSchoolId(req, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const { id, all = false } = await req.json()

  if (all) {
    await prisma.timetableNotification.updateMany({
      where: { schoolId, toUserId: user.id, read: false },
      data: { read: true, readAt: new Date() },
    })
  } else if (id) {
    const notificationId = safeStringId(id)
    if (!notificationId) {
      return NextResponse.json({ error: 'Invalid notification id' }, { status: 400 })
    }
    await prisma.timetableNotification.updateMany({
      where: { schoolId, id: notificationId, toUserId: user.id },
      data: { read: true, readAt: new Date() },
    })
  }

  return NextResponse.json({ success: true })
})
