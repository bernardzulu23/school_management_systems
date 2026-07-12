import { useCallback, useRef, useState } from 'react'
import { sanitizePlainText } from '@/lib/ai/plain-text'
import { sessionFetch, authErrorMessage, shouldRedirectToLogin } from '@/lib/auth/sessionFetch'
import { ERROR_MESSAGES, toUserFacingMessage } from '@/lib/utils/errorMessages'

function parseSSEChunk(buffer) {
  const parts = buffer.split('\n\n')
  const remaining = parts.pop() || ''
  const events = parts
    .map((p) =>
      p
        .split('\n')
        .filter((l) => l.startsWith('data: '))
        .map((l) => l.slice(6))
        .join('\n')
    )
    .filter(Boolean)
  return { events, remaining }
}

function safeStreamError(value, code, status) {
  const msg = toUserFacingMessage(
    typeof value === 'string' ? value : value?.error || value?.message,
    ERROR_MESSAGES.AI_UNAVAILABLE
  )
  return { error: msg, code, status }
}

export function useAIStream(endpoint, options = {}) {
  const { plainText = false } = options
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [ragReferences, setRagReferences] = useState([])
  const abortRef = useRef(null)

  const reset = useCallback(() => {
    setText('')
    setError(null)
    setDone(false)
    setLoading(false)
    setRagReferences([])
  }, [])

  const start = useCallback(
    async (payload) => {
      abortRef.current?.abort?.()
      const ac = new AbortController()
      abortRef.current = ac
      setText('')
      setError(null)
      setDone(false)
      setRagReferences([])
      setLoading(true)

      try {
        const res = await sessionFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload || {}),
          signal: ac.signal,
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          if (shouldRedirectToLogin(res.status, json) && typeof window !== 'undefined') {
            window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`
            return
          }
          setError(safeStreamError(authErrorMessage(res.status, json), json?.code, res.status))
          setLoading(false)
          return
        }

        const reader = res.body?.getReader?.()
        if (!reader) {
          setError(safeStreamError('Streaming not supported'))
          setLoading(false)
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { value, done: readDone } = await reader.read()
          if (readDone) break
          buffer += decoder.decode(value, { stream: true })
          const parsed = parseSSEChunk(buffer)
          buffer = parsed.remaining
          for (const eventStr of parsed.events) {
            if (eventStr === '[DONE]') {
              if (plainText) {
                setText((prev) => sanitizePlainText(prev))
              }
              setDone(true)
              continue
            }
            let parsedEvent = null
            try {
              parsedEvent = JSON.parse(eventStr)
            } catch {
              parsedEvent = { text: eventStr }
            }
            if (parsedEvent?.error) {
              console.warn('[ai-stream] provider error', parsedEvent)
              setError(safeStreamError(parsedEvent, parsedEvent?.code, parsedEvent?.status))
            } else if (Array.isArray(parsedEvent?.ragReferences)) {
              setRagReferences(parsedEvent.ragReferences)
            } else if (typeof parsedEvent?.text === 'string') {
              if (parsedEvent.replace) {
                setText(plainText ? sanitizePlainText(parsedEvent.text) : parsedEvent.text)
              } else {
                setText((prev) => {
                  const next = prev + parsedEvent.text
                  return plainText ? sanitizePlainText(next) : next
                })
              }
            }
          }
        }

        if (plainText) {
          setText((prev) => sanitizePlainText(prev))
        }
        setDone(true)
      } catch (e) {
        if (e?.name !== 'AbortError') {
          console.warn('[ai-stream] request failed', e)
          setError(safeStreamError(e))
        }
      } finally {
        setLoading(false)
      }
    },
    [endpoint, plainText]
  )

  const stop = useCallback(() => {
    abortRef.current?.abort?.()
    setLoading(false)
  }, [])

  return { text, loading, error, done, ragReferences, start, reset, stop }
}

export function useAIFetch(endpoint) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(
    async (payload) => {
      setLoading(true)
      setError(null)
      setData(null)
      try {
        const res = await sessionFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload || {}),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (shouldRedirectToLogin(res.status, json) && typeof window !== 'undefined') {
            window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`
            return
          }
          setError({
            error: authErrorMessage(res.status, json),
            status: res.status,
            code: json?.code,
          })
          return
        }
        setData(json)
      } catch (e) {
        console.warn('[ai-fetch] request failed', e)
        setError({ error: toUserFacingMessage(e, ERROR_MESSAGES.GENERIC) })
      } finally {
        setLoading(false)
      }
    },
    [endpoint]
  )

  return { data, loading, error, fetch: fetchData }
}
