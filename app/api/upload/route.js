export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  storeMaterialFile,
  blobStorageEnabled,
  MAX_DIRECT_UPLOAD_BYTES,
  MAX_BLOB_UPLOAD_BYTES,
} from '@/lib/uploads/materialFile'

/**
 * POST /api/upload
 * Multipart study-material file upload. Returns a fileUrl for /api/teacher/materials.
 * Prefer this over pasting an external URL when the file is on the teacher's device.
 */
export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    throw new ApiError('Expected multipart/form-data with a file field', 400)
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!file || typeof file === 'string') {
    throw new ApiError('File is required', 400)
  }

  const purpose =
    String(form.get('purpose') || 'study')
      .trim()
      .toLowerCase() === 'rag'
      ? 'rag'
      : 'study'

  let stored
  try {
    stored = await storeMaterialFile({
      schoolId,
      userId,
      file,
      fileName: file.name,
      purpose,
      maxBytes: blobStorageEnabled() ? MAX_BLOB_UPLOAD_BYTES : MAX_DIRECT_UPLOAD_BYTES,
    })
  } catch (error) {
    const status = Number(error?.status) || 500
    throw new ApiError(error?.message || 'Upload failed', status)
  }

  return NextResponse.json(
    {
      success: true,
      url: stored.fileUrl,
      fileUrl: stored.fileUrl,
      fileName: stored.fileName,
      size: stored.sizeLabel,
      sizeBytes: stored.sizeBytes,
      type: stored.type,
      storage: stored.storage,
    },
    { status: 201 }
  )
})

export const GET = withErrorHandler(async function GET() {
  return NextResponse.json({
    enabled: true,
    blobEnabled: blobStorageEnabled(),
    maxDirectBytes: MAX_DIRECT_UPLOAD_BYTES,
    maxBlobBytes: MAX_BLOB_UPLOAD_BYTES,
  })
})
