import { NextResponse } from 'next/server'
import { logger } from '../utils/logger'
import { ERROR_MESSAGES } from '../utils/errorMessages'
import { authMiddleware, roleCheck } from './auth'
import { applySecurityHeaders } from '@/lib/security/headers'

function sanitizeErrorDetails(value) {
  const raw = String(value || '')
  if (!raw) return raw
  return raw
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgres://***')
    .replace(/password=[^&\s]+/gi, 'password=***')
    .slice(0, 2000)
}

/**
 * Production-safe error handler wrapper for Next.js API routes
 * Prevents stack traces from leaking to the client and provides consistent error format
 */
export function withErrorHandler(handler) {
  return async (request, ...args) => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      logger.error('API Error', error, { url: request.url })

      const status = error.status || 500
      const code = error?.code || error?.name || 'UNKNOWN'
      const auth = await authMiddleware(request)
      const isPrivileged =
        auth?.isAuthenticated && roleCheck(auth.user, ['ADMIN', 'headteacher', 'HEADTEACHER'])
      const message =
        process.env.NODE_ENV === 'production'
          ? status >= 500
            ? ERROR_MESSAGES.SERVER_ERROR
            : error.message || ERROR_MESSAGES.SERVER_ERROR
          : error.message || ERROR_MESSAGES.SERVER_ERROR

      const response = NextResponse.json(
        {
          success: false,
          error: status === 500 ? 'Internal Server Error' : error.name || 'Error',
          message,
          code,
          ...(process.env.NODE_ENV === 'production' &&
            status >= 500 &&
            isPrivileged && {
              details: sanitizeErrorDetails(error?.message || error),
            }),
          // Only include stack in development
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        },
        {
          status,
          headers: {
            'x-error-code': String(code),
            'Cache-Control': 'no-store',
          },
        }
      )
      applySecurityHeaders(response, request, { cors: false })
      return response
    }
  }
}

export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}
