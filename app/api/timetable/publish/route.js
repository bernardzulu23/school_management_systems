export const dynamic = 'force-dynamic'
// app/api/timetable/publish/route.js
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'

export async function POST(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const role = String(user.role || '').toLowerCase()
  if (!['headteacher', 'administrator', 'admin', 'superadmin'].includes(role)) {
    return NextResponse.json(
      { error: 'Only school administrators can publish the master timetable' },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const term = String(body?.term || 'Term 1').trim()
  const academicYear = String(body?.academicYear || new Date().getFullYear()).trim()

  const draftCount = await prisma.timetableAllocationEntry.count({
    where: { schoolId, term, academicYear, status: 'draft' },
  })

  if (draftCount === 0) {
    return NextResponse.json(
      {
        error:
          'No draft timetable to publish. Generate a timetable and save the draft to the database first.',
      },
      { status: 400 }
    )
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.timetableAllocationEntry.updateMany({
      where: { schoolId, term, academicYear, status: 'draft' },
      data: { status: 'published', publishedAt: new Date() },
    })

    const entries = await tx.timetableAllocationEntry.findMany({
      where: { schoolId, term, academicYear, status: 'published' },
      select: { allocationId: true },
    })
    const allocationIds = [...new Set(entries.map((e) => e.allocationId))]

    if (allocationIds.length) {
      await tx.teacherAllocation.updateMany({
        where: { id: { in: allocationIds } },
        data: { status: 'scheduled' },
      })
    }

    return updated.count
  })

  revalidateTag(`timetable-${schoolId}`)
  revalidateTag('timetable')

  return NextResponse.json({
    success: true,
    message: 'Timetable published',
    published: result,
    term,
    academicYear,
  })
}
