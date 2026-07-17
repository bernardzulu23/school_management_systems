export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeParentStudentAccess } from '@/lib/parent/routeAuth'
import { getParentPortalDataForStudent } from '@/lib/parent/portalData'

/**
 * Parent-authenticated portal data for a linked child.
 * Query: ?studentId=
 */
export const GET = withErrorHandler(async function GET(request) {
  const studentId = new URL(request.url).searchParams.get('studentId')
  const access = await authorizeParentStudentAccess(request, studentId)
  if (!access.ok) return access.response

  const data = await getParentPortalDataForStudent(access.schoolId, access.studentId)
  if (!data) throw new ApiError('Student not found', 404)

  return NextResponse.json({ success: true, data })
})
