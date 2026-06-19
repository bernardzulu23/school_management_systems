export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authorizeGovernmentRoute } from '@/lib/government/routeAuth'
import { addAllocation, getGrantForSchool, updateAllocation } from '@/lib/government/grants'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const POST = withSecureApi(async function POST(request, context) {
  const access = await authorizeGovernmentRoute(request, 'grants-tracking')
  if (!access.ok) return access.response

  const params = await context.params
  const grantId = String(params?.id || '')
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

export const PATCH = withSecureApi(async function PATCH(request, context) {
  const access = await authorizeGovernmentRoute(request, 'grants-tracking')
  if (!access.ok) return access.response

  const params = await context.params
  const grantId = String(params?.id || '')
  const body = await request.json().catch(() => ({}))
  const allocId = String(body.allocId || '')
  if (!allocId) {
    return NextResponse.json({ error: 'allocId is required' }, { status: 400 })
  }

  const allocation = await updateAllocation(access.schoolId, grantId, allocId, body)
  if (!allocation) {
    return NextResponse.json({ error: 'Grant or allocation not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, allocation })
})
