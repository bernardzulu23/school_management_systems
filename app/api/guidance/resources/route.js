export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateCareerResourceSchema } from '@/lib/schemas'
import { authorizeGuidancePortal } from '@/lib/guidance/routeAuth'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'

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
  const includeInactive = searchParams.get('all') === '1'

  const portal = await authorizeGuidancePortal(request)
  const isGuidanceStaff = portal.ok

  const resources = await db.careerResource.findMany({
    where: isGuidanceStaff && includeInactive ? {} : { active: true },
    orderBy: [{ postedAt: 'desc' }],
    include: { postedBy: { select: { id: true, name: true } } },
    take: 200,
  })

  return NextResponse.json({ success: true, data: resources })
})

export const POST = withErrorHandler(async function POST(request) {
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const { schoolId, auth } = authz
  const { data: body, error: validationError } = await validateBody(
    request,
    CreateCareerResourceSchema
  )
  if (validationError) return validationError

  const db = getTenantClient(schoolId)
  const created = await db.careerResource.create({
    data: {
      schoolId,
      type: body.type,
      title: body.title,
      body: body.body,
      deadline: body.deadline ? new Date(body.deadline) : null,
      active: body.active !== false,
      postedById: auth.user.id,
    },
    include: { postedBy: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ success: true, data: created }, { status: 201 })
})
