/**
 * ZSMS chat realtime Worker — routes WS + internal HTTP to per-session Durable Objects.
 */
import { ChatSessionDO, type Env } from './chat-session-do'

export { ChatSessionDO }

function unauthorized(): Response {
  return new Response('Unauthorized', { status: 401 })
}

function checkSecret(request: Request, env: Env): boolean {
  const secret = String(env.CHAT_DO_SHARED_SECRET || '').trim()
  if (!secret) return false
  const auth = request.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  return token === secret
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json({ ok: true, service: 'zsms-chat-realtime' })
    }

    // Internal control plane (Next.js → DO)
    if (
      url.pathname === '/internal/claim' ||
      url.pathname === '/internal/status' ||
      url.pathname === '/internal/broadcast'
    ) {
      if (!checkSecret(request, env)) return unauthorized()
      const rawBody = await request.text()
      let sessionId = ''
      try {
        sessionId = String((JSON.parse(rawBody) as { sessionId?: string }).sessionId || '').trim()
      } catch {
        return new Response('Invalid JSON', { status: 400 })
      }
      if (!sessionId) return new Response('sessionId required', { status: 400 })
      const id = env.CHAT_SESSION.idFromName(sessionId)
      const stub = env.CHAT_SESSION.get(id)
      return stub.fetch(
        new Request(request.url, {
          method: 'POST',
          headers: request.headers,
          body: rawBody,
        })
      )
    }

    // WebSocket upgrade — one DO per chatSession.id
    if (url.pathname === '/ws') {
      const sessionId = String(url.searchParams.get('sessionId') || '').trim()
      if (!sessionId) return new Response('sessionId required', { status: 400 })
      const id = env.CHAT_SESSION.idFromName(sessionId)
      const stub = env.CHAT_SESSION.get(id)
      return stub.fetch(request)
    }

    return new Response('Not found', { status: 404 })
  },
}
