export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { generateCsrfToken, setCsrfCookie } from '@/lib/security/csrf'

/**
 * GET /api/csrf-token
 * Issues a CSRF token cookie for double-submit validation.
 */
export const GET = withSecureApi(async function GET(request) {
  const token = generateCsrfToken()
  const response = NextResponse.json({ success: true, token })
  setCsrfCookie(response, request, token)
  response.headers.set('X-CSRF-Token', token)
  return response
})
