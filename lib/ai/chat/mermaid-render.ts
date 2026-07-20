/**
 * Optional Mermaid → PNG for lesson-plan diagrams.
 *
 * DECISION POINT: uses third-party mermaid.ink (https://mermaid.ink) to render
 * diagrams. For production/privacy, prefer a self-hosted Mermaid renderer
 * (e.g. mermaid-cli in a Worker) and swap the URL below — do not assume
 * mermaid.ink remains acceptable long-term.
 *
 * On failure/timeout: return null so the .docx still generates without the image.
 */

import { logger } from '@/lib/utils/logger'

const log = logger({ route: 'AI:mermaid-render' })

const DEFAULT_TIMEOUT_MS = 8_000

function toBase64Url(text: string): string {
  const b64 = Buffer.from(String(text || ''), 'utf8').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

/**
 * @returns PNG buffer, or null if render failed / timed out / empty input
 */
export async function renderMermaidToPng(
  mermaidSource: string | null | undefined,
  options?: { timeoutMs?: number }
): Promise<Buffer | null> {
  const source = String(mermaidSource || '').trim()
  if (!source) return null

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const encoded = toBase64Url(source)
  // Third-party dependency — see file header decision point.
  const url = `https://mermaid.ink/img/${encoded}?type=png`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'image/png,image/*' },
    })
    if (!res.ok) {
      log.warn('mermaid.ink render failed', { status: res.status })
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 32) {
      log.warn('mermaid.ink returned tiny payload — skipping diagram')
      return null
    }
    return buf
  } catch (err) {
    log.warn('mermaid.ink render error/timeout — generating doc without diagram', {
      message: err instanceof Error ? err.message : String(err),
    })
    return null
  } finally {
    clearTimeout(timer)
  }
}
