import { NextResponse } from 'next/server'

export async function middleware(request) {
  // Define protected paths
  const protectedPaths = ['/dashboard', '/api']
  // Define paths that are always public (even if they start with /api)
  const publicPaths = [
    '/api/auth/login', 
    '/api/auth/register', 
    '/api/auth/logout',
    '/login', 
    '/register', 
    '/manifest.json',
    '/sw.js',
    '/demo.html'
  ]
  
  const { pathname } = request.nextUrl
  
  // Check if the path is protected
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))
  
  // Check if the path is explicitly public
  const isPublic = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))
  
  if (isProtected && !isPublic) {
    // Check for auth token in cookies or headers
    // We look for 'token', 'session', or 'next-auth.session-token'
    const token = request.cookies.get('token')?.value || 
                  request.cookies.get('session')?.value ||
                  request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 })
      } else {
        // Redirect to login page with return URL
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('from', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }
    
    // TODO: Verify JWT token validity here using 'jose' library
    // const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}
