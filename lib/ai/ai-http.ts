/** Resilient fetch for external AI APIs (retries transient network failures). */

const DEFAULT_TIMEOUT_MS = 90_000
const DEFAULT_RETRIES = 3

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Unwrap Node/undici `TypeError: fetch failed` into a useful message (cause code). */
export function formatNetworkError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const parts = [error.message]
  let cause: unknown = error.cause
  let depth = 0
  while (cause && depth < 4) {
    if (cause instanceof Error) {
      const code =
        typeof (cause as NodeJS.ErrnoException).code === 'string'
          ? (cause as NodeJS.ErrnoException).code
          : undefined
      parts.push(code ? `${cause.message} (${code})` : cause.message)
      cause = cause.cause
    } else {
      parts.push(String(cause))
      break
    }
    depth += 1
  }
  return parts.filter(Boolean).join(' | ')
}

function isRetryableNetworkError(error: unknown): boolean {
  const msg = formatNetworkError(error).toLowerCase()
  return (
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('eai_again') ||
    msg.includes('socket') ||
    msg.includes('network') ||
    msg.includes('abort') ||
    msg.includes('timed out') ||
    msg.includes('connect timeout') ||
    msg.includes('und_err_') ||
    msg.includes('other side closed')
  )
}

function mergeHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init)
  // Mitigate Undici keep-alive race on Vercel serverless (UND_ERR_CONNECT_TIMEOUT).
  if (!headers.has('connection')) {
    headers.set('Connection', 'close')
  }
  return headers
}

export async function aiHttpFetch(
  url: string,
  init: RequestInit = {},
  options: { timeoutMs?: number; retries?: number } = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const retries = options.retries ?? DEFAULT_RETRIES
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const onCallerAbort = () => controller.abort()
    if (init.signal) {
      if (init.signal.aborted) controller.abort()
      else init.signal.addEventListener('abort', onCallerAbort, { once: true })
    }
    try {
      const response = await fetch(url, {
        ...init,
        headers: mergeHeaders(init.headers),
        signal: controller.signal,
      })
      clearTimeout(timer)
      init.signal?.removeEventListener('abort', onCallerAbort)
      return response
    } catch (error) {
      clearTimeout(timer)
      init.signal?.removeEventListener('abort', onCallerAbort)
      const wrapped = new Error(formatNetworkError(error))
      if (error instanceof Error && error.cause) wrapped.cause = error.cause
      lastError = wrapped
      if (attempt < retries && isRetryableNetworkError(error)) {
        await sleep(600 * (attempt + 1) + Math.floor(Math.random() * 400))
        continue
      }
      throw lastError
    }
  }

  throw lastError || new Error('fetch failed')
}
