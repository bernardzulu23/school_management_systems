/**
 * Request validation utilities (Zod) for API route handlers.
 *
 * WHY: Without validation a caller can send role-escalation fields, oversized
 * payloads, wrong types, or injection strings. Every mutation route must
 * validate its body BEFORE touching the database.
 *
 * TWO STYLES — pick the one that matches the route:
 *
 *  1. Routes wrapped in `withErrorHandler` (throw-based):
 *       import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
 *       const data = await parseBodyOrThrow(request, MySchema)
 *     A failure throws `ApiError(400)` which withErrorHandler renders cleanly.
 *
 *  2. Plain route handlers (response-based):
 *       const { data, error } = await validateBody(request, MySchema)
 *       if (error) return error
 *
 * SECURITY: schemas must never accept `role` or `schoolId` from the body —
 * those come from the verified JWT only.
 */
import { secureJson } from '@/lib/security/api'
import { ApiError } from '@/lib/middleware/errorHandler'

/**
 * @param {import('zod').ZodError} error
 * @returns {{ field: string, message: string }[]}
 */
function formatIssues(error) {
  return (error?.issues || []).map((e) => ({
    field: e.path?.join('.') || '(root)',
    message: e.message,
  }))
}

/**
 * Validate a JSON request body and return a ready 400 Response on failure.
 *
 * @template T
 * @param {Request} request
 * @param {import('zod').ZodType<T>} schema
 * @returns {Promise<{ data: T|null, error: Response|null }>}
 */
export async function validateBody(request, schema) {
  let body
  try {
    body = await request.json()
  } catch {
    return {
      data: null,
      error: secureJson({ error: 'Invalid JSON in request body' }, { status: 400 }, request),
    }
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      data: null,
      error: secureJson(
        { error: 'Validation failed', details: formatIssues(result.error) },
        { status: 400 },
        request
      ),
    }
  }

  return { data: result.data, error: null }
}

/**
 * Validate URL query parameters.
 *
 * @template T
 * @param {URL|URLSearchParams|string} input
 * @param {import('zod').ZodType<T>} schema
 * @param {Request} [request] - for security headers on the error response
 * @returns {{ data: T|null, error: Response|null }}
 */
export function validateQuery(input, schema, request = null) {
  let searchParams
  if (input instanceof URLSearchParams) searchParams = input
  else if (typeof input === 'string') searchParams = new URL(input).searchParams
  else if (input?.searchParams) searchParams = input.searchParams
  else searchParams = new URLSearchParams()

  const params = Object.fromEntries(searchParams.entries())
  const result = schema.safeParse(params)
  if (!result.success) {
    return {
      data: null,
      error: secureJson(
        { error: 'Invalid query parameters', details: formatIssues(result.error) },
        { status: 400 },
        request
      ),
    }
  }
  return { data: result.data, error: null }
}

/**
 * Validate a JSON body and THROW ApiError(400) on failure.
 * Use inside routes wrapped with `withErrorHandler`.
 *
 * @template T
 * @param {Request} request
 * @param {import('zod').ZodType<T>} schema
 * @returns {Promise<T>}
 */
export async function parseBodyOrThrow(request, schema) {
  let body
  try {
    body = await request.json()
  } catch {
    throw new ApiError('Invalid JSON in request body', 400)
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    const issues = formatIssues(result.error)
    const first = issues[0]
    const message = first
      ? `Validation failed: ${first.field} — ${first.message}`
      : 'Validation failed'
    const err = new ApiError(message, 400)
    err.details = issues
    throw err
  }

  return result.data
}
