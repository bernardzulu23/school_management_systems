export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateCareerSchema } from '@/lib/schemas'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'
import {
  assertCareerGuidanceManager,
  isCareerGuidanceStaff,
} from '@/lib/guidance/careerGuidanceAuth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

function pickCareerFields(body) {
  const fields = [
    'summary',
    'overview',
    'subjectsToFocus',
    'recommendedCourses',
    'collegesInstitutions',
    'salaryExpectations',
    'qualifications',
    'careerProgression',
    'additionalNotes',
  ]
  const data = {}
  for (const key of fields) {
    if (body[key] === undefined) continue
    const v = String(body[key] || '').trim()
    data[key] = v || null
  }
  return data
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'career-guidance')
  if (typeBlock) return typeBlock

  const db = getTenantClient(schoolId)
  const { searchParams } = new URL(request.url)
  const clusterId = safeQueryString(searchParams.get('clusterId'))
  const isStaff = await isCareerGuidanceStaff(auth.user, schoolId)
  const activeOnly = !isStaff || searchParams.get('all') !== '1'

  const careers = await db.career.findMany({
    where: {
      ...(clusterId ? { clusterId } : {}),
      ...(activeOnly ? { active: true } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    take: 500,
    include: {
      cluster: { select: { id: true, name: true, description: true, active: true } },
    },
  })

  return NextResponse.json({ success: true, data: careers })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const managerBlock = await assertCareerGuidanceManager(auth.user, schoolId)
  if (managerBlock) return managerBlock

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'career-guidance')
  if (typeBlock) return typeBlock

  const { data: body, error: validationError } = await validateBody(request, CreateCareerSchema)
  if (validationError) return validationError

  const db = getTenantClient(schoolId)
  const cluster = await db.careerCluster.findFirst({
    where: { id: body.clusterId },
    select: { id: true },
  })
  if (!cluster) {
    return NextResponse.json({ error: 'Career cluster not found' }, { status: 404 })
  }

  try {
    const career = await db.career.create({
      data: {
        clusterId: body.clusterId,
        title: body.title,
        sortOrder: body.sortOrder ?? 0,
        active: body.active !== false,
        ...pickCareerFields(body),
      },
      include: {
        cluster: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ success: true, data: career }, { status: 201 })
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new ApiError('This career title already exists in the selected cluster', 409)
    }
    throw error
  }
})
