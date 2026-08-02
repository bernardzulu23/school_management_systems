export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { listSmsLogsForSchool } from '@/lib/sms/persistLog'
import { getSmsLogs } from '@/lib/sms'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const limit = Math.min(300, Math.max(1, Number(searchParams.get('limit')) || 100))

  let data = []
  try {
    data = await listSmsLogsForSchool(schoolId, { limit })
  } catch (err) {
    console.error('[sms/logs] Failed to list SmsLog', err?.message || err)
    data = []
  }

  if (!data.length) {
    const memory = getSmsLogs().filter((l) => !schoolId || l.schoolId === schoolId)
    data = memory.slice(0, limit)
  }

  return NextResponse.json({ success: true, data })
})
