export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { validateBody } from '@/lib/middleware/validate-request'
import { UpdateCareerClusterSchema } from '@/lib/schemas'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'
import { assertCareerGuidanceManager } from '@/lib/guidance/careerGuidanceAuth'

async function assertCareerGuidanceAccess(schoolId) {
  const typeBlock = await requireSchoolTypeAccess(schoolId, 'career-guidance')
  if (typeBlock) return typeBlock
  return null
}

export async function PATCH(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const managerBlock = await assertCareerGuidanceManager(auth.user, schoolId)
  if (managerBlock) return managerBlock

  const typeBlock = await assertCareerGuidanceAccess(schoolId)
  if (typeBlock) return typeBlock

  const { data: body, error: validationError } = await validateBody(
    request,
    UpdateCareerClusterSchema
  )
  if (validationError) return validationError

  const db = getTenantClient(schoolId)
  const existing = await db.careerCluster.findFirst({
    where: { id: routeParams.id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data = {}
  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
  if (body.active !== undefined) data.active = body.active

  try {
    const updated = await db.careerCluster.update({
      where: { id: existing.id },
      data,
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A cluster with this name already exists' },
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

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const managerBlock = await assertCareerGuidanceManager(auth.user, schoolId)
  if (managerBlock) return managerBlock

  const typeBlock = await assertCareerGuidanceAccess(schoolId)
  if (typeBlock) return typeBlock

  const db = getTenantClient(schoolId)
  const existing = await db.careerCluster.findFirst({
    where: { id: routeParams.id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.careerCluster.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true })
}
