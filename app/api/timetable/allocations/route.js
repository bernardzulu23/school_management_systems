// app/api/timetable/allocations/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'

// GET — fetch all allocations for this school (HOD sees own dept, headteacher sees all)
export async function GET(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.role?.toLowerCase()
  const { searchParams } = new URL(req.url)
  const term = searchParams.get('term') || 'Term 1'
  const academicYear = searchParams.get('academicYear') || new Date().getFullYear().toString()
  const department = searchParams.get('department')
  const status = searchParams.get('status') // "pushed" to get publishable ones

  const where = { schoolId, term, academicYear }

  // HOD sees only their own allocations
  if (role === 'hod') {
    where.hodId = user.id
  }

  if (department) {
    // Filter by department via HOD's department
    where.hod = { hodProfile: { department } }
  }

  if (status) where.status = status

  const allocations = await prisma.teacherAllocation.findMany({
    where,
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
          teacherProfile: { select: { department: true, employeeId: true } },
        },
      },
      hod: {
        select: {
          id: true,
          name: true,
          hodProfile: { select: { department: true } },
        },
      },
      subject: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true, year_group: true, section: true } },
    },
    orderBy: [{ class: { name: 'asc' } }, { subject: { name: 'asc' } }],
  })

  // Compute summary stats
  const summary = {
    total: allocations.length,
    pushed: allocations.filter((a) => a.status === 'pushed').length,
    draft: allocations.filter((a) => a.status === 'draft').length,
    totalPeriods: allocations.reduce((s, a) => s + a.periodsPerWeek, 0),
    teachers: [...new Set(allocations.map((a) => a.teacherId))].length,
  }

  return NextResponse.json({ allocations, summary })
}

// POST — create a new allocation (HOD only)
export async function POST(req) {
  const schoolId = await getSchoolIdFromRequest(req)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.role?.toLowerCase()
  if (!['hod', 'headteacher', 'administrator', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'HOD or above required' }, { status: 403 })
  }

  const body = await req.json()
  const {
    teacherId,
    subjectId,
    classId,
    periodsPerWeek,
    blockType,
    singlePeriods = 0,
    doublePeriods = 0,
    triplePeriods = 0,
    term = 'Term 1',
    academicYear = new Date().getFullYear().toString(),
    notes,
  } = body

  // Validate period math
  const computedTotal = singlePeriods * 1 + doublePeriods * 2 + triplePeriods * 3
  if (computedTotal !== periodsPerWeek && blockType === 'MIXED') {
    return NextResponse.json(
      {
        error: `Period mismatch: ${singlePeriods} singles + ${doublePeriods} doubles + ${triplePeriods} triples = ${computedTotal} periods, but you specified ${periodsPerWeek}`,
      },
      { status: 400 }
    )
  }

  // For non-MIXED: auto-compute the breakdown
  let finalSingle = singlePeriods,
    finalDouble = doublePeriods,
    finalTriple = triplePeriods
  if (blockType === 'SINGLE') {
    finalSingle = periodsPerWeek
    finalDouble = 0
    finalTriple = 0
  } else if (blockType === 'DOUBLE') {
    // must be even number
    if (periodsPerWeek % 2 !== 0) {
      return NextResponse.json(
        { error: 'DOUBLE blockType requires an even number of periods' },
        { status: 400 }
      )
    }
    finalDouble = periodsPerWeek / 2
    finalSingle = 0
    finalTriple = 0
  } else if (blockType === 'TRIPLE') {
    if (periodsPerWeek % 3 !== 0) {
      return NextResponse.json(
        { error: 'TRIPLE blockType requires periods divisible by 3' },
        { status: 400 }
      )
    }
    finalTriple = periodsPerWeek / 3
    finalSingle = 0
    finalDouble = 0
  }

  try {
    const allocation = await prisma.teacherAllocation.upsert({
      where: {
        schoolId_teacherId_subjectId_classId_term_academicYear: {
          schoolId,
          teacherId,
          subjectId,
          classId,
          term,
          academicYear,
        },
      },
      update: {
        periodsPerWeek,
        blockType,
        singlePeriods: finalSingle,
        doublePeriods: finalDouble,
        triplePeriods: finalTriple,
        notes,
        status: 'draft',
        hodId: user.id,
      },
      create: {
        schoolId,
        hodId: user.id,
        teacherId,
        subjectId,
        classId,
        periodsPerWeek,
        blockType,
        singlePeriods: finalSingle,
        doublePeriods: finalDouble,
        triplePeriods: finalTriple,
        term,
        academicYear,
        notes,
        status: 'draft',
      },
      include: {
        teacher: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ allocation, message: 'Allocation saved' })
  } catch (err) {
    console.error('[allocations POST]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
