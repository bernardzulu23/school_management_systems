export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { handleUpload } from '@vercel/blob/client'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

import { RAG_BLOB_CONTENT_TYPES, MAX_BLOB_UPLOAD_BYTES } from '@/lib/uploads/materialFile'

const MAX_BLOB_BYTES = MAX_BLOB_UPLOAD_BYTES
// Include application/octet-stream — Windows browsers often send PDF/DOCX as that MIME.
const ALLOWED_CONTENT_TYPES = RAG_BLOB_CONTENT_TYPES

function blobEnabled() {
  return Boolean(String(process.env.BLOB_READ_WRITE_TOKEN || '').trim())
}

/**
 * GET — lets the client feature-detect whether direct-to-blob upload is available
 * (i.e. BLOB_READ_WRITE_TOKEN is configured on the server).
 */
export const GET = withErrorHandler(async function GET() {
  return NextResponse.json({ enabled: blobEnabled(), maxBytes: MAX_BLOB_BYTES })
})

/**
 * POST — Vercel Blob client-upload handler. The browser uploads the file
 * directly to blob storage (bypassing the serverless request-body limit); this
 * route only issues a short-lived, authorized upload token.
 */
export const POST = withErrorHandler(async function POST(request) {
  if (!blobEnabled()) {
    return NextResponse.json(
      { error: 'Blob storage is not configured (missing BLOB_READ_WRITE_TOKEN).' },
      { status: 501 }
    )
  }

  // Authenticate before doing anything else.
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json()

  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => ({
      allowedContentTypes: ALLOWED_CONTENT_TYPES,
      maximumSizeInBytes: MAX_BLOB_BYTES,
      // Scope uploads under the school so blobs are namespaced per tenant.
      addRandomSuffix: true,
      tokenPayload: JSON.stringify({ schoolId, userId: String(auth.user.id || ''), pathname }),
    }),
    // onUploadCompleted only fires from a publicly reachable deployment; we do
    // not depend on it — ingestion is triggered explicitly by the client.
    onUploadCompleted: async () => {},
  })
  return NextResponse.json(jsonResponse)
})
