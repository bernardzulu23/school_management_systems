// app/api/timetable/allocations/[id]/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export async function DELETE(req, { params }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid allocation id' }, { status: 400 })

  const result = await prisma.teacherAllocation.deleteMany({
    where: { id, schoolId },
  })
  if (result.count === 0) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}
