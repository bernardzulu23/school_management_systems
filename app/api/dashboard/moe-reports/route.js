export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { requireSchoolType } from '@/lib/middleware/individual-gate'
import { getMoeReportSnapshot } from '@/lib/dashboard/schoolAnalytics'
import { withSecureApi } from '@/lib/middleware/secureApi'

function toCsv(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ]
  return lines.join('\n')
}

export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const typeCheck = await requireSchoolType(schoolId, ['SCHOOL'])
  if (!typeCheck.allowed) return typeCheck.response

  const gate = await requireFeature(schoolId, 'moe-reports')
  if (gate instanceof NextResponse) return gate

  const snapshot = await getMoeReportSnapshot(schoolId)
  const format = new URL(request.url).searchParams.get('format')

  if (format === 'csv') {
    const rows = snapshot.enrollmentByClass.map((r) => ({
      school: snapshot.school?.name || '',
      class: r.className,
      learners: r.count,
    }))
    const csv = toCsv(rows)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="moe-enrollment-${schoolId.slice(0, 8)}.csv"`,
      },
    })
  }

  return NextResponse.json({ success: true, data: snapshot })
})
