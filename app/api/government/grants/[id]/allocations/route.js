export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authorizeGovernmentRoute } from '@/lib/government/routeAuth'
import { addAllocation, getGrantForSchool, updateAllocation } from '@/lib/government/grants'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeRouteParam, safeStringId } from '@/lib/security/safeQueryValue'

export const POST = withSecureHandler(async function POST(request, context) {
  const access = await authorizeGovernmentRoute(request, 'grants-tracking')
  if (!access.ok) return access.response

  const grantId = await safeRouteParam(context.params, 'id')
  if (!grantId) return NextResponse.json({ error: 'Invalid grant id' }, { status: 400 })

  const body = await request.json().catch(() => ({}))

  if (!body.lineItem || body.budgeted === undefined) {
    return NextResponse.json({ error: 'lineItem and budgeted are required' }, { status: 400 })
  }

  const allocation = await addAllocation(access.schoolId, grantId, body)
  if (!allocation) {
    return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
  }

  const grant = await getGrantForSchool(access.schoolId, grantId)
  return NextResponse.json({ success: true, allocation, grant }, { status: 201 })
})

export const PATCH = withSecureHandler(async function PATCH(request, context) {
  const access = await authorizeGovernmentRoute(request, 'grants-tracking')
  if (!access.ok) return access.response

  const grantId = await safeRouteParam(context.params, 'id')
  if (!grantId) return NextResponse.json({ error: 'Invalid grant id' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const allocId = safeStringId(body.allocId)
  if (!allocId) {
    return NextResponse.json({ error: 'allocId is required' }, { status: 400 })
  }

  const allocation = await updateAllocation(access.schoolId, grantId, allocId, body)
  if (!allocation) {
    return NextResponse.json({ error: 'Grant or allocation not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, allocation })
})
