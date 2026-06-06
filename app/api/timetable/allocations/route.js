export const dynamic = 'force-dynamic'
// app/api/timetable/allocations/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveBundleFromBody } from '@/lib/timetable/bundle-utils'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'

// GET — fetch all allocations for this school (HOD sees own dept, headteacher sees all)
export async function GET(req) {
  const auth = await authMiddleware(req)
  if (!auth.isAuthenticated) return auth.response

  const user = auth.user
  const tenant = await resolveAuthenticatedSchoolId(req, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const isAllowedRole = roleCheck(user, ['ADMIN', 'headteacher', 'HOD', 'hod'])
  const hasHodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId: user.id, schoolId },
    select: { id: true },
  })
  if (!isAllowedRole && !hasHodProfile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isHod = roleCheck(user, ['HOD', 'hod']) || Boolean(hasHodProfile)
  const { searchParams } = new URL(req.url)
  const term = searchParams.get('term') || 'Term 1'
  const academicYear = searchParams.get('academicYear') || new Date().getFullYear().toString()
  const department = searchParams.get('department')
  const status = searchParams.get('status') // "pushed" to get publishable ones

  const where = { schoolId, term, academicYear }

  // HOD sees only their own allocations
  if (isHod) {
    where.hodId = user.id
  }

  if (department) {
    // Filter by department via HOD's department
    where.hod = { hodProfile: { department } }
  }

  if (status) where.status = status

  try {
    const allocations = await prisma.teacherAllocation.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            teacherProfile: { select: { department: true, ts_number: true } },
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
  } catch (err) {
    const message = String(err?.message || '')
    const code = err?.code
    if (code === 'P2021' || /does not exist/i.test(message)) {
      return NextResponse.json(
        { error: 'Timetable tables are missing. Run database migrations first.' },
        { status: 503 }
      )
    }
    console.error('[timetable allocations GET]', message)
    return NextResponse.json({ error: 'Failed to fetch allocations' }, { status: 500 })
  }
}

// POST — create a new allocation (HOD only)
export async function POST(req) {
  const auth = await authMiddleware(req)
  if (!auth.isAuthenticated) return auth.response

  const user = auth.user
  const tenant = await resolveAuthenticatedSchoolId(req, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const isAdmin = roleCheck(user, ['ADMIN'])
  const hasHodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId: user.id, schoolId },
    select: { id: true },
  })
  const isHod = roleCheck(user, ['HOD', 'hod']) || Boolean(hasHodProfile)
  if (!isAdmin && !isHod) {
    return NextResponse.json({ error: 'HOD or above required' }, { status: 403 })
  }

  const body = await req.json()
  const {
    teacherId,
    subjectId,
    classId,
    periodsPerWeek,
    blockType = 'MIXED',
    term = 'Term 1',
    academicYear = new Date().getFullYear().toString(),
    notes,
  } = body

  const ppw = Number(periodsPerWeek)
  if (!teacherId || !subjectId || !classId || !Number.isFinite(ppw) || ppw <= 0) {
    return NextResponse.json(
      { error: 'teacherId, subjectId, classId and periodsPerWeek are required' },
      { status: 400 }
    )
  }

  const { bundle, error: bundleError } = resolveBundleFromBody(body, ppw)
  if (bundleError) {
    return NextResponse.json({ error: bundleError }, { status: 400 })
  }

  const finalSingle = bundle.singles
  const finalDouble = bundle.doubles
  const finalTriple = bundle.triples
  const resolvedBlockType = String(blockType || 'MIXED')
    .trim()
    .toUpperCase()

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
        periodsPerWeek: ppw,
        blockType: resolvedBlockType,
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
        periodsPerWeek: ppw,
        blockType: resolvedBlockType,
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
    const message = String(err?.message || '')
    const code = err?.code
    if (code === 'P2021' || /does not exist/i.test(message)) {
      return NextResponse.json(
        { error: 'Timetable tables are missing. Run database migrations first.' },
        { status: 503 }
      )
    }
    console.error('[allocations POST]', message)
    return NextResponse.json({ error: 'Failed to save allocation' }, { status: 500 })
  }
}
