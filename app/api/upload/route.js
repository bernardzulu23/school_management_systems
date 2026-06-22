export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

/** Legacy generic upload — use /api/materials/ingest or /api/profile/picture instead. */
export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  return NextResponse.json(
    {
      error:
        'Use POST /api/materials/ingest for study materials or POST /api/profile/picture for avatars.',
      code: 'USE_SPECIFIC_UPLOAD_ROUTE',
    },
    { status: 400 }
  )
})
