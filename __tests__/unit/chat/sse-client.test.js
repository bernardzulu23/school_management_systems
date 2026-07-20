import { describe, it, expect, vi } from 'vitest'
import {
  EMPTY_CHAT_REPLY_MESSAGE,
  parseChatSseChunk,
  readChatSseStream,
} from '@/lib/ai/chat/sse-client'

function makeStreamResponse(chunks) {
  const encoder = new TextEncoder()
  let i = 0
  const stream = new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(chunks[i++]))
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

describe('parseChatSseChunk', () => {
  it('splits framed data events and keeps incomplete trailing buffer', () => {
    const { events, remaining } = parseChatSseChunk(
      'data: {"meta":true,"sessionId":"s1"}\n\ndata: {"text":"Hel"}\n\ndata: {"text":"lo'
    )
    expect(events).toEqual(['{"meta":true,"sessionId":"s1"}', '{"text":"Hel"}'])
    expect(remaining).toBe('data: {"text":"lo')
  })

  it('handles CRLF and multi-line data fields', () => {
    const { events } = parseChatSseChunk('data: {"text":"a"}\r\n\r\ndata: {"text":"b"}\r\n\r\n')
    expect(events).toEqual(['{"text":"a"}', '{"text":"b"}'])
  })

  it('ignores non-data lines inside a frame', () => {
    const { events } = parseChatSseChunk(': keepalive\ndata: {"text":"ok"}\n\n')
    expect(events).toEqual(['{"text":"ok"}'])
  })
})

describe('readChatSseStream', () => {
  it('accumulates text chunks and applies replace:true', async () => {
    const res = makeStreamResponse([
      'data: {"sessionId":"abc","meta":true}\n\n',
      'data: {"text":"Hi "}\n\n',
      'data: {"text":"there"}\n\n',
      'data: {"text":"FULL","replace":true}\n\n',
      'data: [DONE]\n\n',
    ])
    const metas = []
    const chunks = []
    const result = await readChatSseStream(res, {
      onMeta: (m) => metas.push(m),
      onChunk: (t, replace) => chunks.push({ t, replace }),
    })
    expect(metas[0]?.sessionId).toBe('abc')
    expect(result.text).toBe('FULL')
    expect(result.error).toBeNull()
    expect(chunks.some((c) => c.replace)).toBe(true)
  })

  it('surfaces SSE error events instead of leaving empty text', async () => {
    const res = makeStreamResponse([
      'data: {"meta":true,"sessionId":"s"}\n\n',
      'data: {"error":"All AI providers failed"}\n\n',
      'data: [DONE]\n\n',
    ])
    const result = await readChatSseStream(res)
    expect(result.text).toBe('')
    expect(result.error).toBe('All AI providers failed')
  })

  it('returns empty text when stream ends with meta+[DONE] and no chunks', async () => {
    const res = makeStreamResponse([
      'data: {"sessionId":"s","meta":true}\n\n',
      'data: {"generatedBy":"groq","model":"x"}\n\n',
      'data: [DONE]\n\n',
    ])
    const result = await readChatSseStream(res)
    expect(result.text).toBe('')
    expect(result.error).toBeNull()
    expect(EMPTY_CHAT_REPLY_MESSAGE).toMatch(/did not return a reply/i)
  })

  it('flushes a trailing error frame when stream closes without [DONE]', async () => {
    const res = makeStreamResponse([
      'data: {"meta":true}\n\n',
      'data: {"error":"AI request failed"}',
    ])
    const result = await readChatSseStream(res)
    expect(result.error).toBe('AI request failed')
    expect(result.text).toBe('')
  })

  it('matches send-message handoff SSE shape (meta + text + DONE)', async () => {
    const reply = 'I am looping in an administrator to assist you further. Please hold on.'
    const res = makeStreamResponse([
      `data: ${JSON.stringify({ sessionId: 'sid', status: 'PENDING_HUMAN', meta: true })}\n\n`,
      `data: ${JSON.stringify({ text: reply })}\n\n`,
      'data: [DONE]\n\n',
    ])
    const statuses = []
    const result = await readChatSseStream(res, {
      onMeta: (m) => {
        if (m.status) statuses.push(m.status)
      },
    })
    expect(statuses).toEqual(['PENDING_HUMAN'])
    expect(result.text).toBe(reply)
    expect(result.error).toBeNull()
  })

  it('throws when response has no body', async () => {
    const res = new Response(null, { status: 200 })
    vi.spyOn(res, 'body', 'get').mockReturnValue(null)
    await expect(readChatSseStream(res)).rejects.toThrow(/No response body/)
  })
})
