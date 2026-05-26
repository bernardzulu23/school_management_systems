import { useCallback, useRef, useState } from 'react'

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

export function useAIStream(endpoint) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const abortRef = useRef(null)

  const reset = useCallback(() => {
    setText('')
    setError(null)
    setDone(false)
    setLoading(false)
  }, [])

  const start = useCallback(
    async (payload) => {
      abortRef.current?.abort?.()
      const ac = new AbortController()
      abortRef.current = ac
      setText('')
      setError(null)
      setDone(false)
      setLoading(true)

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload || {}),
          signal: ac.signal,
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          setError({
            error: json?.error || json?.message || 'Request failed',
            code: json?.code,
            status: res.status,
          })
          setLoading(false)
          return
        }

        const reader = res.body?.getReader?.()
        if (!reader) {
          setError({ error: 'Streaming not supported' })
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
              setError(parsedEvent)
            } else if (typeof parsedEvent?.text === 'string') {
              setText((prev) => prev + parsedEvent.text)
            }
          }
        }

        setDone(true)
      } catch (e) {
        if (e?.name !== 'AbortError') setError({ error: e?.message || 'Request failed' })
      } finally {
        setLoading(false)
      }
    },
    [endpoint]
  )

  const stop = useCallback(() => {
    abortRef.current?.abort?.()
    setLoading(false)
  }, [])

  return { text, loading, error, done, start, reset, stop }
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
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload || {}),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(json || { error: json?.error || 'Request failed', status: res.status })
          return
        }
        setData(json)
      } catch (e) {
        setError({ error: e?.message || 'Request failed' })
      } finally {
        setLoading(false)
      }
    },
    [endpoint]
  )

  return { data, loading, error, fetch: fetchData }
}
