export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ApiResponse } from '@/lib/utils/apiResponse'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

function parsePage(value) {
  const n = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function parseLimit(value) {
  const n = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(n) || n < 1) return 20
  return Math.min(n, 100)
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const page = parsePage(searchParams.get('page'))
  const limit = parseLimit(searchParams.get('limit'))
  const skip = (page - 1) * limit

  const [fieldTrips, total] = await Promise.all([
    prisma.fieldTrip.findMany({
      where: { schoolId },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.fieldTrip.count({ where: { schoolId } }),
  ])

  return ApiResponse.success(fieldTrips, {
    cache: 600,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))

  const title = safeQueryString(body.title, { maxLength: 256 })
  const location = safeQueryString(body.location, { maxLength: 256 })
  const subject = safeQueryString(body.subject, { maxLength: 128 })
  if (!title || !location || !subject) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const newFieldTrip = await prisma.fieldTrip.create({
    data: {
      schoolId,
      title,
      location,
      subject,
      grade: safeQueryString(body.grade, { defaultValue: 'All', maxLength: 64 }),
      duration: safeQueryString(body.duration, { defaultValue: 'Flexible', maxLength: 64 }),
      description: String(body.description || '').slice(0, 5000),
      thumbnail: safeQueryString(body.thumbnail, { maxLength: 512 }),
      date: body.date ? new Date(body.date) : new Date(),
      type: body.type === 'physical' ? 'physical' : 'virtual',
      difficulty: safeQueryString(body.difficulty, { defaultValue: 'Beginner', maxLength: 32 }),
      rating: typeof body.rating === 'number' ? body.rating : 0,
      participants: typeof body.participants === 'number' ? body.participants : 0,
      stops: Array.isArray(body.stops) ? body.stops : [],
      learningObjectives: Array.isArray(body.learningObjectives) ? body.learningObjectives : [],
      resources: Array.isArray(body.resources) ? body.resources : [],
      status: safeQueryString(body.status, { defaultValue: 'upcoming', maxLength: 32 }),
    },
  })

  return NextResponse.json({ success: true, data: newFieldTrip }, { status: 201 })
})
