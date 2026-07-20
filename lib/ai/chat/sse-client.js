/**
 * Browser/client SSE parser for staff chat (`/api/chat/send-message`).
 * Contract:
 *   data: {"sessionId":"...","meta":true}
 *   data: {"text":"<chunk>"} | {"text":"...","replace":true}
 *   data: {"error":"..."}
 *   data: [DONE]
 */

export const EMPTY_CHAT_REPLY_MESSAGE =
  'The AI assistant did not return a reply. Please try again in a moment.'

/**
 * Parse one or more SSE frames from a buffer.
 * @param {string} buffer
 * @returns {{ events: string[], remaining: string }}
 */
export function parseChatSseChunk(buffer) {
  // Normalize CRLF so frame boundaries (`\n\n`) match browser/Node SSE wires.
  const normalized = String(buffer || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
  const parts = normalized.split('\n\n')
  const remaining = parts.pop() || ''
  const events = parts
    .map((part) =>
      part
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n')
    )
    .filter((payload) => payload.length > 0)
  return { events, remaining }
}

/**
 * @param {Response} res
 * @param {{
 *   onChunk?: (text: string, replace: boolean) => void,
 *   onMeta?: (json: Record<string, unknown>) => void,
 * }} [handlers]
 * @returns {Promise<{ text: string, error: string | null }>}
 */
export async function readChatSseStream(res, handlers = {}) {
  const { onChunk, onMeta } = handlers
  const reader = res.body?.getReader?.()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  let acc = ''
  let streamError = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parsed = parseChatSseChunk(buffer)
    buffer = parsed.remaining

    for (const eventStr of parsed.events) {
      if (eventStr === '[DONE]') {
        return { text: acc, error: streamError }
      }

      let json = null
      try {
        json = JSON.parse(eventStr)
      } catch {
        // Non-JSON data line — ignore (comments / keepalives)
        continue
      }

      if (json && typeof json === 'object') {
        if (typeof json.error === 'string' && json.error.trim()) {
          streamError = json.error.trim()
          continue
        }
        if (json.meta && typeof onMeta === 'function') {
          onMeta(json)
        }
        if (typeof json.text === 'string') {
          const replace = Boolean(json.replace)
          acc = replace ? json.text : acc + json.text
          if (typeof onChunk === 'function') onChunk(json.text, replace)
        }
      }
    }
  }

  // Flush trailing frame without trailing blank line
  if (buffer.trim()) {
    const { events } = parseChatSseChunk(buffer + '\n\n')
    for (const eventStr of events) {
      if (eventStr === '[DONE]') break
      try {
        const json = JSON.parse(eventStr)
        if (typeof json?.error === 'string' && json.error.trim()) {
          streamError = json.error.trim()
        } else if (typeof json?.text === 'string') {
          const replace = Boolean(json.replace)
          acc = replace ? json.text : acc + json.text
          if (typeof onChunk === 'function') onChunk(json.text, replace)
        } else if (json?.meta && typeof onMeta === 'function') {
          onMeta(json)
        }
      } catch {
        // ignore
      }
    }
  }

  return { text: acc, error: streamError }
}
