/**
 * One Durable Object instance per chatSession.id.
 * Relays human↔user WebSocket messages when status is HUMAN_ACTIVE.
 * Stops accepting AI token relays once HUMAN_ACTIVE (server never sends them).
 *
 * Admin connections are accepted only after /internal/claim sets claimedAdminId
 * (Next.js verifies platform_admin before calling claim). Never trust client role alone.
 */
import { DurableObject } from 'cloudflare:workers'
import { verifyTicket } from './ticket'

export type Env = {
  CHAT_SESSION: DurableObjectNamespace<ChatSessionDO>
  CHAT_DO_SHARED_SECRET: string
}

type ConnMeta = {
  role: 'user' | 'admin'
  userId: string
}

type SessionState = {
  status: 'AI_MANAGED' | 'PENDING_HUMAN' | 'HUMAN_ACTIVE' | 'CLOSED'
  claimedAdminId: string | null
  assignedToName: string | null
}

export class ChatSessionDO extends DurableObject<Env> {
  private sockets = new Map<WebSocket, ConnMeta>()

  private async loadState(): Promise<SessionState> {
    const stored = await this.ctx.storage.get<SessionState>('state')
    return (
      stored || {
        status: 'AI_MANAGED',
        claimedAdminId: null,
        assignedToName: null,
      }
    )
  }

  private async saveState(state: SessionState): Promise<void> {
    await this.ctx.storage.put('state', state)
  }

  private broadcast(payload: unknown, except?: WebSocket): void {
    const data = JSON.stringify(payload)
    for (const [ws] of this.sockets) {
      if (except && ws === except) continue
      try {
        ws.send(data)
      } catch {
        // drop broken sockets on next close
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (
      path === '/internal/claim' ||
      path === '/internal/status' ||
      path === '/internal/broadcast'
    ) {
      return this.handleInternal(request, path)
    }

    if (path === '/ws' || path.endsWith('/ws')) {
      return this.handleWebSocket(request, url)
    }

    return new Response('Not found', { status: 404 })
  }

  private async handleInternal(request: Request, path: string): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }
    const secret = String(this.env.CHAT_DO_SHARED_SECRET || '').trim()
    const auth = request.headers.get('Authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    if (!secret || token !== secret) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    if (path === '/internal/claim') {
      const adminUserId = String(body.adminUserId || '')
      if (!adminUserId) return new Response('adminUserId required', { status: 400 })
      const assignedToName = String(body.assignedToName || '').trim() || null
      const state = await this.loadState()
      state.status = 'HUMAN_ACTIVE'
      state.claimedAdminId = adminUserId
      state.assignedToName = assignedToName
      await this.saveState(state)
      this.broadcast({
        type: 'status',
        status: 'HUMAN_ACTIVE',
        claimedAdminId: adminUserId,
        assignedToName,
      })
      return Response.json({ ok: true, status: state.status })
    }

    if (path === '/internal/status') {
      const status = String(body.status || '') as SessionState['status']
      if (!['AI_MANAGED', 'PENDING_HUMAN', 'HUMAN_ACTIVE', 'CLOSED'].includes(status)) {
        return new Response('Invalid status', { status: 400 })
      }
      const state = await this.loadState()
      state.status = status
      if (status === 'CLOSED') {
        state.claimedAdminId = null
        state.assignedToName = null
      }
      if (status === 'PENDING_HUMAN') {
        // waiting — keep any prior claim cleared
        state.claimedAdminId = null
        state.assignedToName = null
      }
      await this.saveState(state)
      this.broadcast({ type: 'status', status })
      return Response.json({ ok: true, status })
    }

    // /internal/broadcast
    const message = body.message
    this.broadcast({ type: 'message', message })
    return Response.json({ ok: true })
  }

  private async handleWebSocket(request: Request, url: URL): Promise<Response> {
    const upgrade = request.headers.get('Upgrade')
    if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 })
    }

    const ticket = url.searchParams.get('ticket') || ''
    const sessionIdParam = url.searchParams.get('sessionId') || ''
    const secret = String(this.env.CHAT_DO_SHARED_SECRET || '').trim()
    if (!secret) return new Response('Server misconfigured', { status: 503 })

    const claims = await verifyTicket(ticket, secret)
    if (!claims) return new Response('Invalid ticket', { status: 401 })
    if (sessionIdParam && sessionIdParam !== claims.sessionId) {
      return new Response('Session mismatch', { status: 403 })
    }

    const state = await this.loadState()

    // Never trust client role alone — admin must match server-side claim.
    if (claims.connectionRole === 'admin') {
      if (!state.claimedAdminId || state.claimedAdminId !== claims.userId) {
        return new Response('Admin not claimed for this session', { status: 403 })
      }
      if (state.status !== 'HUMAN_ACTIVE') {
        return new Response('Session not HUMAN_ACTIVE', { status: 403 })
      }
    } else {
      if (state.status !== 'PENDING_HUMAN' && state.status !== 'HUMAN_ACTIVE') {
        // Allow connect shortly after status notify; still reject CLOSED
        if (state.status === 'CLOSED') {
          return new Response('Session closed', { status: 403 })
        }
      }
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    server.accept()

    const meta: ConnMeta = {
      role: claims.connectionRole,
      userId: claims.userId,
    }
    this.sockets.set(server, meta)

    server.addEventListener('message', (event) => {
      void this.onClientMessage(server, meta, event.data)
    })
    server.addEventListener('close', () => {
      this.sockets.delete(server)
    })
    server.addEventListener('error', () => {
      this.sockets.delete(server)
    })

    // Hello snapshot
    try {
      server.send(
        JSON.stringify({
          type: 'hello',
          status: state.status,
          claimedAdminId: state.claimedAdminId,
          assignedToName: state.assignedToName,
          role: meta.role,
        })
      )
    } catch {
      // ignore
    }

    return new Response(null, { status: 101, webSocket: client })
  }

  private async onClientMessage(
    ws: WebSocket,
    meta: ConnMeta,
    data: string | ArrayBuffer
  ): Promise<void> {
    const state = await this.loadState()

    // When HUMAN_ACTIVE, only relay typed human/user chat — drop AI-token shaped payloads
    if (state.status === 'HUMAN_ACTIVE') {
      let parsed: { type?: string; text?: string; content?: string } | null = null
      try {
        parsed = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data))
      } catch {
        return
      }
      if (!parsed) return
      // Reject AI streaming token envelopes
      if (parsed.type === 'ai_token' || parsed.type === 'ai_chunk') return

      if (parsed.type === 'chat' && (parsed.content || parsed.text)) {
        // Client-side relay fallback; primary path is Next.js → /internal/broadcast
        if (meta.role === 'admin' || meta.role === 'user') {
          this.broadcast(
            {
              type: 'message',
              message: {
                sender: meta.role === 'admin' ? 'HUMAN_STAFF' : 'USER',
                content: String(parsed.content || parsed.text || ''),
                userId: meta.userId,
                at: new Date().toISOString(),
              },
            },
            ws
          )
        }
      }
      return
    }

    // PENDING_HUMAN: no chat relay yet (waiting for claim)
    if (state.status === 'PENDING_HUMAN') {
      try {
        ws.send(JSON.stringify({ type: 'status', status: 'PENDING_HUMAN' }))
      } catch {
        // ignore
      }
    }
  }
}
