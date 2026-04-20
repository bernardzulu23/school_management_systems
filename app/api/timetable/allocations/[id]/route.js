// app/api/timetable/allocations/[id]/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'

export async function DELETE(req, { params }) {
  const schoolId = await getSchoolIdFromRequest(req)
  const user = await getAuthUser(req)
  if (!user || !schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.teacherAllocation.delete({ where: { id, schoolId } })
  return NextResponse.json({ success: true })
}
