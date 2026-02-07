import { NextResponse } from 'next/server'

// Simple in-memory rate limiter (Note: specific to server instance/container)
const rateLimit = new Map()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS = 100 // 100 requests per minute

function checkRateLimit(ip) {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW
  
  // Clean up old entries periodically
  if (rateLimit.size > 1000) {
    for (const [key, times] of rateLimit.entries()) {
      const activeTimes = times.filter(t => t > windowStart)
      if (activeTimes.length === 0) {
        rateLimit.delete(key)
      } else {
        rateLimit.set(key, activeTimes)
      }
    }
  }

  const requestLog = rateLimit.get(ip) || []
  const recentRequests = requestLog.filter(time => time > windowStart)
  
  if (recentRequests.length >= MAX_REQUESTS) {
    return false
  }
  
  recentRequests.push(now)
  rateLimit.set(ip, recentRequests)
  
  return true
}

export async function middleware(request) {
  // 1. Rate Limiting Check
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(ip)) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 2. Define Paths
  const protectedPaths = ['/dashboard', '/api']
  const publicPaths = [
    '/api/auth/login', 
    '/api/auth/register', 
    '/api/auth/logout',
    '/login', 
    '/register', 
    '/manifest.json',
    '/sw.js',
    '/' // Landing page should be public
  ]
  
  const { pathname } = request.nextUrl
  
  // Check if the path is protected
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))
  
  // Check if the path is explicitly public
  const isPublic = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))
  
  let response = NextResponse.next()
  
  // 3. Authentication Check
  if (isProtected && !isPublic) {
    const token = request.cookies.get('token')?.value || 
                  request.cookies.get('session')?.value ||
                  request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      if (pathname.startsWith('/api')) {
        response = NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 })
      } else {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('from', pathname)
        response = NextResponse.redirect(loginUrl)
      }
    } else {
      // TODO: Verify JWT token validity here using 'jose' library if needed
    }
  }
  
  // 4. Add Security Headers
  // X-DNS-Prefetch-Control
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  // Strict-Transport-Security (HSTS)
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  // X-Frame-Options (Clickjacking protection)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  // X-Content-Type-Options (MIME sniffing protection)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // Referrer-Policy
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  // X-XSS-Protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
