export const dynamic = 'force-dynamic'
// app/api/timetable/publish/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'

export async function POST(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { term, academicYear } = await req.json()

  await prisma.$transaction(async (tx) => {
    // 1. Mark entries as published
    await tx.timetableAllocationEntry.updateMany({
      where: { schoolId, term, academicYear, status: 'draft' },
      data: { status: 'published', publishedAt: new Date() },
    })

    // 2. Mark allocations as scheduled
    const entries = await tx.timetableAllocationEntry.findMany({
      where: { schoolId, term, academicYear, status: 'published' },
      select: { allocationId: true },
    })
    const allocationIds = [...new Set(entries.map((e) => e.allocationId))]

    await tx.teacherAllocation.updateMany({
      where: { id: { in: allocationIds } },
      data: { status: 'scheduled' },
    })
  })

  return NextResponse.json({ success: true, message: 'Timetable published' })
}
