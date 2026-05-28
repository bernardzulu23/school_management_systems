export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { withSecureApi } from '@/lib/middleware/secureApi'
import {
  verifyPlatformAdminCredentials,
  ensurePlatformAdminFromEnv,
  getPlatformLoginHint,
} from '@/lib/platform/platformAdminAuth'
import { buildPlatformLoginResponse } from '@/lib/platform/completePlatformLogin'

/** @deprecated Use POST /api/auth/login — kept for backward-compatible clients. */
export const POST = withSecureApi(async function POST(request) {
  try {
    const body = await request.json()
    const email = String(body?.email || '')
      .trim()
      .toLowerCase()
    const password = String(body?.password || '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const isProd = process.env.NODE_ENV === 'production'
    const rateLimitResult = rateLimiter(request, {
      limit: isProd ? 8 : 40,
      windowMs: 5 * 60 * 1000,
      keyPrefix: 'platform_login_',
      keyGenerator: ({ ip }) => `${ip}-${email}`,
    })
    if (rateLimitResult.isLimited) return rateLimitResult.response

    await ensurePlatformAdminFromEnv()

    const admin = await verifyPlatformAdminCredentials(email, password)
    if (!admin) {
      const hint = await getPlatformLoginHint(email)
      return NextResponse.json(
        {
          error: 'Invalid credentials',
          hint: process.env.NODE_ENV === 'production' ? hint : `${hint}`,
        },
        { status: 401 }
      )
    }

    return buildPlatformLoginResponse(request, admin)
  } catch (error) {
    console.error('[platform login]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
