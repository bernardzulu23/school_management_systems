export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateCareerClusterSchema } from '@/lib/schemas'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'
import {
  assertCareerGuidanceManager,
  isCareerGuidanceStaff,
} from '@/lib/guidance/careerGuidanceAuth'

export async function GET(request) {
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
  const includeCareers = searchParams.get('include') === 'careers'
  const isStaff = await isCareerGuidanceStaff(auth.user, schoolId)
  const activeOnly = !isStaff || searchParams.get('all') !== '1'

  const clusters = await db.careerCluster.findMany({
    where: activeOnly ? { active: true } : {},
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: includeCareers
      ? {
          careers: {
            where: activeOnly ? { active: true } : {},
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
          },
        }
      : undefined,
  })

  return NextResponse.json({ success: true, data: clusters })
}

export async function POST(request) {
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

  const { data: body, error: validationError } = await validateBody(
    request,
    CreateCareerClusterSchema
  )
  if (validationError) return validationError

  const db = getTenantClient(schoolId)

  try {
    const cluster = await db.careerCluster.create({
      data: {
        name: body.name,
        description: body.description,
        sortOrder: body.sortOrder ?? 0,
        active: body.active !== false,
      },
    })
    return NextResponse.json({ success: true, data: cluster }, { status: 201 })
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A cluster with this name already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Could not create cluster' },
      { status: 500 }
    )
  }
}
