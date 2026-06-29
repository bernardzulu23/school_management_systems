export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authorizeGovernmentRoute, parseYearParam } from '@/lib/government/routeAuth'
import { buildEmisWorkbook } from '@/lib/government/emisExport'
import { withSecureHandler } from '@/lib/middleware/secureApi'

export const GET = withSecureHandler(async function GET(request) {
  const access = await authorizeGovernmentRoute(request, 'emis-export')
  if (!access.ok) return access.response

  const year = parseYearParam(new URL(request.url).searchParams)
  const { buffer, schoolName } = await buildEmisWorkbook(access.schoolId, year)
  const safeName = String(schoolName || 'school')
    .replace(/[^\w\-]+/g, '_')
    .slice(0, 40)

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="emis-${safeName}-${year}.xlsx"`,
    },
  })
})
