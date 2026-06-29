export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authorizeFeeRoute } from '@/lib/fees/routeAuth'
import { listInvoices } from '@/lib/fees/invoices'
import { safeQueryString } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request) {
  const access = await authorizeFeeRoute(request)
  if (!access.ok) return access.response

  const params = new URL(request.url).searchParams
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '50', 10) || 50))
  const termRaw = safeQueryString(params.get('term'))
  const yearRaw = safeQueryString(params.get('year') || params.get('academicYear'))

  const result = await listInvoices(access.schoolId, {
    studentId: safeQueryString(params.get('studentId')),
    status: safeQueryString(params.get('status')),
    term: termRaw ? Number(termRaw) : undefined,
    academicYear: yearRaw ? Number(yearRaw) : undefined,
    scheduleId: safeQueryString(params.get('scheduleId')),
    classId: safeQueryString(params.get('classId')),
    page,
    limit,
  })

  return NextResponse.json({
    success: true,
    invoices: result.invoices,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  })
})
