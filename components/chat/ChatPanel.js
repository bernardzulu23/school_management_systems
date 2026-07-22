'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Loader2, Send, FileText, Download, SendHorizontal, Headphones } from 'lucide-react'
import { EMPTY_CHAT_REPLY_MESSAGE, readChatSseStream } from '@/lib/ai/chat/sse-client'
import { CurriculumTopicSelect } from '@/components/curriculum/CurriculumTopicSelect'

const DEFAULT_RESUBMIT_PROMPT = "Rewrite the evaluation section based on the HOD's comment"

/**
 * @param {{
 *   mode: 'generative' | 'headteacher',
 *   initialSessionId?: string | null,
 *   pinnedHodComment?: string | null,
 *   suggestedPrompt?: string | null,
 * }} props
 */
export default function ChatPanel({
  mode,
  initialSessionId = null,
  pinnedHodComment = null,
  suggestedPrompt = null,
}) {
  const [sessionId, setSessionId] = useState(initialSessionId || null)
  const [sessionStatus, setSessionStatus] = useState('AI_MANAGED')
  const [input, setInput] = useState(
    suggestedPrompt || (pinnedHodComment ? DEFAULT_RESUBMIT_PROMPT : '')
  )
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState(null)
  const [lpSubject, setLpSubject] = useState('')
  const [lpGrade, setLpGrade] = useState('')
  const [lpTopic, setLpTopic] = useState('')
  const [lpBusy, setLpBusy] = useState(false)
  const [sessionHydrated, setSessionHydrated] = useState(!initialSessionId)
  const [requestingHuman, setRequestingHuman] = useState(false)
  const [telegramSent, setTelegramSent] = useState(null)
  const [wsLabel, setWsLabel] = useState('')
  const bottomRef = useRef(null)
  const resubmitBootstrapped = useRef(false)
  const wsRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const connectHandoffWs = useCallback(async (sid) => {
    if (!sid) return
    try {
      const res = await fetch('/api/chat/ws-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId: sid }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        setWsLabel(data.code === 'CHAT_DO_NOT_CONFIGURED' ? '' : 'Live relay unavailable')
        return
      }
      try {
        wsRef.current?.close()
      } catch {
        // ignore
      }
      const ws = new WebSocket(data.url)
      wsRef.current = ws
      ws.onopen = () => setWsLabel('Live')
      ws.onclose = () => setWsLabel('')
      ws.onerror = () => setWsLabel('Live error')
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data)
          if (payload.type === 'status' && payload.status) {
            setSessionStatus(payload.status)
          }
          if (payload.type === 'hello' && payload.status) {
            setSessionStatus(payload.status)
          }
          if (payload.type === 'message' && payload.message) {
            const m = payload.message
            setMessages((prev) => {
              if (m.id && prev.some((x) => x.id === m.id)) return prev
              const role =
                m.sender === 'USER' ? 'user' : m.sender === 'HUMAN_STAFF' ? 'admin' : 'assistant'
              return [
                ...prev,
                {
                  id: m.id || `ws-${Date.now()}`,
                  role,
                  content: m.content,
                },
              ]
            })
          }
        } catch {
          // ignore
        }
      }
    } catch {
      setWsLabel('')
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

  useEffect(() => {
    if (
      mode === 'generative' &&
      sessionId &&
      (sessionStatus === 'PENDING_HUMAN' || sessionStatus === 'HUMAN_ACTIVE')
    ) {
      void connectHandoffWs(sessionId)
    }
  }, [mode, sessionId, sessionStatus, connectHandoffWs])

  // Phase 4 resubmit: reopen originating session; pin HOD comment; pre-fill prompt (do not auto-send).
  useEffect(() => {
    if (!initialSessionId || resubmitBootstrapped.current) return
    resubmitBootstrapped.current = true
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/chat/sessions/${encodeURIComponent(initialSessionId)}`, {
          credentials: 'include',
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not reopen chat session')
        if (cancelled) return
        setSessionId(data.session?.id || initialSessionId)
        if (data.session?.status) setSessionStatus(data.session.status)
        const loaded = Array.isArray(data.messages) ? data.messages : []
        setMessages(loaded)
        const prompt = suggestedPrompt || DEFAULT_RESUBMIT_PROMPT
        setInput(prompt)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setSessionId(null)
        }
      } finally {
        if (!cancelled) setSessionHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [initialSessionId, suggestedPrompt])

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId
    const res = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: 'New Conversation' }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to create session')
    }
    const data = await res.json()
    const id = data.session?.id
    setSessionId(id)
    setSessionStatus(data.session?.status || 'AI_MANAGED')
    return id
  }, [sessionId])

  const requestHuman = async () => {
    if (mode !== 'generative' || requestingHuman) return
    setError(null)
    setRequestingHuman(true)
    try {
      const sid = await ensureSession()
      const res = await fetch('/api/chat/request-human', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId: sid }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not request human help')
      setSessionStatus(data.status || 'PENDING_HUMAN')
      if (typeof data.telegramSent === 'boolean') setTelegramSent(data.telegramSent)
      const reply =
        typeof data.reply === 'string' && data.reply.trim()
          ? data.reply.trim()
          : 'I am looping in an administrator to assist you further. Please hold on.'
      const claimerHint =
        typeof data.claimerHint === 'string' && data.claimerHint.trim()
          ? data.claimerHint.trim()
          : 'An administrator has been notified. Platform admins claim sessions at Platform → Chat support. You will not receive a personal invite on your school dashboard — keep this window open.'
      const telegramNote =
        data.telegramSent === false
          ? typeof data.telegramSkippedHint === 'string' && data.telegramSkippedHint.trim()
            ? data.telegramSkippedHint.trim()
            : 'Telegram alert was not sent on this server. A platform admin must open Platform → Chat support to claim this session.'
          : null
      const assistantContent = [reply, claimerHint, telegramNote].filter(Boolean).join('\n\n')
      setMessages((m) => [
        ...m,
        {
          id: `u-human-${Date.now()}`,
          role: 'user',
          content: 'Requesting a human administrator.',
        },
        { id: `a-human-${Date.now()}`, role: 'assistant', content: assistantContent },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRequestingHuman(false)
    }
  }

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setError(null)
    setBusy(true)
    setInput('')
    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages((m) => [...m, userMsg])

    try {
      const sid = await ensureSession()

      if (sessionStatus === 'HUMAN_ACTIVE') {
        const res = await fetch('/api/chat/human-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ message: text, sessionId: sid }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || data.message || 'Send failed')
        return
      }

      if (sessionStatus === 'PENDING_HUMAN') {
        setError('Waiting for an administrator to join. Please hold on.')
        setMessages((m) => m.filter((msg) => msg.id !== userMsg.id))
        setInput(text)
        return
      }

      if (mode === 'headteacher') {
        const res = await fetch('/api/chat/headteacher-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ question: text, sessionId: sid }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (data.code === 'CHAT_ROLE_MISMATCH') {
            setSessionId(null)
            throw new Error(data.message || 'Role mismatch — start a new session')
          }
          throw new Error(data.error || data.message || 'Request failed')
        }
        if (data.sessionId) setSessionId(data.sessionId)
        const reply = data.refused ? data.message : data.summary
        const content = String(reply || '').trim()
        if (!content) throw new Error('No answer returned. Please try a different question.')
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', content }])
        return
      }

      const res = await fetch('/api/chat/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, sessionId: sid }),
      })

      const ct = res.headers.get('content-type') || ''
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.code === 'CHAT_ROLE_MISMATCH') {
          setSessionId(null)
          throw new Error(data.message || 'Role mismatch — start a new session')
        }
        if (data.code === 'HANDOFF_ACTIVE' && data.status) {
          setSessionStatus(data.status)
        }
        throw new Error(data.error || data.message || 'Request failed')
      }

      if (ct.includes('application/json')) {
        const data = await res.json()
        if (data.sessionId) setSessionId(data.sessionId)
        const reply = data.refused ? data.message : data.summary || data.message
        const content = String(reply || '').trim()
        if (!content) throw new Error(EMPTY_CHAT_REPLY_MESSAGE)
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', content }])
        return
      }

      const assistantId = `a-${Date.now()}`
      setMessages((m) => [...m, { id: assistantId, role: 'assistant', content: '' }])
      let acc = ''
      try {
        const { text: streamedText, error: streamError } = await readChatSseStream(res, {
          onChunk: (chunk, replace) => {
            acc = replace ? chunk : acc + chunk
            setMessages((m) =>
              m.map((msg) => (msg.id === assistantId ? { ...msg, content: acc } : msg))
            )
          },
          onMeta: (meta) => {
            if (meta.sessionId) setSessionId(String(meta.sessionId))
            if (meta.status) setSessionStatus(String(meta.status))
            if (typeof meta.telegramSent === 'boolean') setTelegramSent(meta.telegramSent)
          },
        })
        const finalText = String(streamedText || acc || '').trim()
        if (streamError) {
          throw new Error(streamError)
        }
        if (!finalText) {
          throw new Error(EMPTY_CHAT_REPLY_MESSAGE)
        }
        setMessages((m) =>
          m.map((msg) => (msg.id === assistantId ? { ...msg, content: finalText } : msg))
        )
      } catch (streamErr) {
        // Never leave a blank assistant bubble: keep partial text or surface the error inline.
        const errMsg =
          streamErr instanceof Error
            ? streamErr.message
            : String(streamErr || EMPTY_CHAT_REPLY_MESSAGE)
        setMessages((m) =>
          m.map((msg) => {
            if (msg.id !== assistantId) return msg
            const existing = String(msg.content || '').trim()
            return { ...msg, content: existing || errMsg }
          })
        )
        throw streamErr
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const generateLessonPlan = async () => {
    if (mode !== 'generative' || lpBusy) return
    const subject = lpSubject.trim()
    const grade = lpGrade.trim()
    const topic = lpTopic.trim() || input.trim()
    if (!subject || !grade || !topic) {
      setError('Subject, grade/form, and topic are required to generate a lesson plan.')
      return
    }
    setError(null)
    setLpBusy(true)
    try {
      const sid = await ensureSession()
      const res = await fetch('/api/chat/lesson-plans/generate-from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: sid,
          subject,
          grade,
          topic,
          chatContext: input.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Lesson plan generation failed')
      }
      const sub = data.submission
      setMessages((m) => [
        ...m,
        {
          id: `lp-${sub.id}`,
          role: 'assistant',
          content: `Lesson plan ready: ${sub.subject} • ${sub.grade} • ${sub.topic}${
            sub.diagramFailed
              ? '\n(Diagram could not be rendered — document generated without it.)'
              : ''
          }`,
          submissionId: sub.id,
          submissionStatus: sub.status,
        },
      ])
      setLpTopic('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLpBusy(false)
    }
  }

  const downloadSubmission = async (submissionId) => {
    setError(null)
    try {
      const res = await fetch(`/api/chat/lesson-plans/${submissionId}/download`, {
        credentials: 'include',
      })
      const ct = res.headers.get('content-type') || ''
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || data.message || 'Download failed')
      }
      if (ct.includes('application/json')) {
        const data = await res.json()
        if (data.url) {
          window.open(data.url, '_blank', 'noopener,noreferrer')
          return
        }
        throw new Error('No signed URL returned')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lesson-plan-${submissionId}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const submitToHod = async (submissionId) => {
    setError(null)
    try {
      const res = await fetch(`/api/chat/lesson-plans/${submissionId}/submit-to-hod`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Submit failed')
      }
      setMessages((m) =>
        m.map((msg) =>
          msg.submissionId === submissionId
            ? {
                ...msg,
                submissionStatus: data.submission?.status || 'PENDING_APPROVAL',
                content: `${msg.content}\n\nSubmitted to HOD for approval.`,
              }
            : msg
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const placeholder =
    mode === 'headteacher'
      ? 'Ask about enrollment, attendance, exam performance, or teacher coverage…'
      : sessionStatus === 'HUMAN_ACTIVE'
        ? 'Message the administrator…'
        : sessionStatus === 'PENDING_HUMAN'
          ? 'Waiting for an administrator…'
          : 'Ask about your classes, curriculum, or lesson planning…'

  const handoffBanner =
    sessionStatus === 'PENDING_HUMAN'
      ? telegramSent === false
        ? 'Waiting for a platform administrator. Telegram was not configured — an admin must claim this at Platform → Chat support. Keep this window open.'
        : 'Waiting for a platform administrator to join (Platform → Chat support). You will not get a personal invite — keep this window open.'
      : sessionStatus === 'HUMAN_ACTIVE'
        ? 'An administrator is in this conversation.'
        : null

  const inputDisabled = busy || sessionStatus === 'PENDING_HUMAN' || sessionStatus === 'CLOSED'

  return (
    <div className="flex flex-col h-[min(70vh,640px)] border-2 border-ink/10 rounded-xl bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-ink/10 bg-paper/50 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-ink">
            {mode === 'headteacher' ? 'School analytics assistant' : 'ZSMS AI Assistant'}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {mode === 'headteacher'
              ? 'Retrieval-only — answers from verified dashboard figures.'
              : 'Teachers and HODs can chat here; students use ZSMS Help.'}
            {wsLabel ? ` · ${wsLabel}` : ''}
          </p>
        </div>
        {mode === 'generative' && sessionStatus === 'AI_MANAGED' && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={requestingHuman || busy}
            onClick={() => void requestHuman()}
          >
            {requestingHuman ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Headphones className="h-3.5 w-3.5 mr-1" />
                Request human
              </>
            )}
          </Button>
        )}
      </div>

      {handoffBanner && (
        <div className="px-4 py-2 border-b border-amber-200 bg-amber-50 text-sm text-amber-950">
          {handoffBanner}
        </div>
      )}

      {pinnedHodComment && (
        <div className="px-4 py-2 border-b border-amber-200 bg-amber-50 text-sm text-amber-950">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            HOD feedback (pinned)
          </div>
          <p className="mt-0.5 whitespace-pre-wrap">{pinnedHodComment}</p>
          <p className="text-[10px] text-amber-800/80 mt-1">
            Suggested prompt is pre-filled below — review and send when ready (not auto-sent).
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {!sessionHydrated && (
          <p className="text-sm text-muted text-center py-8">Reopening chat session…</p>
        )}
        {sessionHydrated && messages.length === 0 && (
          <p className="text-sm text-muted text-center py-8">{placeholder}</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'ml-auto bg-accent text-white'
                : m.role === 'admin'
                  ? 'mr-auto bg-emerald-700 text-white'
                  : 'mr-auto bg-paper border border-ink/10 text-ink'
            }`}
          >
            {m.role === 'admin' && (
              <div className="text-[10px] uppercase tracking-wide opacity-80 mb-0.5">Admin</div>
            )}
            {m.content || (busy ? '…' : '')}
            {m.submissionId && m.role === 'assistant' && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void downloadSubmission(m.submissionId)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download
                </Button>
                {m.submissionStatus === 'DRAFT' || m.submissionStatus === 'REJECTED' ? (
                  <Button type="button" size="sm" onClick={() => void submitToHod(m.submissionId)}>
                    <SendHorizontal className="h-3.5 w-3.5 mr-1" />
                    Submit to HOD
                  </Button>
                ) : (
                  <span className="text-xs text-muted self-center">
                    Status: {m.submissionStatus}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-t border-red-100">
          {error}
        </div>
      )}

      {mode === 'generative' && sessionStatus === 'AI_MANAGED' && (
        <div className="px-3 pt-2 border-t border-ink/10 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              className="rounded-lg border-2 border-ink/10 px-2 py-1.5 text-xs"
              placeholder="Subject"
              value={lpSubject}
              onChange={(e) => {
                setLpSubject(e.target.value)
                setLpTopic('')
              }}
              disabled={lpBusy}
            />
            <input
              className="rounded-lg border-2 border-ink/10 px-2 py-1.5 text-xs"
              placeholder="Form / Grade (e.g. Form 2)"
              value={lpGrade}
              onChange={(e) => {
                setLpGrade(e.target.value)
                setLpTopic('')
              }}
              disabled={lpBusy}
            />
          </div>
          <CurriculumTopicSelect
            subject={lpSubject}
            gradeOrForm={lpGrade}
            value={lpTopic}
            onChange={setLpTopic}
            label="Curriculum topic"
            required
            allowFreeFormWhenEmpty={false}
            id="chat-lp-topic"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={lpBusy || busy}
            onClick={() => void generateLessonPlan()}
          >
            {lpBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <FileText className="h-3.5 w-3.5 mr-1" />
                Generate .docx
              </>
            )}
          </Button>
        </div>
      )}

      <div className="p-3 border-t border-ink/10 flex gap-2">
        <input
          className="flex-1 rounded-lg border-2 border-ink/10 px-3 py-2 text-sm focus:outline-none focus:border-accent"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder={placeholder}
          disabled={inputDisabled}
        />
        <Button type="button" onClick={() => void send()} disabled={inputDisabled || !input.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
