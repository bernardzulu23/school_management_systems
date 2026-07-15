import { servePublicRootFile } from '@/lib/security/servePublicFile'

export const dynamic = 'force-dynamic'

/** Rewritten from /Assets/:path* (beforeFiles) — bypasses Vercel public/ ACAO:* defaults. */
export async function GET(request, { params }) {
  const { path: segments } = await params
  const parts = Array.isArray(segments) ? segments : segments ? [segments] : []
  return servePublicRootFile(request, 'Assets', parts)
}
