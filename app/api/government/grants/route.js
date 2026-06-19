export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authorizeGovernmentRoute, parseYearParam } from '@/lib/government/routeAuth'
import { createGrant, getGrantsSummary, listGrants } from '@/lib/government/grants'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const GET = withSecureApi(async function GET(request) {
  const access = await authorizeGovernmentRoute(request, 'grants-tracking')
  if (!access.ok) return access.response

  const params = new URL(request.url).searchParams
  const yearParam = params.get('year')
  const academicYear = yearParam ? parseYearParam(params, null) : null

  const grants = await listGrants(access.schoolId, academicYear)
  const summary = await getGrantsSummary(access.schoolId, academicYear || new Date().getFullYear())

  return NextResponse.json({ success: true, data: { grants, summary } })
})

export const POST = withSecureApi(async function POST(request) {
  const access = await authorizeGovernmentRoute(request, 'grants-tracking')
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const required = [
    'grantType',
    'amountReceived',
    'receivedDate',
    'academicYear',
    'term',
    'pupilCount',
  ]
  for (const key of required) {
    if (body[key] === undefined || body[key] === null || body[key] === '') {
      return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 })
    }
  }

  const grant = await createGrant(access.schoolId, body)
  return NextResponse.json({ success: true, grant }, { status: 201 })
})
