export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { validateBody } from '@/lib/middleware/validate-request'
import { UpdateCareerSchema } from '@/lib/schemas'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'

async function assertCareerGuidanceAccess(schoolId) {
  const typeBlock = await requireSchoolTypeAccess(schoolId, 'career-guidance')
  if (typeBlock) return typeBlock
  return null
}

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

export async function PATCH(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const typeBlock = await assertCareerGuidanceAccess(schoolId)
  if (typeBlock) return typeBlock

  const { data: body, error: validationError } = await validateBody(request, UpdateCareerSchema)
  if (validationError) return validationError

  const db = getTenantClient(schoolId)
  const existing = await db.career.findFirst({
    where: { id: routeParams.id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.clusterId) {
    const cluster = await db.careerCluster.findFirst({
      where: { id: body.clusterId },
      select: { id: true },
    })
    if (!cluster) return NextResponse.json({ error: 'Career cluster not found' }, { status: 404 })
  }

  const data = { ...pickCareerFields(body) }
  if (body.title !== undefined) data.title = body.title
  if (body.clusterId !== undefined) data.clusterId = body.clusterId
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
  if (body.active !== undefined) data.active = body.active

  try {
    const updated = await db.career.update({
      where: { id: existing.id },
      data,
      include: { cluster: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'This career title already exists in the selected cluster' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const db = getTenantClient(schoolId)
  const existing = await db.career.findFirst({
    where: { id: routeParams.id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.career.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true })
}
