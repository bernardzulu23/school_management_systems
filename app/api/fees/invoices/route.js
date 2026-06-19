export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authorizeFeeRoute } from '@/lib/fees/routeAuth'
import { listInvoices } from '@/lib/fees/invoices'

export const GET = withErrorHandler(async function GET(request) {
  const access = await authorizeFeeRoute(request)
  if (!access.ok) return access.response

  const params = new URL(request.url).searchParams
  const invoices = await listInvoices(access.schoolId, {
    studentId: params.get('studentId'),
    status: params.get('status'),
    term: params.get('term'),
    academicYear: params.get('year') || params.get('academicYear'),
    scheduleId: params.get('scheduleId'),
  })

  return NextResponse.json({ success: true, invoices })
})
