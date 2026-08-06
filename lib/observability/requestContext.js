/**
 * Per-request observability context (AsyncLocalStorage).
 * Carries requestId + optional schoolId/userId — never full PII.
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

/** @typedef {{
 *   requestId: string
 *   route?: string
 *   method?: string
 *   schoolId?: string | null
 *   userId?: string | null
 *   startedAt: number
 * }} RequestObsStore */

const requestAls = new AsyncLocalStorage()

const REQUEST_ID_HEADER = 'x-request-id'

/**
 * @param {Request | { headers?: Headers }} request
 * @returns {string}
 */
export function resolveRequestId(request) {
  try {
    const incoming = request?.headers?.get?.(REQUEST_ID_HEADER)
    const trimmed = String(incoming || '').trim()
    if (trimmed && /^[a-zA-Z0-9_-]{8,128}$/.test(trimmed)) return trimmed
  } catch {
    // ignore
  }
  return randomUUID()
}

/** @returns {RequestObsStore | undefined} */
export function getRequestContext() {
  return requestAls.getStore()
}

/**
 * @template T
 * @param {RequestObsStore} store
 * @param {() => T | Promise<T>} fn
 */
export async function runWithRequestContext(store, fn) {
  return requestAls.run(store, fn)
}

/**
 * Bind tenant/user after auth (IDs only).
 * @param {{ schoolId?: string | null, userId?: string | null, route?: string }} patch
 */
export function bindRequestIdentity(patch = {}) {
  const store = requestAls.getStore()
  if (!store) return
  if (patch.schoolId != null && patch.schoolId !== '') {
    store.schoolId = String(patch.schoolId)
  }
  if (patch.userId != null && patch.userId !== '') {
    store.userId = String(patch.userId)
  }
  if (patch.route) store.route = String(patch.route)
}

/**
 * Attach x-request-id on the response (and echo client-supplied ids).
 * @param {Response} response
 * @param {string} [requestId]
 */
export function attachRequestIdHeader(response, requestId) {
  if (!(response instanceof Response)) return response
  const id = requestId || getRequestContext()?.requestId
  if (id && !response.headers.get(REQUEST_ID_HEADER)) {
    response.headers.set(REQUEST_ID_HEADER, id)
  }
  return response
}

export { REQUEST_ID_HEADER }
