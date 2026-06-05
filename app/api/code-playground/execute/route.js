export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { PISTON_LANGUAGES } from '@/lib/creative-teaching/playgroundLanguages'
import { executeViaPiston } from '@/lib/creative-teaching/executePiston'
import { runJavaScriptSandbox } from '@/lib/creative-teaching/runJavaScriptSandbox'

const ExecuteSchema = z.object({
  language: z.string().trim().min(1).max(40),
  version: z.string().trim().min(1).max(40),
  code: z.string().max(32_000),
})

const ALLOWED = new Map(PISTON_LANGUAGES.map((l) => [l.id, l]))

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['STUDENT', 'student', 'TEACHER', 'teacher', 'headteacher', 'ADMIN'])) {
    throw new ApiError('Forbidden', 403)
  }

  const rl = rateLimiter(request, {
    limit: 40,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'code_playground_',
    keyGenerator: ({ ip }) => String(auth.user?.id || ip),
  })
  if (rl.isLimited) return rl.response

  const body = await parseBodyOrThrow(request, ExecuteSchema)
  const langDef = ALLOWED.get(body.language)
  if (!langDef) {
    throw new ApiError('Unsupported language', 400)
  }

  if (body.language === 'javascript') {
    const result = runJavaScriptSandbox(body.code)
    if (result.error) {
      return NextResponse.json({ error: result.stderr || 'Restricted code' }, { status: 400 })
    }
    return NextResponse.json({
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      runtime: result.runtime,
      error: Boolean(result.stderr),
    })
  }

  const result = await executeViaPiston({
    languageId: langDef.id,
    version: langDef.version || body.version,
    code: body.code,
  })

  if (!result.ok) {
    throw new ApiError(result.message || 'Could not run code', result.status === 401 ? 503 : 502)
  }

  return NextResponse.json({
    success: true,
    stdout: result.stdout,
    stderr: result.stderr,
    runtime: result.runtime,
    error: Boolean(result.stderr),
  })
})
