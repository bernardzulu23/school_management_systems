export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'
import { readLocalStudyMaterialFile } from '@/lib/uploads/materialFile'

/**
 * GET /api/teacher/materials/file/:schoolId/:filename
 * Serves locally stored study materials (dev / no-blob fallback).
 */
export const GET = withErrorHandler(async function GET(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (
    !roleCheck(auth.user, [
      'TEACHER',
      'teacher',
      'ADMIN',
      'headteacher',
      'HOD',
      'hod',
      'STUDENT',
      'student',
    ])
  ) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const pathSchoolId = await safeRouteParam(params, 'schoolId')
  const filename = await safeRouteParam(params, 'filename')
  if (!pathSchoolId || !filename) throw new ApiError('Invalid file path', 400)
  if (pathSchoolId !== schoolId) throw new ApiError('Forbidden', 403)

  const file = await readLocalStudyMaterialFile(schoolId, filename)
  if (!file) throw new ApiError('File not found', 404)

  return new NextResponse(file.buffer, {
    status: 200,
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `inline; filename="${String(file.fileName).replace(/"/g, '')}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
})
