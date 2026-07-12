export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { handleUpload } from '@vercel/blob/client'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authorizeGuidancePortal } from '@/lib/guidance/routeAuth'

const MAX_BLOB_BYTES = 20 * 1024 * 1024
const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]

function blobEnabled() {
  return Boolean(String(process.env.BLOB_READ_WRITE_TOKEN || '').trim())
}

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response
  return NextResponse.json({
    enabled: blobEnabled(),
    maxBytes: MAX_BLOB_BYTES,
    schoolId: authz.schoolId,
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  if (!blobEnabled()) {
    return NextResponse.json(
      { error: 'Document storage is not configured. Contact your school administrator.' },
      { status: 501 }
    )
  }

  const { schoolId, auth } = authz
  const body = await request.json()

  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ALLOWED_CONTENT_TYPES,
      maximumSizeInBytes: MAX_BLOB_BYTES,
      addRandomSuffix: true,
      tokenPayload: JSON.stringify({
        schoolId,
        userId: String(auth.user.id || ''),
      }),
    }),
    onUploadCompleted: async () => {},
  })

  return NextResponse.json(jsonResponse)
})
