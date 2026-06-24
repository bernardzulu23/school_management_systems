import { describe, it, expect } from 'vitest'
import {
  stripMarkdownJsonFences,
  parseJsonFromAiResponse,
  extractJSONObject,
  extractJSONArray,
} from '@/lib/ai/parseJsonResponse'

describe('parseJsonResponse', () => {
  it('strips markdown json fences before parsing', () => {
    const raw = '```json\n{"paper":{"examInfo":{"subject":"Math"}}}\n```'
    const parsed = extractJSONObject(raw)
    expect(parsed?.paper).toBeTruthy()
  })

  it('parses fenced arrays', () => {
    const raw = '```\n[{"day":"monday"}]\n```'
    expect(extractJSONArray(raw)).toEqual([{ day: 'monday' }])
  })

  it('falls back to object slice when prose wraps JSON', () => {
    const raw = 'Here is the paper:\n{"ok":true}\nThanks.'
    expect(parseJsonFromAiResponse(raw)).toEqual({ ok: true })
  })

  it('stripMarkdownJsonFences removes generic fences', () => {
    expect(stripMarkdownJsonFences('```json\n{}\n```')).toBe('{}')
  })
})
