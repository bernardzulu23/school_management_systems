import { NextResponse } from 'next/server';
import { rateLimiter } from './lib/middleware/rateLimiter';
import { authMiddleware, roleCheck } from './lib/middleware/auth';

export default async function proxy(request) {
  const { pathname } = request.nextUrl;

  // 1. Rate Limiting
  const isAuthRoute = pathname.startsWith('/api/auth');
  const rateLimitOptions = isAuthRoute 
    ? { limit: 5, windowMs: 15 * 60 * 1000, keyPrefix: 'auth_' } 
    : { limit: 100, windowMs: 15 * 60 * 1000 };
  const rateLimitResult = rateLimiter(request, rateLimitOptions);
  
  if (rateLimitResult.isLimited) {
    return rateLimitResult.response;
  }

  // 2. Security Headers (Helmet-like)
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';");
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // 3. Subdomain / Multi-tenancy
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomain(hostname);
  if (subdomain && subdomain !== 'www') {
    response.headers.set('x-school-subdomain', subdomain);
  }

  // 4. Authentication & Authorization
  const protectedPaths = ['/dashboard', '/api'];
  const publicPaths = [
    '/api/auth/login', 
    '/api/auth/register', 
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/health',
    '/login', 
    '/register', 
    '/manifest.json',
    '/sw.js',
    '/'
  ];

  const isProtected = protectedPaths.some(path => pathname.startsWith(path));
  const isPublic = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

  if (isProtected && !isPublic) {
    const authResult = authMiddleware(request);
    
    if (!authResult.isAuthenticated) {
      if (pathname.startsWith('/api')) {
        return authResult.response;
      } else {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Role-based access control for admin routes (headteacher = admin)
    if (pathname.startsWith('/api/admin') && !roleCheck(authResult.user, ['ADMIN', 'headteacher'])) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
  }

  return response;
}

function getSubdomain(hostname) {
  if (!hostname || hostname === 'localhost:3000' || hostname === 'localhost') return null;
  const parts = hostname.split('.');
  if (parts.length > 2) return parts[0];
  return null;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
