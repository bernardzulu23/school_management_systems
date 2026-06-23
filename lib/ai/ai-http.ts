/** Resilient fetch for external AI APIs (retries transient network failures). */

const DEFAULT_TIMEOUT_MS = 90_000
const DEFAULT_RETRIES = 2

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableNetworkError(error: unknown): boolean {
  const msg = String(
    error instanceof Error
      ? error.message +
          (error.cause ? ` ${String((error.cause as Error)?.message || error.cause)}` : '')
      : error
  ).toLowerCase()
  return (
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('socket') ||
    msg.includes('network') ||
    msg.includes('abort') ||
    msg.includes('timed out')
  )
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
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      })
      clearTimeout(timer)
      return response
    } catch (error) {
      clearTimeout(timer)
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < retries && isRetryableNetworkError(lastError)) {
        await sleep(800 * (attempt + 1))
        continue
      }
      throw lastError
    }
  }

  throw lastError || new Error('fetch failed')
}
