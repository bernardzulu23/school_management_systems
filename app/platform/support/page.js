'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { PlatformShell } from '@/components/platform/PlatformShell'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { Button } from '@/components/ui/Button'
import { Loader2, MessageSquare, UserCheck, X } from 'lucide-react'

/**
 * Platform admin support queue — pilot handoff target.
 *
 * PILOT STAGE: escalations route to platform admin. Once past single-school
 * pilot, change escalation target to same-tenant Headteacher/HOD — see
 * ZSMS_chatbot_architecture_review.md. This routing choice should not become
 * permanent by default.
 *
 * Transcript content is read here (never in Telegram — metadata-only alerts).
 */

function SupportQueueContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams?.get('sessionId') || null

  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [wsStatus, setWsStatus] = useState('idle')
  const wsRef = useRef(null)
  const bottomRef = useRef(null)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sessionFetch('/api/platform/support/queue', { cache: 'no-store' })
      if (res.status === 401) {
        router.replace('/login')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to load queue')
        return
      }
      setQueue(data.sessions || [])
    } catch {
      toast.error('Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [router])

  const loadSession = useCallback(
    async (id) => {
      if (!id) {
        setSession(null)
        setMessages([])
        return
      }
      setDetailLoading(true)
      try {
        const res = await sessionFetch(`/api/platform/support/sessions/${encodeURIComponent(id)}`, {
          cache: 'no-store',
        })
        if (res.status === 401) {
          router.replace('/login')
          return
        }
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || 'Failed to load session')
          return
        }
        setSession(data.session)
        setMessages(data.messages || [])
      } catch {
        toast.error('Failed to load session')
      } finally {
        setDetailLoading(false)
      }
    },
    [router]
  )

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  useEffect(() => {
    void loadSession(selectedId)
  }, [selectedId, loadSession])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const connectWs = useCallback((wsUrl) => {
    if (!wsUrl) return
    try {
      wsRef.current?.close()
    } catch {
      // ignore
    }
    setWsStatus('connecting')
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onopen = () => setWsStatus('open')
    ws.onclose = () => setWsStatus('closed')
    ws.onerror = () => setWsStatus('error')
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'status' && data.status) {
          setSession((s) => (s ? { ...s, status: data.status } : s))
        }
        if (data.type === 'message' && data.message) {
          const m = data.message
          setMessages((prev) => {
            if (m.id && prev.some((x) => x.id === m.id)) return prev
            return [
              ...prev,
              {
                id: m.id || `ws-${Date.now()}`,
                role:
                  m.sender === 'USER' ? 'user' : m.sender === 'HUMAN_STAFF' ? 'admin' : 'system',
                sender: m.sender,
                content: m.content,
                createdAt: m.at || new Date().toISOString(),
              },
            ]
          })
        }
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      try {
        wsRef.current?.close()
      } catch {
        // ignore
      }
    }
  }, [])

  async function selectRow(id) {
    router.replace(`/platform/support?sessionId=${encodeURIComponent(id)}`)
  }

  async function claim() {
    if (!selectedId || claiming) return
    setClaiming(true)
    try {
      const res = await sessionFetch(
        `/api/platform/support/sessions/${encodeURIComponent(selectedId)}/claim`,
        { method: 'POST' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Claim failed')
        return
      }
      toast.success('Session claimed')
      setSession((s) =>
        s
          ? {
              ...s,
              status: data.session?.status || 'HUMAN_ACTIVE',
              assignedToId: data.session?.assignedToId,
            }
          : s
      )
      if (data.wsUrl) connectWs(data.wsUrl)
      await loadQueue()
      await loadSession(selectedId)
    } catch {
      toast.error('Claim failed')
    } finally {
      setClaiming(false)
    }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || !selectedId || sending) return
    setSending(true)
    setInput('')
    try {
      const res = await sessionFetch(
        `/api/platform/support/sessions/${encodeURIComponent(selectedId)}/message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Send failed')
        setInput(text)
        return
      }
      if (data.message) {
        setMessages((m) => [...m, data.message])
      }
    } catch {
      toast.error('Send failed')
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  async function closeSession() {
    if (!selectedId) return
    const res = await sessionFetch(
      `/api/platform/support/sessions/${encodeURIComponent(selectedId)}/close`,
      { method: 'POST' }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || 'Close failed')
      return
    }
    toast.success('Session closed')
    try {
      wsRef.current?.close()
    } catch {
      // ignore
    }
    await loadQueue()
    await loadSession(selectedId)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[70vh]">
      <div className="lg:col-span-1 border-2 border-ink/10 rounded-xl bg-white overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-ink/10 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            Pending handoffs
            {!loading && queue.length > 0 ? (
              <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded bg-amber-400 text-ink text-[10px] font-bold">
                {queue.length}
              </span>
            ) : null}
          </h2>
          <Button type="button" size="sm" variant="outline" onClick={() => void loadQueue()}>
            Refresh
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="text-sm text-muted p-4 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          )}
          {!loading && queue.length === 0 && (
            <p className="text-sm text-muted p-4">No sessions waiting for a human.</p>
          )}
          {queue.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => void selectRow(row.id)}
              className={`w-full text-left px-3 py-3 border-b border-ink/5 hover:bg-paper/80 ${
                selectedId === row.id ? 'bg-accent/10' : ''
              }`}
            >
              <div className="text-sm font-medium text-ink truncate">{row.schoolName}</div>
              <div className="text-xs text-muted mt-0.5">
                {row.openedAsRole} · {row.userName || row.userEmail || 'User'}
              </div>
              <div className="text-[10px] text-muted mt-1">
                {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : ''}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 border-2 border-ink/10 rounded-xl bg-white overflow-hidden flex flex-col min-h-[420px]">
        {!selectedId && (
          <div className="flex-1 flex items-center justify-center text-sm text-muted p-6">
            <MessageSquare className="h-5 w-5 mr-2 opacity-50" />
            Select a session to read the full transcript and claim.
          </div>
        )}
        {selectedId && detailLoading && (
          <div className="flex-1 flex items-center justify-center text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading transcript…
          </div>
        )}
        {selectedId && !detailLoading && session && (
          <>
            <div className="px-4 py-3 border-b border-ink/10 bg-paper/40 flex flex-wrap gap-2 items-start justify-between">
              <div>
                <h2 className="font-semibold text-ink">{session.schoolName}</h2>
                <p className="text-xs text-muted mt-0.5">
                  {session.openedAsRole} · {session.userName || session.userEmail} ·{' '}
                  <span className="font-medium">{session.status}</span>
                  {wsStatus !== 'idle' ? ` · WS ${wsStatus}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.status === 'PENDING_HUMAN' && (
                  <Button type="button" size="sm" disabled={claiming} onClick={() => void claim()}>
                    {claiming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5 mr-1" />
                        Claim
                      </>
                    )}
                  </Button>
                )}
                {session.status === 'HUMAN_ACTIVE' && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const res = await sessionFetch('/api/chat/ws-ticket', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ sessionId: selectedId, asAdmin: true }),
                        })
                        const data = await res.json().catch(() => ({}))
                        if (data.url) connectWs(data.url)
                        else toast.error(data.error || 'Realtime not configured')
                      }}
                    >
                      Connect live
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void closeSession()}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Close
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'ml-auto bg-ink/5 border border-ink/10'
                      : m.role === 'admin'
                        ? 'mr-auto bg-accent text-white'
                        : 'mr-auto bg-paper border border-ink/10 text-ink'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">
                    {m.role}
                  </div>
                  {m.content}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {session.status === 'HUMAN_ACTIVE' && (
              <div className="p-3 border-t border-ink/10 flex gap-2">
                <input
                  className="flex-1 rounded-lg border-2 border-ink/10 px-3 py-2 text-sm"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                  placeholder="Reply as administrator…"
                  disabled={sending}
                />
                <Button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={sending || !input.trim()}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function PlatformSupportPage() {
  return (
    <PlatformShell title="Chat support queue">
      <p className="text-sm text-muted mb-4 max-w-2xl">
        Pilot handoffs land here for <strong>platform admins only</strong> (not headteachers or
        teachers). Telegram pings are metadata-only (school, role, deep link) — never message
        content. Open a pending row, read the transcript, then <strong>Claim</strong> to join live.
        Deep links look like <code className="text-xs">/platform/support?sessionId=…</code>.
      </p>
      <Suspense fallback={<p className="text-sm text-muted">Loading support queue…</p>}>
        <SupportQueueContent />
      </Suspense>
    </PlatformShell>
  )
}
