import { NextResponse } from 'next/server';

/**
 * Standardized API Response Helper
 */
export const ApiResponse = {
  /**
   * Success response with optional caching
   */
  success: (data, { status = 200, cache = 0, pagination = null } = {}) => {
    const response = {
      success: true,
      data,
      ...(pagination && { pagination })
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    if (cache > 0) {
      headers['Cache-Control'] = `public, s-maxage=${cache}, stale-while-revalidate=${Math.floor(cache / 2)}`;
    } else {
      headers['Cache-Control'] = 'no-store, max-age=0, must-revalidate';
    }

    return NextResponse.json(response, { status, headers });
  },

  /**
   * Error response
   */
  error: (message, status = 400, errorName = 'Error') => {
    return NextResponse.json(
      {
        success: false,
        error: errorName,
        message
      },
      { status }
    );
  }
};
