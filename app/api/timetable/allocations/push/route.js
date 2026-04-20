// app/api/timetable/allocations/push/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'

// POST — HOD pushes department allocations to the headteacher
export async function POST(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.role?.toLowerCase()
  if (!['hod', 'headteacher', 'administrator', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'HOD role required' }, { status: 403 })
  }

  const { term, academicYear, allocationIds } = await req.json()

  if (!term || !academicYear) {
    return NextResponse.json({ error: 'term and academicYear required' }, { status: 400 })
  }

  // Fetch allocations to push — either specific IDs or all draft for this HOD
  const where = {
    schoolId,
    status: 'draft',
    term,
    academicYear,
    ...(allocationIds?.length ? { id: { in: allocationIds } } : { hodId: user.id }),
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

  const department = allocations[0]?.hod?.hodProfile?.department || user.name
  const totalPeriods = allocations.reduce((s, a) => s + a.periodsPerWeek, 0)
  const teacherNames = [...new Set(allocations.map((a) => a.teacher.name))].join(', ')

  // Find the headteacher for this school
  const headteacher = await prisma.user.findFirst({
    where: {
      schoolId,
      role: { in: ['HEADTEACHER', 'headteacher', 'admin', 'administrator'] },
    },
    select: { id: true, name: true },
  })

  if (!headteacher) {
    return NextResponse.json({ error: 'No headteacher found for this school' }, { status: 404 })
  }

  // Run in transaction: mark allocations as pushed + create notification
  await prisma.$transaction(async (tx) => {
    // 1. Mark all as pushed
    await tx.teacherAllocation.updateMany({
      where: { id: { in: allocations.map((a) => a.id) } },
      data: { status: 'pushed', pushedAt: new Date() },
    })

    // 2. Create notification for headteacher
    await tx.timetableNotification.create({
      data: {
        schoolId,
        fromUserId: user.id,
        toUserId: headteacher.id,
        type: 'HOD_ALLOCATION_PUSHED',
        title: `${department} Department — Class Allocations Ready`,
        message: `${user.name} has submitted ${allocations.length} teaching allocations for ${term} ${academicYear}. ${allocations.length} subjects across ${[...new Set(allocations.map((a) => a.class.name))].length} classes (${totalPeriods} total periods per week). Teachers: ${teacherNames}.`,
        department,
        term,
        read: false,
        meta: {
          allocationIds: allocations.map((a) => a.id),
          teacherCount: [...new Set(allocations.map((a) => a.teacherId))].length,
          classCount: [...new Set(allocations.map((a) => a.classId))].length,
          totalPeriods,
          hodName: user.name,
          department,
          subjects: [...new Set(allocations.map((a) => a.subject.name))],
        },
      },
    })
  })

  return NextResponse.json({
    success: true,
    message: `${allocations.length} allocations pushed to ${headteacher.name}`,
    pushed: allocations.length,
    notified: headteacher.name,
  })
}
