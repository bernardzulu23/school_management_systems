// app/api/timetable/config/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'

export async function POST(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { startTime, endTime, singleDuration, workingDays, breakSlots } = await req.json()

  const config = await prisma.timetableConfig.upsert({
    where: { schoolId },
    update: { startTime, endTime, singleDuration, workingDays, breakSlots },
    create: { schoolId, startTime, endTime, singleDuration, workingDays, breakSlots },
  })

  return NextResponse.json({ config, success: true })
}
