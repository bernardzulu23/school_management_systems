export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authorizeGovernmentRoute, parseYearParam } from '@/lib/government/routeAuth'
import { getGenderReportData } from '@/lib/government/genderReportData'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const GET = withSecureApi(async function GET(request) {
  const access = await authorizeGovernmentRoute(request, 'gender-report')
  if (!access.ok) return access.response

  const year = parseYearParam(new URL(request.url).searchParams)
  const data = await getGenderReportData(access.schoolId, year)
  return NextResponse.json({ success: true, data })
})
