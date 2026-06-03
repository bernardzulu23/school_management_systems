export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateCareerSchema } from '@/lib/schemas'

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

export async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const db = getTenantClient(schoolId)
  const { searchParams } = new URL(request.url)
  const clusterId = searchParams.get('clusterId')
  const isStaff = roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])
  const activeOnly = !isStaff || searchParams.get('all') !== '1'

  const careers = await db.career.findMany({
    where: {
      ...(clusterId ? { clusterId } : {}),
      ...(activeOnly ? { active: true } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: {
      cluster: { select: { id: true, name: true, description: true, active: true } },
    },
  })

  return NextResponse.json({ success: true, data: careers })
}

export async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

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
      return NextResponse.json(
        { error: 'This career title already exists in the selected cluster' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message || 'Could not create career' }, { status: 500 })
  }
}
