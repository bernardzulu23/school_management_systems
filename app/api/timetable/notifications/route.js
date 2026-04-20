// app/api/timetable/notifications/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'

// GET — fetch all timetable notifications for the logged-in user
export async function GET(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await prisma.timetableNotification.findMany({
    where: { schoolId, toUserId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ notifications })
}

// POST — mark notification as read
export async function POST(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, all = false } = await req.json()

  if (all) {
    await prisma.timetableNotification.updateMany({
      where: { schoolId, toUserId: user.id, read: false },
      data: { read: true, readAt: new Date() },
    })
  } else if (id) {
    await prisma.timetableNotification.update({
      where: { id, toUserId: user.id },
      data: { read: true, readAt: new Date() },
    })
  }

  return NextResponse.json({ success: true })
}
