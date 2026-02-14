import { NextResponse } from 'next/server';
import { logger } from '../utils/logger';
import { ERROR_MESSAGES } from '../utils/errorMessages';

/**
 * Production-safe error handler wrapper for Next.js API routes
 * Prevents stack traces from leaking to the client and provides consistent error format
 */
export function withErrorHandler(handler) {
  return async (request, ...args) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      logger.error('API Error', error, { url: request.url });

      const status = error.status || 500;
      const message = process.env.NODE_ENV === 'production'
        ? ERROR_MESSAGES.SERVER_ERROR
        : error.message || ERROR_MESSAGES.SERVER_ERROR;

      return NextResponse.json(
        { 
          success: false, 
          error: status === 500 ? 'Internal Server Error' : error.name || 'Error',
          message,
          // Only include stack in development
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        },
        { status }
      );
    }
  };
}

export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}
