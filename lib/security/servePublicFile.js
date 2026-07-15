import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { applySecurityHeaders, buildStaticAssetContentSecurityPolicy } from '@/lib/security/headers'

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

/**
 * Serve files from public/ with full security headers (CSP, HSTS, nosniff).
 * Used via beforeFiles rewrites so Vercel does not attach ACAO:* to raw public/ responses.
 */
export async function servePublicRootFile(request, rootDir, relativeSegments) {
  const safeRoot = path.join(process.cwd(), 'public', rootDir)
  const relative = relativeSegments.map((s) => String(s || '').trim()).filter(Boolean)
  if (!relative.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const resolved = path.normalize(path.join(safeRoot, ...relative))
  if (!resolved.startsWith(safeRoot)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let buf
  try {
    buf = await readFile(resolved)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ext = path.extname(resolved).toLowerCase()
  const contentType = MIME[ext] || 'application/octet-stream'
  const pathname = `/${rootDir}/${relative.join('/')}`

  const response = new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${path.basename(resolved)}"`,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })

  applySecurityHeaders(response, request, {
    pathname,
    nonce: false,
    cors: false,
  })

  // Vercel public-file CDN adds ACAO:* — images do not need CORS when same-origin.
  response.headers.delete('Access-Control-Allow-Origin')
  response.headers.delete('Access-Control-Allow-Credentials')
  response.headers.delete('Access-Control-Allow-Methods')
  response.headers.delete('Access-Control-Allow-Headers')

  if (!response.headers.get('Content-Security-Policy')) {
    response.headers.set('Content-Security-Policy', buildStaticAssetContentSecurityPolicy())
  }

  return response
}
