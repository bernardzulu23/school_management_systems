export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { getAccommodationType } from '@/lib/ecz/ecz-accommodations'
import { safeStringId, safeQueryString } from '@/lib/security/safeQueryValue'
import { isEczStaff, isEczManager } from '@/lib/ecz/routeAuth'

export const GET = withSecureHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!isEczStaff(auth.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const { searchParams } = new URL(request.url)
  const yearRaw = safeQueryString(searchParams.get('appliedForYear'))
  const year =
    yearRaw && Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : new Date().getFullYear()
  const studentId = safeStringId(searchParams.get('studentId')) || undefined
  const pendingOnly = searchParams.get('pending') === 'true'

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
    take: 500,
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
})

export const POST = withSecureHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!isEczStaff(auth.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const body = await request.json().catch(() => ({}))
  const studentId = safeStringId(body.studentId)
  const accommodationType = safeQueryString(body.accommodationType, { maxLength: 64 })
  const details = String(body.details || '').trim()
  const accommodations = Array.isArray(body.accommodations)
    ? body.accommodations.map(String).filter(Boolean)
    : []
  const appliedForYear = Number(body.appliedForYear) || new Date().getFullYear()
  const documentation = Array.isArray(body.documentation)
    ? body.documentation.map(String).filter(Boolean)
    : []

  if (!studentId) return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  if (!accommodationType || !getAccommodationType(accommodationType)) {
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

  const isManager = isEczManager(auth.user)
  const now = new Date()

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
})
