export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { getAccommodationType } from '@/lib/ecz/ecz-accommodations'

const CAN_VIEW = ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher', 'admin']
const CAN_MANAGE = ['HOD', 'hod', 'ADMIN', 'headteacher', 'admin']
const CAN_REGISTER = ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher', 'admin']

export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, CAN_VIEW)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('appliedForYear')
    ? parseInt(searchParams.get('appliedForYear'), 10)
    : new Date().getFullYear()
  const studentId = searchParams.get('studentId') || undefined
  const pendingOnly = searchParams.get('pending') === 'true'

  try {
    const rows = await prisma.specialAccommodation.findMany({
      where: {
        schoolId,
        appliedForYear: year,
        ...(studentId ? { studentId } : {}),
        ...(pendingOnly ? { approvedAt: null } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            exam_number: true,
            classRef: { select: { name: true } },
          },
        },
      },
      orderBy: [{ approvedAt: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        learnerName: r.student.name,
        learnerNumber: r.student.exam_number || 'N/A',
        className: r.student.classRef?.name || '',
        accommodationType: r.accommodationType,
        details: r.details,
        accommodations: r.accommodations,
        documentation: r.documentation,
        appliedForYear: r.appliedForYear,
        approvedAt: r.approvedAt,
        approvedBy: r.approvedBy,
        isApproved: Boolean(r.approvedAt),
        createdAt: r.createdAt,
      })),
      total: rows.length,
      pendingCount: rows.filter((r) => !r.approvedAt).length,
    })
  } catch (error) {
    console.error('ECZ accommodations GET:', error)
    return NextResponse.json({ error: 'Failed to load accommodations' }, { status: 500 })
  }
})

export const POST = withSecureApi(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, CAN_REGISTER)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const body = await request.json().catch(() => ({}))
  const studentId = String(body.studentId || '').trim()
  const accommodationType = String(body.accommodationType || '').trim()
  const details = String(body.details || '').trim()
  const accommodations = Array.isArray(body.accommodations)
    ? body.accommodations.map(String).filter(Boolean)
    : []
  const appliedForYear = Number(body.appliedForYear) || new Date().getFullYear()
  const documentation = Array.isArray(body.documentation)
    ? body.documentation.map(String).filter(Boolean)
    : []

  if (!studentId) return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  if (!getAccommodationType(accommodationType)) {
    return NextResponse.json({ error: 'Invalid accommodation type' }, { status: 400 })
  }
  if (!details) return NextResponse.json({ error: 'Details are required' }, { status: 400 })
  if (!accommodations.length) {
    return NextResponse.json(
      { error: 'Select at least one accommodation measure' },
      { status: 400 }
    )
  }

  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const isManager = roleCheck(auth.user, CAN_MANAGE)
  const now = new Date()

  try {
    const row = await prisma.specialAccommodation.create({
      data: {
        studentId,
        schoolId,
        accommodationType,
        details,
        accommodations,
        documentation,
        appliedForYear,
        ...(isManager ? { approvedAt: now, approvedBy: auth.user.id } : {}),
      },
      include: {
        student: { select: { id: true, name: true, exam_number: true } },
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: isManager
          ? 'Accommodation registered and approved'
          : 'Accommodation submitted for HOD approval',
        data: row,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('ECZ accommodations POST:', error)
    return NextResponse.json({ error: 'Failed to create accommodation' }, { status: 500 })
  }
})
