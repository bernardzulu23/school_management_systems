export const dynamic = 'force-dynamic'
// app/api/timetable/notifications/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'

// GET — fetch all timetable notifications for the logged-in user
export async function GET(req) {
  const auth = await authMiddleware(req)
  if (!auth.isAuthenticated) return auth.response

  const user = auth.user
  const schoolId = user.schoolId || (await getSchoolIdFromRequest(req))
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

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
}

// POST — mark notification as read
export async function POST(req) {
  const auth = await authMiddleware(req)
  if (!auth.isAuthenticated) return auth.response

  const user = auth.user
  const schoolId = user.schoolId || (await getSchoolIdFromRequest(req))
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const { id, all = false } = await req.json()

  if (all) {
    await prisma.timetableNotification.updateMany({
      where: { schoolId, toUserId: user.id, read: false },
      data: { read: true, readAt: new Date() },
    })
  } else if (id) {
    await prisma.timetableNotification.updateMany({
      where: { schoolId, id, toUserId: user.id },
      data: { read: true, readAt: new Date() },
    })
  }

  return NextResponse.json({ success: true })
}
