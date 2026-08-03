/**
 * Network / offline helpers for sync + AI gates.
 */

export function isBrowserOnline() {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isNetworkFailure(err) {
  if (!err) return false
  const name = String(err.name || '')
  const msg = String(err.message || err).toLowerCase()
  return (
    name === 'TypeError' ||
    name === 'AbortError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('load failed') ||
    msg.includes('timed out') ||
    msg.includes('timeout')
  )
}

/**
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number }} [options]
 */
export async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = 20000, ...init } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (e) {
    if (e?.name === 'AbortError') {
      const err = new Error('Request timed out')
      err.name = 'AbortError'
      throw err
    }
    throw e
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Thrown / returned when AI is used offline. */
export const AI_OFFLINE_MESSAGE =
  'AI features need an internet connection. Your other work is still saved on this device and will sync when you are back online.'

export function assertOnlineForAi() {
  if (!isBrowserOnline()) {
    const err = new Error(AI_OFFLINE_MESSAGE)
    err.code = 'AI_OFFLINE'
    throw err
  }
}
